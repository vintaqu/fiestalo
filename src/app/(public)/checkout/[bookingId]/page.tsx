"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { motion } from "framer-motion";
import {
  Shield, ArrowLeft, Loader2, CalendarDays,
  Clock, Users, Info, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/shared/site-header";
import { formatPrice } from "@/utils/format";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Cancellation policy display
const POLICY_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  flexible: {
    label: "Flexible",
    desc:  "Reembolso completo si cancelas con más de 24h de antelación.",
    color: "text-emerald-600",
  },
  moderate: {
    label: "Moderada",
    desc:  "Reembolso completo si cancelas con más de 72h. 50% entre 24–72h.",
    color: "text-amber-600",
  },
  strict: {
    label: "Estricta",
    desc:  "Reembolso completo solo si cancelas con más de 48h. Sin reembolso después.",
    color: "text-red-600",
  },
};

export default function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/checkout/${bookingId}`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error iniciando el pago");
        setClientSecret(data.data.clientSecret);
        setCheckoutData(data.data);
      } catch (e: any) {
        setError(e.message ?? "Error cargando el pago");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !clientSecret || !checkoutData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-lg font-semibold">No se pudo cargar el pago</h2>
        <p className="text-muted-foreground text-sm text-center max-w-sm">{error}</p>
        <Button onClick={() => history.back()}>Volver</Button>
      </div>
    );
  }

  const { booking, breakdown } = checkoutData;
  const policy = booking?.venue?.cancellationPolicy as
    | { type: string; refundHours: number } | null | undefined;
  const policyInfo = policy?.type ? POLICY_LABELS[policy.type] : null;

  return (
    <>
      <SiteHeader />
      <main className="pt-16 min-h-screen bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <button
            onClick={() => history.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground mb-8 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>

          <h1 className="text-2xl font-bold mb-8">Confirmar reserva</h1>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: Payment form */}
            <div className="lg:col-span-3">
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#4f46e5",
                      borderRadius: "8px",
                      fontFamily: "var(--font-sans)",
                    },
                  },
                  locale: "es",
                }}
              >
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                  <h2 className="font-semibold mb-6">Datos de pago</h2>
                  <CheckoutForm bookingId={bookingId} />
                </div>
              </Elements>
            </div>

            {/* Right: Summary */}
            <div className="lg:col-span-2 space-y-4">
              {/* Booking summary */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border p-5 shadow-sm"
              >
                <h2 className="font-semibold mb-4 text-sm">Resumen</h2>

                {booking.venue?.images?.[0] && (
                  <img
                    src={booking.venue.images[0].url}
                    alt={booking.venue.title}
                    className="w-full h-36 object-cover rounded-xl mb-4"
                  />
                )}

                <h3 className="font-medium text-sm mb-3">{booking.venue?.title}</h3>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                    {booking.date
                      ? format(parseISO(booking.date), "EEEE d 'de' MMMM yyyy", { locale: es })
                      : "—"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {booking.startTime} – {booking.endTime} ({booking.durationHours}h)
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    {booking.guestCount} persona{booking.guestCount !== 1 ? "s" : ""}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Price breakdown */}
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
                    <span className="text-muted-foreground">
                      Tarifa de servicio ({Math.round(Number(booking.platformFeeRate) * 100)}%)
                    </span>
                    <span>{formatPrice(Number(booking.platformFee))}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>{formatPrice(Number(booking.total))}</span>
                  </div>
                </div>
              </motion.div>

              {/* Cancellation policy */}
              {policyInfo && (
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        Política de cancelación:{" "}
                        <span className={policyInfo.color}>{policyInfo.label}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{policyInfo.desc}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security badge */}
              <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground mb-0.5">Pago 100% seguro</p>
                    <p className="text-xs">
                      Procesado por Stripe. Tus datos de tarjeta están cifrados y nunca llegan a nuestros servidores.
                    </p>
                  </div>
                </div>
              </div>

              {/* What's included */}
              <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <p className="text-sm font-medium mb-2">¿Qué incluye tu reserva?</p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {[
                    "Acceso exclusivo al espacio en el horario reservado",
                    "Confirmación inmediata por email",
                    "Soporte de Fiestalo durante la reserva",
                    "Comprobante de pago descargable",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// ── Checkout form (inside Elements context) ───────────────────────────────────

function CheckoutForm({ bookingId }: { bookingId: string }) {
  const stripe     = useStripe();
  const elements   = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    // Validate elements before confirming
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message ?? "Error en el formulario de pago");
      setIsProcessing(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/${bookingId}/success`,
      },
    });

    // If we reach here, confirmPayment returned an error (redirect didn't happen)
    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setErrorMessage(error.message ?? "Error con la tarjeta");
      } else {
        setErrorMessage("Error inesperado. Por favor, inténtalo de nuevo.");
      }
    }

    setIsProcessing(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <p className="text-sm text-destructive">{errorMessage}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Procesando...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Confirmar y pagar
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Al confirmar aceptas los{" "}
        <a href="/terms" className="underline hover:text-foreground">términos de uso</a>
        {" "}y la{" "}
        <a href="/privacy" className="underline hover:text-foreground">política de privacidad</a>.
        El cobro aparecerá como <strong>SPACEHUB</strong> en tu extracto.
      </p>
    </form>
  );
}
