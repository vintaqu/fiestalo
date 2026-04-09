export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { ok, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/auth-middleware";
import { paymentService } from "@/services/payment.service";


// POST /api/checkout/[bookingId]
// Creates or retrieves a PaymentIntent for this booking.
// Price is re-verified server-side against current venue prices.
export const POST = withAuth(async (req, { params, userId }) => {
  try {
    const bookingId = params!.bookingId as string;
    const result    = await paymentService.createPaymentIntent(bookingId, userId);

    // Return only what the client needs — never return secret keys beyond client_secret
    return ok({
      clientSecret:    result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      amount:          result.amount,
      breakdown:       result.breakdown,
      booking:         result.booking,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

// GET /api/checkout/[bookingId]
// Returns booking details + payment status for the checkout page to display
export const GET = withAuth(async (req, { params, userId }) => {
  try {
    const bookingId = params!.bookingId as string;
    const { db } = await import("@/lib/db");

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        venue: {
          select: {
            title: true,
            city: true,
            cancellationPolicy: true,
            images: { where: { isCover: true }, take: 1 },
            owner: { select: { name: true } },
          },
        },
        payment: {
          select: {
            status: true,
            stripePaymentIntentId: true,
            receiptUrl: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }
    if (booking.tenantId !== userId) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    return ok(booking);
  } catch (error) {
    return handleApiError(error);
  }
});
