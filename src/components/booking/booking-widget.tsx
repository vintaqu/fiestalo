"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  Shield,
  Zap,
  ChevronDown,
  Loader2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/utils/format";

interface BookingWidgetProps {
  venue: {
    id: string;
    pricePerHour: number | string;
    cleaningFee?: number | string | null;
    minHours: number;
    maxHours?: number | null;
    capacity: number;
    bookingType: "INSTANT" | "REQUEST";
    averageRating?: number | string | null;
    totalReviews: number;
    availabilityRules: Array<{
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
      isOpen: boolean;
    }>;
  };
  userId: string | null;
}

interface PriceBreakdown {
  pricePerHour: number;
  durationHours: number;
  subtotal: number;
  cleaningFee: number;
  platformFee: number;
  total: number;
}

export function BookingWidget({ venue, userId }: BookingWidgetProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [guests, setGuests] = useState(1);
  const [pricing, setPricing] = useState<PriceBreakdown | null>(null);
  const [availability, setAvailability] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);
  const [isCheckingAvail, setIsCheckingAvail] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Auto-check availability when date/time changes
  useEffect(() => {
    if (!date || !startTime || !endTime) {
      setPricing(null);
      setAvailability(null);
      return;
    }

    const check = async () => {
      setIsCheckingAvail(true);
      try {
        const [availRes, priceRes] = await Promise.all([
          fetch(
            `/api/availability?venueId=${venue.id}&date=${date}&startTime=${startTime}&endTime=${endTime}`
          ),
          fetch(
            `/api/venues/${venue.id}/pricing?date=${date}&startTime=${startTime}&endTime=${endTime}`
          ),
        ]);

        const availData = await availRes.json();
        setAvailability(availData.data);

        if (availData.data?.available) {
          const priceData = await priceRes.json();
          setPricing(priceData.data);
        } else {
          setPricing(null);
        }
      } catch {
        setPricing(null);
      } finally {
        setIsCheckingAvail(false);
      }
    };

    const timeout = setTimeout(check, 400);
    return () => clearTimeout(timeout);
  }, [date, startTime, endTime, venue.id]);

  async function handleBook() {
    if (!userId) {
      router.push(`/login?callbackUrl=/venues/${venue.id}`);
      return;
    }

    if (!date || !startTime || !endTime || !availability?.available) return;

    setIsBooking(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: venue.id,
          date,
          startTime,
          endTime,
          guestCount: guests,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Error al reservar",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      // Redirect to checkout
      router.push(`/checkout/${data.data.id}`);
    } catch {
      toast({
        title: "Error inesperado",
        description: "Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  }

  const pricePerHour = Number(venue.pricePerHour);
  const isInstant = venue.bookingType === "INSTANT";

  return (
    <div className="rounded-2xl border border-border shadow-lg p-6 bg-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">
              {formatPrice(pricePerHour)}
            </span>
            <span className="text-muted-foreground text-sm">/hora</span>
          </div>
          {venue.totalReviews > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium">
                {Number(venue.averageRating).toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({venue.totalReviews} reseñas)
              </span>
            </div>
          )}
        </div>
        {isInstant ? (
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
            <Zap className="w-3 h-3" />
            Confirmación inmediata
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
            <Clock className="w-3 h-3" />
            Sujeto a aprobación
          </div>
        )}
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Date */}
        <div>
          <Label htmlFor="date" className="text-sm font-medium mb-1.5 block">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Fecha
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="h-10"
          />
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="startTime" className="text-sm font-medium mb-1.5 block">
              Entrada
            </Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <Label htmlFor="endTime" className="text-sm font-medium mb-1.5 block">
              Salida
            </Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        {/* Guests */}
        <div>
          <Label htmlFor="guests" className="text-sm font-medium mb-1.5 block">
            <Users className="w-3.5 h-3.5 inline mr-1" />
            Personas (máx. {venue.capacity})
          </Label>
          <Input
            id="guests"
            type="number"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            min={1}
            max={venue.capacity}
            className="h-10"
          />
        </div>

        {/* Availability status */}
        <AnimatePresence mode="wait">
          {isCheckingAvail && (
            <motion.div
              key="checking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Comprobando disponibilidad...
            </motion.div>
          )}
          {!isCheckingAvail && availability && date && (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-sm font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg ${
                availability.available
                  ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                  : "text-red-700 bg-red-50 border border-red-200"
              }`}
            >
              <span>{availability.available ? "✓" : "✕"}</span>
              {availability.available
                ? "Franja disponible"
                : availability.reason ?? "No disponible"}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Price breakdown */}
        {pricing && availability?.available && (
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-muted/50 transition-colors"
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              <span>Desglose del precio</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showBreakdown ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {showBreakdown && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2 text-sm border-t border-border pt-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {formatPrice(pricing.pricePerHour)} × {pricing.durationHours}h
                      </span>
                      <span>{formatPrice(pricing.subtotal)}</span>
                    </div>
                    {pricing.cleaningFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tarifa de limpieza</span>
                        <span>{formatPrice(pricing.cleaningFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comisión de servicio</span>
                      <span>{formatPrice(pricing.platformFee)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatPrice(pricing.total)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!showBreakdown && (
              <div className="px-4 pb-4 flex justify-between font-semibold text-sm">
                <span>Total</span>
                <span>{formatPrice(pricing.total)}</span>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={handleBook}
          disabled={
            !date ||
            !startTime ||
            !endTime ||
            !availability?.available ||
            isCheckingAvail ||
            isBooking
          }
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {isBooking ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : !userId ? (
            "Inicia sesión para reservar"
          ) : isInstant ? (
            "Reservar sala"
          ) : (
            "Solicitar reserva"
          )}
        </Button>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" />
          Pago seguro · Sin cargos hasta confirmar
        </div>
      </div>
    </div>
  );
}
