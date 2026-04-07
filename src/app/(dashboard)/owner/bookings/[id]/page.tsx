import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CalendarDays, Clock, Users,
  Mail, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPrice, formatDate } from "@/utils/format";
import { OwnerBookingActions } from "@/components/dashboard/owner-booking-actions";

async function getBookingForOwner(id: string, ownerId: string) {
  return db.booking.findFirst({
    where: { id, venue: { ownerId } },
    include: {
      venue: {
        select: {
          title: true,
          slug: true,
          bookingType: true,
          cancellationPolicy: true,
        },
      },
      tenant: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      },
      payment: { select: { status: true, receiptUrl: true } },
      refunds: { select: { amount: true } },
    },
  });
}

export default async function OwnerBookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const booking = await getBookingForOwner(params.id, session.user.id);
  if (!booking) notFound();

  const isRequest   = booking.venue.bookingType === "REQUEST";
  const isPending   = booking.status === "PENDING";
  const canAccept   = isRequest && isPending;
  const canReject   = isRequest && isPending;
  const canCancel   = ["CONFIRMED", "AWAITING_PAYMENT"].includes(booking.status);

  const totalRefunded = booking.refunds.reduce((s, r) => s + Number(r.amount), 0);

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    PENDING:            { label: "Pendiente de tu respuesta", color: "text-amber-600 bg-amber-50 border-amber-200" },
    AWAITING_PAYMENT:   { label: "Esperando pago del cliente", color: "text-blue-600 bg-blue-50 border-blue-200" },
    CONFIRMED:          { label: "Confirmada", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    COMPLETED:          { label: "Completada", color: "text-muted-foreground bg-secondary border-border" },
    CANCELLED_BY_USER:  { label: "Cancelada por el cliente", color: "text-red-600 bg-red-50 border-red-200" },
    CANCELLED_BY_OWNER: { label: "Cancelada por ti", color: "text-red-600 bg-red-50 border-red-200" },
    REFUNDED:           { label: "Reembolsada", color: "text-muted-foreground bg-secondary border-border" },
  };

  const statusInfo = STATUS_LABELS[booking.status] ?? {
    label: booking.status,
    color: "text-muted-foreground bg-secondary border-border",
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/owner/bookings"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Detalle de reserva</h1>
          <p className="text-muted-foreground text-sm mt-0.5 font-mono">
            {booking.bookingRef}
          </p>
        </div>
      </div>

      {/* Status */}
      <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium ${statusInfo.color}`}>
        {booking.status === "CONFIRMED" || booking.status === "COMPLETED"
          ? <CheckCircle2 className="w-5 h-5 shrink-0" />
          : booking.status.startsWith("CANCELLED") || booking.status === "REFUNDED"
          ? <XCircle className="w-5 h-5 shrink-0" />
          : <AlertCircle className="w-5 h-5 shrink-0" />}
        {statusInfo.label}
        {isRequest && isPending && (
          <span className="ml-auto text-xs font-normal opacity-70">
            Reserva bajo solicitud — necesita tu aprobación
          </span>
        )}
      </div>

      {/* Booking info */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h2 className="font-semibold">{booking.venue.title}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span>{formatDate(booking.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0" />
            <span>{booking.startTime} – {booking.endTime} ({booking.durationHours}h)</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4 shrink-0" />
            <span>{booking.guestCount} persona{booking.guestCount !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {booking.specialRequests && (
          <div className="bg-secondary/50 rounded-xl p-3 text-sm">
            <p className="font-medium mb-1 text-xs text-muted-foreground uppercase tracking-wide">
              Solicitudes especiales
            </p>
            <p>{booking.specialRequests}</p>
          </div>
        )}
      </div>

      {/* Client info */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold mb-4 text-sm">Cliente</h3>
        <div className="flex items-center gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={booking.tenant.image ?? ""} />
            <AvatarFallback className="text-sm font-medium">
              {booking.tenant.name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{booking.tenant.name}</p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{booking.tenant.email}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Miembro desde {new Date(booking.tenant.createdAt).getFullYear()}
            </p>
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h3 className="font-semibold text-sm">Ingresos</h3>
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
          <div className="flex justify-between text-muted-foreground">
            <span>Comisión plataforma ({Math.round(Number(booking.platformFeeRate) * 100)}%)</span>
            <span>−{formatPrice(Number(booking.platformFee))}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Tus ingresos</span>
            <span className="text-emerald-600">
              {formatPrice(Number(booking.total) - Number(booking.platformFee))}
            </span>
          </div>
          {totalRefunded > 0 && (
            <div className="flex justify-between text-destructive text-xs">
              <span>Reembolsado al cliente</span>
              <span>−{formatPrice(totalRefunded)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <OwnerBookingActions
        bookingId={booking.id}
        canAccept={canAccept}
        canReject={canReject}
        canCancel={canCancel}
        isRequestType={isRequest}
      />
    </div>
  );
}
