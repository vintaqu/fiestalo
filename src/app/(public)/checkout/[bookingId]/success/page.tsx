import Link from "next/link";
import { CheckCircle, CalendarDays, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatPrice, formatShortDate } from "@/utils/format";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const booking = await db.booking.findUnique({
    where: { id: params.bookingId },
    include: {
      venue: { select: { title: true, city: true, slug: true } },
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-secondary/20">
      <div className="max-w-md w-full bg-card rounded-3xl border border-border shadow-lg p-8 text-center">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-9 h-9 text-emerald-600" />
        </div>

        <h1 className="text-2xl font-bold mb-2">¡Reserva confirmada!</h1>
        <p className="text-muted-foreground mb-8">
          Tu pago ha sido procesado correctamente. Recibirás un email con todos los detalles.
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
              <span>
                {booking.startTime} – {booking.endTime}
              </span>
            </div>
            <div className="flex justify-between font-semibold border-t border-border pt-2 mt-2">
              <span>Total pagado</span>
              <span>{formatPrice(Number(booking.total))}</span>
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
              Buscar más espacios
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
