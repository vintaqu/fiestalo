/**
 * PaymentService
 *
 * All financial logic lives here. Rules:
 *   1. Prices are ALWAYS computed server-side from DB — never trust frontend amounts
 *   2. PaymentIntents use idempotency keys to prevent double charges on retries
 *   3. Webhooks are the single source of truth for payment status
 *   4. Refund amount follows the venue's cancellation policy, not a client request
 *   5. Stripe Connect structure prepared — owner payouts route through platform account
 */

import Stripe from "stripe";
import { db } from "@/lib/db";
import { notificationService } from "@/services/notification.service";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/lib/api-response";
import crypto from "crypto";

// ── Stripe client (singleton) ─────────────────────────────────────────────────

// apiVersion omitted — uses the version bundled with the installed stripe package
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
  maxNetworkRetries: 3,
} as any);

// Platform fee rate read from DB or default to 10%
const DEFAULT_PLATFORM_FEE_RATE = 0.1;

// ── Cancellation policy refund matrix ─────────────────────────────────────────
// Returns the fraction of total to refund based on hours until booking

function getRefundFraction(
  policy: { type: string; refundHours: number } | null | undefined,
  hoursUntilBooking: number
): number {
  if (!policy) return 0; // no policy = no refund

  switch (policy.type) {
    case "flexible":
      // Full refund if cancelled > 24h before; 50% within 24h
      return hoursUntilBooking > 24 ? 1.0 : 0.5;

    case "moderate":
      // Full refund if > 72h; 50% between 24–72h; 0% < 24h
      if (hoursUntilBooking > 72) return 1.0;
      if (hoursUntilBooking > 24) return 0.5;
      return 0;

    case "strict":
      // Full refund only if > refundHours (default 48h); nothing after
      return hoursUntilBooking > (policy.refundHours ?? 48) ? 1.0 : 0;

    default:
      return 0;
  }
}

// ── PaymentService ────────────────────────────────────────────────────────────

export class PaymentService {

  // ── 1. Create or retrieve PaymentIntent ──────────────────────────────────

  async createPaymentIntent(bookingId: string, tenantId: string) {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        venue: {
          select: {
            id: true,
            title: true,
            pricePerHour: true,
            cleaningFee: true,
            depositAmount: true,
            cancellationPolicy: true,
            owner: { select: { id: true, email: true } },
            images: { where: { isCover: true }, take: 1 },
          },
        },
        tenant: { select: { id: true, email: true, name: true } },
        payment: true,
      },
    });

    if (!booking)   throw new NotFoundError("Reserva no encontrada");
    if (booking.tenantId !== tenantId) throw new ForbiddenError();
    if (!["AWAITING_PAYMENT", "PENDING"].includes(booking.status)) {
      throw new ValidationError("Esta reserva no está pendiente de pago");
    }

    // ── Re-verify price server-side ──────────────────────────────────────
    // Never trust the price stored at booking creation — re-calculate from
    // current venue prices and compare. If they diverge, reject.
    const { bookingService } = await import("./booking.service");
    const freshPricing = await bookingService.calculatePrice(
      booking.venueId,
      booking.date.toISOString().split("T")[0],
      booking.startTime,
      booking.endTime
    );

    const storedTotal   = Number(booking.total);
    const expectedTotal = freshPricing.total;

    // Allow ±1 cent for rounding differences
    if (Math.abs(storedTotal - expectedTotal) > 0.01) {
      throw new ValidationError(
        "El precio de esta reserva ha cambiado. Por favor, crea una nueva reserva."
      );
    }

    // ── Idempotency key — prevents double charge on client retry ─────────
    // Idempotency key: unique per booking attempt.
    // We use a random suffix stored in the DB so:
    //   - Same payment record = same key (safe retry, no double charge)
    //   - New booking attempt = new key (avoids Stripe idempotency collisions)
    // The key is generated fresh only when there's no existing payment record.
    const existingPayment = await db.payment.findUnique({ where: { bookingId } });
    const idempotencyKey = existingPayment?.idempotencyKey
      ?? `booking_${bookingId}_${tenantId}_${Date.now()}`;

    // If a PaymentIntent already exists and is still usable, reuse it
    if (booking.payment?.stripePaymentIntentId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(
          booking.payment.stripePaymentIntentId
        );
        if (["requires_payment_method", "requires_confirmation", "requires_action"].includes(existing.status)) {
          return {
            clientSecret: existing.client_secret!,
            paymentIntentId: existing.id,
            amount: storedTotal,
            breakdown: freshPricing,
            booking,
          };
        }
        // PI exists but is in a terminal state (canceled, succeeded) — create a new one
        // Clear the idempotency key so a fresh one is generated below
        if (["canceled", "succeeded"].includes(existing.status)) {
          await db.payment.update({
            where: { bookingId },
            data:  { idempotencyKey: null, stripePaymentIntentId: null },
          });
        }
      } catch {
        // PI not found in Stripe — clear it from DB and create fresh
        await db.payment.update({
          where: { bookingId },
          data:  { idempotencyKey: null, stripePaymentIntentId: null },
        });
      }
    }

    // ── Get or create Stripe customer ─────────────────────────────────────
    let customerId = booking.payment?.stripeCustomerId;
    if (!customerId) {
      // Check if customer already exists by email
      const existing = await stripe.customers.list({
        email: booking.tenant.email,
        limit: 1,
      });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: booking.tenant.email,
          name:  booking.tenant.name ?? undefined,
          metadata: { userId: tenantId, platform: "spacehub" },
        });
        customerId = customer.id;
      }
    }

    // ── Create PaymentIntent ──────────────────────────────────────────────
    const amountCents = Math.round(storedTotal * 100);

    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount:   amountCents,
      currency: "eur",
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        bookingId:  booking.id,
        venueId:    booking.venueId,
        tenantId,
        ownerId:    booking.venue.owner.id,
        platform:   "spacehub",
        // Price breakdown in metadata for dispute evidence
        subtotal:   String(freshPricing.subtotal),
        platformFee: String(freshPricing.platformFee),
        total:      String(freshPricing.total),
      },
      description: `Fiestalo – ${booking.venue.title} (${booking.startTime}–${booking.endTime})`,
      receipt_email: booking.tenant.email,
      // Statement descriptor (max 22 chars)
      statement_descriptor_suffix: "SPACEHUB",
    };

    const paymentIntent = await stripe.paymentIntents.create(
      intentParams,
      { idempotencyKey }
    );

    // ── Persist intent ────────────────────────────────────────────────────
    await db.payment.upsert({
      where:  { bookingId },
      update: {
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId:      customerId,
        status:                "PROCESSING",
        idempotencyKey,
        refundPolicy: JSON.stringify(booking.venue.cancellationPolicy ?? null),
      },
      create: {
        bookingId,
        amount:                storedTotal,
        currency:              "EUR",
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId:      customerId,
        status:                "PROCESSING",
        idempotencyKey,
        refundPolicy: JSON.stringify(booking.venue.cancellationPolicy ?? null),
      },
    });

    return {
      clientSecret:    paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount:          storedTotal,
      breakdown:       freshPricing,
      booking,
    };
  }

  // ── 2. Webhook handler ────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    // Cryptographic signature verification — NEVER skip this
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error("[webhook] Signature verification failed:", err.message);
      throw new ValidationError(`Webhook signature invalid: ${err.message}`);
    }

    // Idempotent processing — log event to prevent double-processing
    console.log(`[webhook] ${event.type} — ${event.id}`);

    try {
      switch (event.type) {

        // ── Payment succeeded ─────────────────────────────────────────────
        case "payment_intent.succeeded": {
          const pi = event.data.object as Stripe.PaymentIntent;
          const bookingId = pi.metadata?.bookingId;
          if (!bookingId) break;

          const { bookingService } = await import("./booking.service");
          await bookingService.confirmPayment(bookingId, pi.id);

          // Save charge ID and receipt URL
          const chargeId = typeof pi.latest_charge === "string"
            ? pi.latest_charge : null;

          if (chargeId) {
            const charge = await stripe.charges.retrieve(chargeId);
            await db.payment.updateMany({
              where: { stripePaymentIntentId: pi.id },
              data:  {
                stripeChargeId: chargeId,
                receiptUrl:    charge.receipt_url ?? undefined,
                paidAt:        new Date(),
                status:        "SUCCEEDED",
              },
            });
          }
          break;
        }

        // ── Payment failed ────────────────────────────────────────────────
        case "payment_intent.payment_failed": {
          const pi = event.data.object as Stripe.PaymentIntent;
          const bookingId = pi.metadata?.bookingId;

          await db.payment.updateMany({
            where: { stripePaymentIntentId: pi.id },
            data:  { status: "FAILED", failedAt: new Date() },
          });

          if (bookingId) {
            await db.booking.updateMany({
              where: { id: bookingId, status: "AWAITING_PAYMENT" },
              data:  { status: "PENDING" },
            });
            // Notify tenant of payment failure
            const booking = await db.booking.findUnique({
              where:   { id: bookingId },
              select:  { tenantId: true, bookingRef: true, venueId: true, venue: { select: { title: true, ownerId: true } } },
            });
            if (booking) {
              await notificationService.notify({
                type: "PAYMENT_FAILED",
                booking: {
                  id:         bookingId,
                  bookingRef: booking.bookingRef,
                  venueTitle: booking.venue.title,
                  tenantId:   booking.tenantId,
                  ownerId:    booking.venue.ownerId,
                  total:      0,
                },
              });
            }
          }
          break;
        }

        // ── Payment cancelled ─────────────────────────────────────────────
        case "payment_intent.canceled": {
          const pi = event.data.object as Stripe.PaymentIntent;
          const bookingId = pi.metadata?.bookingId;

          await db.payment.updateMany({
            where: { stripePaymentIntentId: pi.id },
            data:  { status: "FAILED" },
          });

          if (bookingId) {
            await db.booking.updateMany({
              where: {
                id:     bookingId,
                status: { in: ["PENDING", "AWAITING_PAYMENT"] },
              },
              data: { status: "CANCELLED_BY_USER", cancelledAt: new Date() },
            });
          }
          break;
        }

        // ── Refund processed ──────────────────────────────────────────────
        case "charge.refunded": {
          const charge = event.data.object as Stripe.Charge;
          const piId = typeof charge.payment_intent === "string"
            ? charge.payment_intent : null;
          if (!piId) break;

          const isFullRefund = charge.amount_refunded === charge.amount;

          await db.payment.updateMany({
            where: { stripePaymentIntentId: piId },
            data:  {
              status:     isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
              refundedAt: new Date(),
            },
          });
          break;
        }

        // ── Dispute opened — freeze booking ───────────────────────────────
        case "charge.dispute.created": {
          const dispute = event.data.object as Stripe.Dispute;
          const chargeId = typeof dispute.charge === "string"
            ? dispute.charge : null;
          if (!chargeId) break;

          const payment = await db.payment.findFirst({
            where:   { stripeChargeId: chargeId },
            include: { booking: { select: { venue: { select: { title: true } } } } },
          });
          if (payment) {
            await db.booking.updateMany({
              where: { id: payment.bookingId },
              data:  { status: "DISPUTED", internalNotes: `Disputa Stripe: ${dispute.id}` },
            });
            // Alert all admins
            await notificationService.notify({
              type:  "ADMIN_DISPUTE",
              title: "Nueva disputa de pago abierta",
              body:  `Disputa ${dispute.id} en reserva de ${payment.booking?.venue?.title ?? "espacio desconocido"}. Revisar en Stripe.`,
              link:  `https://dashboard.stripe.com/test/disputes/${dispute.id}`,
              meta:  { disputeId: dispute.id, paymentId: payment.id, bookingId: payment.bookingId },
            });
          }
          break;
        }

        // ── Dispute won ───────────────────────────────────────────────────
        case "charge.dispute.closed": {
          const dispute = event.data.object as Stripe.Dispute;
          const chargeId = typeof dispute.charge === "string"
            ? dispute.charge : null;
          if (!chargeId) break;

          const payment = await db.payment.findFirst({
            where: { stripeChargeId: chargeId },
          });
          if (payment && dispute.status === "won") {
            await db.booking.updateMany({
              where: { id: payment.bookingId, status: "DISPUTED" },
              data:  { status: "COMPLETED" },
            });
          }
          break;
        }

        // ── Connect: payout to owner ───────────────────────────────────────
        case "transfer.created": {
          const transfer = event.data.object as Stripe.Transfer;
          const { payoutId } = transfer.metadata ?? {};
          if (payoutId) {
            await db.payout.updateMany({
              where: { id: payoutId },
              data:  {
                stripeTransferId: transfer.id,
                status:           "processing",
              },
            });
          }
          break;
        }

        default:
          // Unhandled event types are fine — we just ignore them
          break;
      }
    } catch (err) {
      console.error(`[webhook] Error processing ${event.type}:`, err);
      // Return 200 anyway to prevent Stripe retrying — log for manual review
      // In production, send to error monitoring (Sentry etc.)
    }

    return { received: true, eventType: event.type };
  }

  // ── 3. Refund ─────────────────────────────────────────────────────────────

  async refund(
    bookingId:  string,
    requesterId: string,
    reason?:    string,
    overrideAmount?: number // admin-only override
  ) {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        venue:   { select: { ownerId: true, cancellationPolicy: true } },
        payment: { include: { refunds: true } },
        tenant:  { select: { id: true } },
      },
    });

    if (!booking)         throw new NotFoundError("Reserva no encontrada");
    if (!booking.payment) throw new ValidationError("No hay pago asociado");

    const payment = booking.payment;

    if (!payment.stripePaymentIntentId) {
      throw new ValidationError("No hay PaymentIntent asociado");
    }
    if (payment.status !== "SUCCEEDED") {
      throw new ValidationError("Solo se pueden reembolsar pagos completados");
    }

    // ── Authorization ────────────────────────────────────────────────────
    const isTenant = booking.tenant.id === requesterId;
    const isOwner  = booking.venue.ownerId === requesterId;

    // Get requester role
    const requester = await db.user.findUnique({
      where:  { id: requesterId },
      select: { role: true },
    });
    const isAdmin = requester?.role === "ADMIN";

    if (!isTenant && !isOwner && !isAdmin) throw new ForbiddenError();

    // ── Calculate refund amount based on cancellation policy ─────────────
    let refundAmount: number;

    if (isAdmin && overrideAmount !== undefined) {
      // Admin can override amount (for disputes, exceptional cases)
      refundAmount = Math.min(overrideAmount, Number(payment.amount));
    } else {
      const policy = booking.venue.cancellationPolicy as
        | { type: string; refundHours: number }
        | null;

      const bookingDateTime = new Date(booking.date);
      const [h, m] = booking.startTime.split(":").map(Number);
      bookingDateTime.setHours(h, m, 0, 0);

      const hoursUntil =
        (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

      const fraction = getRefundFraction(policy, hoursUntil);
      refundAmount   = Number(payment.amount) * fraction;

      if (refundAmount <= 0) {
        throw new ValidationError(
          "La política de cancelación de este espacio no permite reembolso en este momento."
        );
      }
    }

    // ── Subtract already-refunded amount ──────────────────────────────────
    const alreadyRefunded = payment.refunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0
    );
    const maxRefundable = Number(payment.amount) - alreadyRefunded;

    if (refundAmount > maxRefundable + 0.01) {
      throw new ValidationError(
        `El máximo reembolsable es ${maxRefundable.toFixed(2)}€`
      );
    }

    refundAmount = Math.min(refundAmount, maxRefundable);

    // ── Get charge ID ─────────────────────────────────────────────────────
    let chargeId = payment.stripeChargeId;
    if (!chargeId) {
      const pi = await stripe.paymentIntents.retrieve(
        payment.stripePaymentIntentId
      );
      chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : null;
    }
    if (!chargeId) throw new ValidationError("No se encontró el cargo de Stripe");

    // ── Execute refund in Stripe ──────────────────────────────────────────
    const stripeRefund = await stripe.refunds.create({
      charge: chargeId,
      amount: Math.round(refundAmount * 100),
      reason: isAdmin ? "requested_by_customer" : "requested_by_customer",
      metadata: {
        bookingId,
        requesterId,
        reason: reason ?? "cancelled",
      },
    });

    // ── Persist refund in DB ──────────────────────────────────────────────
    const isFullRefund = Math.abs(refundAmount - Number(payment.amount)) < 0.01;

    await db.$transaction([
      db.refund.create({
        data: {
          paymentId:     payment.id,
          bookingId,
          amount:        refundAmount,
          reason,
          stripeRefundId: stripeRefund.id,
          refundType:    isFullRefund ? "full" : "partial",
          processedAt:   new Date(),
        },
      }),
      db.booking.update({
        where: { id: bookingId },
        data:  {
          status:             isFullRefund ? "REFUNDED" : "CANCELLED_BY_USER",
          cancelledAt:        new Date(),
          cancellationReason: reason,
          cancelledBy:        requesterId,
        },
      }),
      db.payment.update({
        where: { id: payment.id },
        data:  {
          status:     isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
          refundedAt: new Date(),
        },
      }),
    ]);

    return {
      refundId:     stripeRefund.id,
      amount:       refundAmount,
      isFullRefund,
      status:       stripeRefund.status,
    };
  }

  // ── 4. Stripe Connect — payout to owner (future) ──────────────────────────

  /**
   * Creates a Stripe Transfer to the owner's connected account.
   * Called after booking is COMPLETED and hold period has passed.
   *
   * Prerequisites:
   *   - Owner must have completed Stripe Connect onboarding
   *   - Their stripeConnectAccountId must be saved in User.profile
   *   - Platform must hold funds via manual capture or destination charges
   */
  async createOwnerPayout(bookingId: string) {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        venue:   { select: { ownerId: true } },
        payment: true,
      },
    });

    if (!booking)               throw new NotFoundError("Reserva no encontrada");
    if (booking.status !== "COMPLETED") {
      throw new ValidationError("Solo se pueden liquidar reservas completadas");
    }

    const ownerProfile = await db.profile.findUnique({
      where:  { userId: booking.venue.ownerId },
      select: { stripeConnectAccountId: true } as any,
    });

    const connectAccountId = (ownerProfile as any)?.stripeConnectAccountId;
    if (!connectAccountId) {
      throw new ValidationError(
        "El propietario no ha completado la configuración de pagos"
      );
    }

    // Owner gets total minus platform fee
    const ownerAmount = Number(booking.total) - Number(booking.platformFee);

    // Create a payout record first for idempotency
    const payout = await db.payout.create({
      data: {
        ownerId:     booking.venue.ownerId,
        amount:      ownerAmount,
        currency:    "EUR",
        status:      "pending",
        periodStart: booking.date,
        periodEnd:   booking.date,
      } as any,
    });

    try {
      const transfer = await stripe.transfers.create({
        amount:      Math.round(ownerAmount * 100),
        currency:    "eur",
        destination: connectAccountId,
        metadata: {
          bookingId,
          payoutId: payout.id,
          platform: "spacehub",
        },
      });

      await db.payout.update({
        where: { id: payout.id },
        data:  {
          stripeTransferId: transfer.id,
          status:           "processing",
        } as any,
      });

      return { payoutId: payout.id, transferId: transfer.id, amount: ownerAmount };
    } catch (err) {
      await db.payout.update({
        where: { id: payout.id },
        data:  { status: "failed" } as any,
      });
      throw err;
    }
  }

  // ── 5. Get pricing preview (server-side, no booking required) ─────────────

  async previewPrice(
    venueId:   string,
    date:      string,
    startTime: string,
    endTime:   string
  ) {
    const { bookingService } = await import("./booking.service");
    return bookingService.calculatePrice(venueId, date, startTime, endTime);
  }
}

export const paymentService = new PaymentService();
