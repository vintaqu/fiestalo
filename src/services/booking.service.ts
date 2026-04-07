import { db } from "@/lib/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/api-response";
import type { BookingCreateInput } from "@/lib/validations";
import { parseISO } from "date-fns";
import type { BookingStatus } from "@prisma/client";
import { notificationService } from "./notification.service";
import { emailService } from "./email.service";
import { availabilityService } from "./availability.service";

const PLATFORM_FEE_RATE = 0.1;

export class BookingService {

  // ── Price calculation ──────────────────────────────────────────

  async calculatePrice(
    venueId: string,
    date: string,
    startTime: string,
    endTime: string,
    extraIds: string[] = []
  ) {
    const venue = await db.venue.findUnique({
      where: { id: venueId },
      include: {
        extras: extraIds.length > 0 ? { where: { id: { in: extraIds } } } : false,
        seasonalPrices: {
          where: {
            startDate: { lte: parseISO(date) },
            endDate:   { gte: parseISO(date) },
          },
        },
      },
    });

    if (!venue) throw new NotFoundError("Espacio no encontrado");

    const durationHours =
      (this.timeToMinutes(endTime) - this.timeToMinutes(startTime)) / 60;

    const dayOfWeek = parseISO(date).getDay();
    const seasonal  = venue.seasonalPrices?.find(
      (sp) => sp.daysOfWeek.length === 0 || sp.daysOfWeek.includes(dayOfWeek)
    );

    const effectivePricePerHour = seasonal?.pricePerHour ?? venue.pricePerHour;
    const subtotal      = Number(effectivePricePerHour) * durationHours;
    const cleaningFee   = Number(venue.cleaningFee ?? 0);
    const extrasTotal   = Array.isArray(venue.extras)
      ? venue.extras.reduce((s, e) => s + Number(e.price), 0)
      : 0;
    const baseAmount    = subtotal + cleaningFee + extrasTotal;
    const platformFee   = baseAmount * PLATFORM_FEE_RATE;
    const total         = baseAmount + platformFee;

    return {
      pricePerHour:    Number(effectivePricePerHour),
      durationHours,
      subtotal,
      cleaningFee,
      extrasTotal,
      platformFee,
      platformFeeRate: PLATFORM_FEE_RATE,
      depositAmount:   Number(venue.depositAmount ?? 0),
      total,
      isSeasonalRate:  !!seasonal,
    };
  }

  // ── Create booking — atomic, overbooking-safe ──────────────────

  async create(data: BookingCreateInput, tenantId: string) {
    // 1. Fast pre-check outside transaction (avoids unnecessary locking)
    const preCheck = await availabilityService.check(
      data.venueId, data.date, data.startTime, data.endTime
    );
    if (!preCheck.available) {
      throw new ValidationError(preCheck.reason ?? "Franja no disponible");
    }

    // 2. Calculate pricing outside transaction (read-only)
    const pricing = await this.calculatePrice(
      data.venueId, data.date, data.startTime, data.endTime, data.extraIds
    );

    // 3. Atomic transaction: lock → re-check → create
    //    This prevents two concurrent requests from both passing the pre-check
    //    and both creating a booking for the same slot.
    const booking = await db.$transaction(async (tx) => {
      // Lock the venue row — serialises concurrent booking attempts
      await availabilityService.acquireSlotLock(tx, data.venueId, data.date);

      // Re-check inside the lock (authoritative check)
      const lockedCheck = await availabilityService.checkWithTx(
        tx, data.venueId, data.date, data.startTime, data.endTime
      );
      if (!lockedCheck.available) {
        throw new ValidationError(
          lockedCheck.reason ?? "La franja fue reservada por otro usuario"
        );
      }

      // Create booking
      const created = await tx.booking.create({
        data: {
          venueId:         data.venueId,
          tenantId,
          date:            parseISO(data.date),
          startTime:       data.startTime,
          endTime:         data.endTime,
          durationHours:   pricing.durationHours,
          guestCount:      data.guestCount,
          specialRequests: data.specialRequests,
          pricePerHour:    pricing.pricePerHour,
          subtotal:        pricing.subtotal,
          cleaningFee:     pricing.cleaningFee,
          platformFee:     pricing.platformFee,
          platformFeeRate: pricing.platformFeeRate,
          depositAmount:   pricing.depositAmount,
          total:           pricing.total,
          status:          "AWAITING_PAYMENT",
          extras:
            data.extraIds.length > 0
              ? {
                  create: data.extraIds.map((extraId) => ({
                    extraId,
                    quantity: 1,
                    price: 0,
                  })),
                }
              : undefined,
        },
        include: {
          venue: {
            select: { title: true, owner: { select: { email: true, name: true } } },
          },
          tenant: { select: { email: true, name: true } },
        },
      });

      // Create pending payment record inside the same transaction
      await tx.payment.create({
        data: {
          bookingId: created.id,
          amount:    pricing.total,
          currency:  "EUR",
          status:    "PENDING",
        },
      });

      return created;
    }, {
      // Serializable isolation ensures no phantom reads on booking table
      isolationLevel: "Serializable",
      timeout: 10_000,
    });

    // Notify owner based on booking type (async, non-blocking)
    db.venue.findUnique({
      where:  { id: data.venueId },
      select: {
        bookingType: true,
        owner: { select: { id: true, email: true, name: true } },
      },
    }).then((venue) => {
      if (!venue?.owner) return;

      const notifBase = {
        id:         booking.id,
        bookingRef: booking.bookingRef,
        date:       booking.date,
        startTime:  booking.startTime,
        endTime:    booking.endTime,
        tenantId:   booking.tenant.id,
        tenantName: booking.tenant.name,
        venueId:    booking.venueId,
        venueTitle: booking.venue.title,
        ownerId:    venue.owner.id,
        ownerName:  venue.owner.name,
      };

      if (venue.bookingType === "REQUEST") {
        // REQUEST: notify owner to accept/reject
        notificationService.notify({ type: "BOOKING_REQUEST", booking: notifBase }).catch(() => {});
        emailService.sendBookingRequest({
          owner:           venue.owner,
          tenant:          booking.tenant,
          venue:           booking.venue,
          date:            booking.date,
          startTime:       booking.startTime,
          endTime:         booking.endTime,
          durationHours:   booking.durationHours,
          guestCount:      booking.guestCount,
          total:           booking.total,
          specialRequests: booking.specialRequests,
          id:              booking.id,
        });
      } else {
        // INSTANT: notify owner of new booking
        notificationService.notify({ type: "BOOKING_NEW", booking: notifBase }).catch(() => {});
      }
    }).catch(() => {});

    return booking;
  }

  // ── Confirm after payment ──────────────────────────────────────

  async confirmPayment(bookingId: string, stripePaymentIntentId: string) {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        venue: {
          select: {
            title: true,
            address: true,
            city: true,
            owner: { select: { id: true, email: true, name: true } },
          },
        },
        tenant: { select: { id: true, email: true, name: true } },
        payment: { select: { status: true, receiptUrl: true } },
      },
    });

    if (!booking) throw new NotFoundError("Reserva no encontrada");

    await db.$transaction([
      db.booking.update({
        where: { id: bookingId },
        data:  { status: "CONFIRMED", confirmedAt: new Date() },
      }),
      db.payment.update({
        where: { bookingId },
        data:  {
          status:                 "SUCCEEDED",
          stripePaymentIntentId,
          paidAt:                 new Date(),
        },
      }),
      db.venue.update({
        where: { id: booking.venueId },
        data:  { totalBookings: { increment: 1 } },
      }),
    ]);

    // Notify tenant: confirmed
    await notificationService.notify({
      type: "BOOKING_CONFIRMED",
      booking: {
        id:         bookingId,
        bookingRef: booking.bookingRef,
        date:       booking.date,
        startTime:  booking.startTime,
        endTime:    booking.endTime,
        tenantId:   booking.tenant.id,
        tenantName: booking.tenant.name,
        venueId:    booking.venueId,
        venueTitle: booking.venue.title,
        ownerId:    booking.venue.owner.id,
        ownerName:  booking.venue.owner.name,
      },
    });
    // Notify owner: payment received
    await notificationService.notify({
      type: "PAYMENT_RECEIVED",
      booking: {
        id:         bookingId,
        bookingRef: booking.bookingRef,
        venueTitle: booking.venue.title,
        tenantId:   booking.tenant.id,
        ownerId:    booking.venue.owner.id,
        total:      Number(booking.total),
      },
    });

    await emailService.sendBookingConfirmation(booking);

    return booking;
  }

  // ── Cancel booking ─────────────────────────────────────────────

  async cancel(bookingId: string, userId: string, reason?: string) {
    const booking = await db.booking.findUnique({
      where:   { id: bookingId },
      include: { venue: { select: { ownerId: true } }, payment: true },
    });

    if (!booking) throw new NotFoundError();

    const isOwner  = booking.venue.ownerId === userId;
    const isTenant = booking.tenantId === userId;

    if (!isOwner && !isTenant) throw new ForbiddenError();
    if (!["PENDING", "AWAITING_PAYMENT", "CONFIRMED"].includes(booking.status)) {
      throw new ValidationError("Esta reserva no puede cancelarse");
    }

    const status: BookingStatus = isOwner
      ? "CANCELLED_BY_OWNER"
      : "CANCELLED_BY_USER";

    await db.booking.update({
      where: { id: bookingId },
      data:  {
        status,
        cancelledAt:        new Date(),
        cancellationReason: reason,
        cancelledBy:        userId,
      },
    });

    // Trigger post-cancellation recalculation (async, non-blocking)
    availabilityService.onBookingCancelled(bookingId).catch(() => {});

    // Send cancellation email (async, non-blocking)
    db.booking.findUnique({
      where: { id: bookingId },
      include: {
        tenant: { select: { email: true, name: true } },
        venue:  { select: { title: true } },
      },
    }).then((b) => {
      if (b) {
        emailService.sendBookingCancellation({
          recipientEmail: b.tenant.email,
          recipientName:  b.tenant.name ?? "Cliente",
          venue:          b.venue,
          date:           b.date,
          startTime:      b.startTime,
          endTime:        b.endTime,
          cancelledBy:    isOwner ? "owner" : "user",
          cancellationReason: reason,
        });
      }
    }).catch(() => {});

    return { bookingId, status };
  }

  // ── Read queries ───────────────────────────────────────────────

  async getTenantBookings(tenantId: string, status?: BookingStatus) {
    return db.booking.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: {
        venue: {
          select: {
            id: true, title: true, slug: true, city: true,
            images: { where: { isCover: true }, take: 1 },
          },
        },
        payment: { select: { status: true, receiptUrl: true } },
        review:  { select: { id: true, rating: true } },
      },
      orderBy: { date: "desc" },
    });
  }

  async getOwnerBookings(ownerId: string, venueId?: string) {
    return db.booking.findMany({
      where: {
        venue: { ownerId },
        ...(venueId ? { venueId } : {}),
      },
      include: {
        tenant: { select: { id: true, name: true, email: true, image: true } },
        venue:  { select: { id: true, title: true } },
        payment: { select: { status: true } },
      },
      orderBy: { date: "desc" },
    });
  }

  // ── Private helpers ────────────────────────────────────────────

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }
}

export const bookingService = new BookingService();
