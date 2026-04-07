"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface OwnerBookingActionsProps {
  bookingId:     string;
  canAccept:     boolean;
  canReject:     boolean;
  canCancel:     boolean;
  isRequestType: boolean;
}

export function OwnerBookingActions({
  bookingId,
  canAccept,
  canReject,
  canCancel,
  isRequestType,
}: OwnerBookingActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading,     setLoading]     = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<"cancel" | "reject" | null>(null);

  async function doAction(action: "accept" | "reject" | "cancel", reason?: string) {
    setLoading(action);
    try {
      const res = await fetch(`/api/owner/bookings/${bookingId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");

      const messages = {
        accept: "Reserva aceptada. El cliente puede proceder al pago.",
        reject: "Reserva rechazada.",
        cancel: "Reserva cancelada.",
      };
      toast({ title: messages[action] });
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
      setShowConfirm(null);
    }
  }

  if (!canAccept && !canReject && !canCancel) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      <h3 className="font-semibold text-sm">Acciones</h3>

      {/* Accept / Reject for REQUEST bookings */}
      {(canAccept || canReject) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Esta reserva necesita tu aprobación
          </p>
          <p className="text-xs text-amber-700">
            El cliente está esperando tu respuesta. Al aceptar, podrá proceder al pago para confirmar la reserva.
          </p>
          <div className="flex gap-2">
            {canAccept && (
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => doAction("accept")}
                disabled={!!loading}
              >
                {loading === "accept" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Aceptar
                  </>
                )}
              </Button>
            )}
            {canReject && showConfirm !== "reject" && (
              <Button
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => setShowConfirm("reject")}
                disabled={!!loading}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Rechazar
              </Button>
            )}
          </div>

          {/* Reject confirmation */}
          {showConfirm === "reject" && (
            <div className="border border-red-200 rounded-xl p-3 bg-red-50 space-y-2">
              <p className="text-xs text-red-700 font-medium">¿Seguro que quieres rechazar esta solicitud?</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => doAction("reject", "Rechazado por el propietario")}
                  disabled={!!loading}
                >
                  {loading === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sí, rechazar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirm(null)}
                  disabled={!!loading}
                >
                  Volver
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel confirmed booking */}
      {canCancel && !showConfirm && (
        <Button
          variant="ghost"
          className="w-full text-destructive hover:bg-destructive/10"
          onClick={() => setShowConfirm("cancel")}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Cancelar reserva
        </Button>
      )}

      {showConfirm === "cancel" && (
        <div className="border border-destructive/30 rounded-xl p-4 space-y-3 bg-destructive/5">
          <p className="text-sm font-medium text-destructive">¿Cancelar esta reserva?</p>
          <p className="text-xs text-muted-foreground">
            El cliente será notificado. Dependiendo de la política, puede recibir un reembolso automático.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => doAction("cancel", "Cancelado por el propietario")}
              disabled={!!loading}
            >
              {loading === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, cancelar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setShowConfirm(null)}
            >
              Volver
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
