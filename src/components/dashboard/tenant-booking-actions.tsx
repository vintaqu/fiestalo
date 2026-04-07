"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, XCircle, CreditCard, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface TenantBookingActionsProps {
  bookingId: string;
  status: string;
  canCancel: boolean;
  canPay: boolean;
  canReview: boolean;
  reviewId?: string;
}

export function TenantBookingActions({
  bookingId,
  status,
  canCancel,
  canPay,
  canReview,
  reviewId,
}: TenantBookingActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelado por el cliente" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cancelar");
      toast({ title: "Reserva cancelada correctamente" });
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setCancelling(false);
      setShowConfirm(false);
    }
  }

  if (!canCancel && !canPay && !canReview) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      <h3 className="font-semibold text-sm">Acciones</h3>

      {/* Pay now */}
      {canPay && (
        <Button className="w-full" asChild>
          <Link href={`/checkout/${bookingId}`}>
            <CreditCard className="w-4 h-4 mr-2" />
            Completar pago
          </Link>
        </Button>
      )}

      {/* Write review */}
      {canReview && (
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/tenant/bookings/${bookingId}/review`}>
            <Star className="w-4 h-4 mr-2" />
            Escribir reseña
          </Link>
        </Button>
      )}

      {/* Cancel */}
      {canCancel && !showConfirm && (
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowConfirm(true)}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Cancelar reserva
        </Button>
      )}

      {/* Confirm cancel */}
      {showConfirm && (
        <div className="border border-destructive/30 rounded-xl p-4 space-y-3 bg-destructive/5">
          <p className="text-sm font-medium text-destructive">
            ¿Seguro que quieres cancelar?
          </p>
          <p className="text-xs text-muted-foreground">
            Esta acción no se puede deshacer. El reembolso depende de la política de cancelación del espacio.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, cancelar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setShowConfirm(false)}
              disabled={cancelling}
            >
              Volver
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
