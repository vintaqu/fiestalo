import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const actionSchema = z.object({
  action: z.enum(["accept", "reject", "cancel"]),
  reason: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verify ownership
  const booking = await db.booking.findUnique({
    where: { id: params.id },
    include: {
      venue:   { select: { ownerId: true, title: true, bookingType: true, owner: { select: { name: true } } } },
      tenant:  { select: { id: true, email: true, name: true } },
      payment: { select: { stripePaymentIntentId: true, status: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  const isOwner = booking.venue.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, reason } = actionSchema.parse(body);

    switch (action) {

      // ── Accept: PENDING → AWAITING_PAYMENT ────────────────────────────────
      case "accept": {
        if (booking.status !== "PENDING") {
          return NextResponse.json(
            { error: "Solo se pueden aceptar reservas en estado PENDING" },
            { status: 422 }
          );
        }
        if (booking.venue.bookingType !== "REQUEST") {
          return NextResponse.json(
            { error: "Este espacio usa reserva instantánea, no necesita aprobación" },
            { status: 422 }
          );
        }

        await db.booking.update({
          where: { id: params.id },
          data:  { status: "AWAITING_PAYMENT" },
        });

        const { notificationService } = await import("@/services/notification.service");
        await notificationService.notify({
          type: "BOOKING_ACCEPTED",
          booking: {
            id:         params.id,
            bookingRef: booking.bookingRef,
            date:       booking.date,
            startTime:  booking.startTime,
            endTime:    booking.endTime,
            tenantId:   booking.tenant.id,
            tenantName: booking.tenant.name,
            venueId:    booking.venueId,
            venueTitle: booking.venue.title,
            ownerId:    booking.venue.ownerId,
          },
        });

        return NextResponse.json({ data: { status: "AWAITING_PAYMENT" } });
      }

      // ── Reject: PENDING → CANCELLED_BY_OWNER ──────────────────────────────
      case "reject": {
        if (booking.status !== "PENDING") {
          return NextResponse.json(
            { error: "Solo se pueden rechazar reservas en estado PENDING" },
            { status: 422 }
          );
        }

        await db.booking.update({
          where: { id: params.id },
          data:  {
            status:             "CANCELLED_BY_OWNER",
            cancelledAt:        new Date(),
            cancellationReason: reason ?? "Rechazado por el propietario",
            cancelledBy:        session.user.id,
          },
        });

        const { notificationService } = await import("@/services/notification.service");
        await notificationService.notify({
          type: "BOOKING_REJECTED",
          booking: {
            id:         params.id,
            bookingRef: booking.bookingRef,
            date:       booking.date,
            startTime:  booking.startTime,
            endTime:    booking.endTime,
            tenantId:   booking.tenant.id,
            tenantName: booking.tenant.name,
            venueId:    booking.venueId,
            venueTitle: booking.venue.title,
            ownerId:    booking.venue.ownerId,
            ownerName:  booking.venue.owner.name,
          },
        });

        return NextResponse.json({ data: { status: "CANCELLED_BY_OWNER" } });
      }

      // ── Cancel: CONFIRMED/AWAITING_PAYMENT → CANCELLED_BY_OWNER ──────────
      case "cancel": {
        if (!["CONFIRMED", "AWAITING_PAYMENT"].includes(booking.status)) {
          return NextResponse.json(
            { error: "Esta reserva no puede cancelarse" },
            { status: 422 }
          );
        }

        await db.booking.update({
          where: { id: params.id },
          data:  {
            status:             "CANCELLED_BY_OWNER",
            cancelledAt:        new Date(),
            cancellationReason: reason ?? "Cancelado por el propietario",
            cancelledBy:        session.user.id,
          },
        });

        // If payment was completed, trigger refund
        if (
          booking.status === "CONFIRMED" &&
          booking.payment?.status === "SUCCEEDED"
        ) {
          try {
            const { paymentService } = await import("@/services/payment.service");
            await paymentService.refund(params.id, session.user.id, reason, Number.MAX_SAFE_INTEGER);
          } catch (err) {
            console.error("[owner cancel refund]", err);
            // Don't fail the cancellation if refund fails — handle manually
          }
        }

        const { notificationService } = await import("@/services/notification.service");
        await notificationService.notify({
          type: "BOOKING_CANCELLED",
          booking: {
            id:          params.id,
            bookingRef:  booking.bookingRef,
            date:        booking.date,
            startTime:   booking.startTime,
            endTime:     booking.endTime,
            tenantId:    booking.tenant.id,
            tenantName:  booking.tenant.name,
            venueId:     booking.venueId,
            venueTitle:  booking.venue.title,
            ownerId:     booking.venue.ownerId,
            cancelledBy: session.user.id,
          },
        });

        return NextResponse.json({ data: { status: "CANCELLED_BY_OWNER" } });
      }

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    console.error("[owner booking action]", err);
    return NextResponse.json({ error: err.message ?? "Error interno" }, { status: 500 });
  }
}
