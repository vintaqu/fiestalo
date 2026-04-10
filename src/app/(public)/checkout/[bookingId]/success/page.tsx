import Link from "next/link";
import { CheckCircle, CalendarDays, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatPrice, formatShortDate } from "@/utils/format";

// On success page load, verify payment with Stripe and confirm booking if needed
// This is a fallback in case the webhook hasn't arrived yet
async function verifyAndConfirm(bookingId: string) {
  try {
    const booking = await db.booking.findUnique({
      where:   { id: bookingId },
      include: { payment: { select: { stripePaymentIntentId: true, status: true } } },
    });

    if (!booking || !booking.payment?.stripePaymentIntentId) return;

    // Already confirmed — nothing to do
    if (booking.status === "CONFIRMED") return;

    // Check with Stripe directly
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    } as any);

    const pi = await stripe.paymentIntents.retrieve(
      booking.payment.stripePaymentIntentId
    );

    if (pi.status === "succeeded" && booking.status !== "CONFIRMED") {
      // Webhook missed — confirm manually
      const { bookingService } = await import("@/services/booking.service");
      await bookingService.confirmPayment(bookingId, pi.id);
    }
  } catch (err) {
    // Non-blocking — webhook will handle it if this fails
    console.error("[success page verify]", err);
  }
}

export default async function CheckoutSuccessPage({
  params,
}: {
  params: { bookingId: string };
}) {
  // Try to confirm via direct Stripe check (webhook fallback)
  await verifyAndConfirm(params.bookingId);

  const booking = await db.booking.findUnique({
    where:   { id: params.bookingId },
    include: { venue: { select: { title: true, city: true, slug: true } } },
  });

  const isConfirmed = booking?.status === "CONFIRMED" || booking?.status === "COMPLETED";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-secondary/20">
      <div className="max-w-md w-full bg-card rounded-3xl border border-border shadow-lg p-8 text-center">

        {/* Icon */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
          isConfirmed ? "bg-emerald-100" : "bg-amber-100"
        }`}>
          {isConfirmed
            ? <CheckCircle className="w-9 h-9 text-emerald-600" />
            : <Clock className="w-9 h-9 text-amber-600" />
          }
        </div>

        <h1 className="text-2xl font-bold mb-2">
          {isConfirmed ? "¡Reserva confirmada!" : "Pago procesado"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isConfirmed
            ? "Tu reserva está confirmada. Recibirás un email con todos los detalles."
            : "Tu pago se ha procesado. La confirmación llegará en unos minutos por email."}
        </p>

        {booking && (
          <div className="bg-secondary/50 rounded-2xl p-4 mb-8 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Espacio</span>
              <span className="font-medium">{booking.venue.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ciudad</span>
              <span>{booking.venue.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha</span>
              <span>{formatShortDate(booking.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horario</span>
              <span>{booking.startTime} – {booking.endTime}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-border pt-2 mt-2">
              <span>Total pagado</span>
              <span>{formatPrice(Number(booking.total))}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Estado</span>
              <span className={isConfirmed ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                {isConfirmed ? "✓ Confirmada" : "⏳ Procesando"}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button className="w-full" asChild>
            <Link href="/tenant/bookings">
              <CalendarDays className="w-4 h-4 mr-2" />
              Ver mis reservas
            </Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/search">
              Buscar más salas
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
