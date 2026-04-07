import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CalendarDays, Clock, Users, MapPin,
  CheckCircle2, XCircle, AlertCircle, Clock4, Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice, formatDate } from "@/utils/format";
import { MessageButton } from "@/components/messaging/message-button";
import { TenantBookingActions } from "@/components/dashboard/tenant-booking-actions";

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}> = {
  PENDING: {
    label: "Pendiente de confirmación",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock4 className="w-5 h-5" />,
    description: "El propietario está revisando tu solicitud.",
  },
  AWAITING_PAYMENT: {
    label: "Pago pendiente",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <AlertCircle className="w-5 h-5" />,
    description: "Tu reserva está reservada, completa el pago para confirmarla.",
  },
  CONFIRMED: {
    label: "Confirmada",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="w-5 h-5" />,
    description: "Tu reserva está confirmada. ¡Todo listo!",
  },
  COMPLETED: {
    label: "Completada",
    color: "bg-secondary text-muted-foreground border-border",
    icon: <CheckCircle2 className="w-5 h-5" />,
    description: "Esta reserva ya se ha completado.",
  },
  CANCELLED_BY_USER: {
    label: "Cancelada por ti",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="w-5 h-5" />,
    description: "Cancelaste esta reserva.",
  },
  CANCELLED_BY_OWNER: {
    label: "Cancelada por el propietario",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="w-5 h-5" />,
    description: "El propietario canceló esta reserva.",
  },
  REFUNDED: {
    label: "Reembolsada",
    color: "bg-secondary text-muted-foreground border-border",
    icon: <Receipt className="w-5 h-5" />,
    description: "Se ha procesado el reembolso.",
  },
};

async function getBooking(id: string, tenantId: string) {
  return db.booking.findFirst({
    where: { id, tenantId },
    include: {
      venue: {
        select: {
          title: true,
          slug: true,
          address: true,
          city: true,
          cancellationPolicy: true,
          owner: { select: { id: true, name: true, image: true } },
          images: { where: { isCover: true }, take: 1 },
        },
      },
      payment: {
        select: { status: true, receiptUrl: true, amount: true },
      },
      refunds: {
        select: { amount: true, processedAt: true, stripeRefundId: true },
      },
      review: { select: { id: true, rating: true } },
    },
  });
}

export default async function TenantBookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const booking = await getBooking(params.id, session.user.id);
  if (!booking) notFound();

  const statusInfo = STATUS_CONFIG[booking.status] ?? {
    label: booking.status,
    color: "bg-secondary text-muted-foreground border-border",
    icon: <AlertCircle className="w-5 h-5" />,
    description: "",
  };

  const policy = booking.venue.cancellationPolicy as
    | { type: string; refundHours: number } | null;

  const canCancel = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"].includes(booking.status);
  const canPay    = booking.status === "AWAITING_PAYMENT";
  const canReview = booking.status === "COMPLETED" && !booking.review;

  const totalRefunded = booking.refunds.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tenant/bookings"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Detalle de reserva</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Ref: <span className="font-mono">{booking.bookingRef}</span>
          </p>
        </div>
      </div>

      {/* Status banner */}
      <div className={`flex items-start gap-3 p-4 rounded-2xl border ${statusInfo.color}`}>
        {statusInfo.icon}
        <div>
          <p className="font-semibold text-sm">{statusInfo.label}</p>
          <p className="text-sm opacity-80 mt-0.5">{statusInfo.description}</p>
        </div>
      </div>

      {/* Venue info */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {booking.venue.images[0] && (
          <img
            src={booking.venue.images[0].url}
            alt={booking.venue.title}
            className="w-full h-44 object-cover"
          />
        )}
        <div className="p-5 space-y-3">
          <h2 className="font-semibold text-lg">{booking.venue.title}</h2>
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              {booking.venue.address}, {booking.venue.city}
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 shrink-0" />
              {formatDate(booking.date)}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              {booking.startTime} – {booking.endTime} ({booking.durationHours}h)
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 shrink-0" />
              {booking.guestCount} persona{booking.guestCount !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h3 className="font-semibold">Desglose del pago</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {formatPrice(Number(booking.pricePerHour))} × {booking.durationHours}h
            </span>
            <span>{formatPrice(Number(booking.subtotal))}</span>
          </div>
          {Number(booking.cleaningFee) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Limpieza</span>
              <span>{formatPrice(Number(booking.cleaningFee))}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tarifa de servicio</span>
            <span>{formatPrice(Number(booking.platformFee))}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span>{formatPrice(Number(booking.total))}</span>
          </div>
          {totalRefunded > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Reembolsado</span>
              <span>−{formatPrice(totalRefunded)}</span>
            </div>
          )}
        </div>

        {/* Receipt link */}
        {booking.payment?.receiptUrl && (
          <a
            href={booking.payment.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline mt-2"
          >
            <Receipt className="w-4 h-4" />
            Ver comprobante de pago
          </a>
        )}
      </div>

      {/* Cancellation policy */}
      {policy && canCancel && (
        <div className="bg-secondary/50 rounded-2xl p-4 text-sm">
          <p className="font-medium mb-1">Política de cancelación</p>
          <p className="text-muted-foreground text-xs">
            {policy.type === "flexible" && "Reembolso completo si cancelas con más de 24h. 50% dentro de las 24h previas."}
            {policy.type === "moderate" && "Reembolso completo con más de 72h. 50% entre 24–72h. Sin reembolso en las últimas 24h."}
            {policy.type === "strict" && `Reembolso completo solo con más de ${policy.refundHours}h de antelación.`}
          </p>
        </div>
      )}

      {/* Contact owner */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-sm mb-3">¿Tienes alguna duda?</h3>
        <MessageButton
          recipientId={booking.venue.owner.id}
          venueId={booking.venueId}
          bookingId={booking.id}
          bookingRef={booking.bookingRef}
          venueName={booking.venue.title}
          label="Contactar al propietario"
          variant="outline"
          size="sm"
        />
      </div>

      {/* Actions */}
      <TenantBookingActions
        bookingId={booking.id}
        status={booking.status}
        canCancel={canCancel}
        canPay={canPay}
        canReview={canReview}
        reviewId={booking.review?.id}
      />
    </div>
  );
}
