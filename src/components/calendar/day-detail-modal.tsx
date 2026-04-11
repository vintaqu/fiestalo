"use client";

import { useEffect } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { X, Clock, Users, CreditCard, Ban, ExternalLink, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import type { CalendarBooking, CalendarBlock, OpenDay } from "@/hooks/use-calendar";
import { getBookingColor, getBookingDot, statusLabel } from "./calendar-day-cell";
import { formatPrice } from "@/utils/format";
import { cn } from "@/lib/utils";

// ── Timeline helpers ───────────────────────────────────────────────────────

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number) {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

// ── Booking detail card ────────────────────────────────────────────────────

function BookingCard({ booking }: { booking: CalendarBooking }) {
  const colorClass = getBookingColor(booking.status);
  const dotClass   = getBookingDot(booking.status);

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", colorClass)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src={booking.tenant.image ?? undefined} />
            <AvatarFallback className="text-xs font-semibold">
              {booking.tenant.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{booking.tenant.name}</p>
            <p className="text-xs opacity-75 truncate">{booking.tenant.email}</p>
          </div>
        </div>
        <span className={cn("shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white/50")}>
          <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
          {statusLabel(booking.status)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 opacity-60" />
          <span className="font-medium">{booking.startTime}–{booking.endTime}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 opacity-60" />
          <span>{booking.guestCount} personas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 opacity-60" />
          <span className="font-semibold">{formatPrice(booking.total)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-current/10">
        <span className="text-[10px] opacity-60 font-mono">#{booking.bookingRef.slice(-8).toUpperCase()}</span>
        <Link
          href={`/owner/bookings/${booking.id}`}
          className="flex items-center gap-1 text-xs font-medium opacity-80 hover:opacity-100 transition-opacity"
        >
          Ver detalle <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Block card ─────────────────────────────────────────────────────────────

function BlockCard({ block, onDelete }: { block: CalendarBlock; onDelete: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
            <Ban className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {block.isFullDay ? "Día completo bloqueado" : `Bloqueado ${block.startTime}–${block.endTime}`}
            </p>
            {block.reason && <p className="text-xs text-gray-500">{block.reason}</p>}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-red-500"
          onClick={() => onDelete(block.id)}
          title="Eliminar bloqueo"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Timeline strip ─────────────────────────────────────────────────────────

function TimelineStrip({
  bookings, blocks, openDay,
}: {
  bookings: CalendarBooking[];
  blocks:   CalendarBlock[];
  openDay?: OpenDay;
}) {
  if (!openDay) return null;

  const openMin  = timeToMinutes(openDay.openTime);
  const closeMin = timeToMinutes(openDay.closeTime);
  const total    = closeMin - openMin;

  const HOURS = Array.from(
    { length: Math.ceil(total / 60) + 1 },
    (_, i) => minutesToTime(openMin + i * 60)
  ).filter((t) => timeToMinutes(t) <= closeMin);

  function pct(t: string) {
    return ((timeToMinutes(t) - openMin) / total) * 100;
  }

  return (
    <div className="relative h-10 rounded-xl bg-muted overflow-hidden mt-3 mb-4">
      {/* Hour ticks */}
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute top-0 bottom-0 w-px bg-border/50"
          style={{ left: `${pct(h)}%` }}
        />
      ))}

      {/* Booking strips */}
      {bookings.map((b) => (
        <div
          key={b.id}
          title={`${b.tenant.name} · ${b.startTime}–${b.endTime}`}
          className={cn(
            "absolute top-1 bottom-1 rounded-md border opacity-80",
            getBookingColor(b.status)
          )}
          style={{
            left:  `${Math.max(0, pct(b.startTime))}%`,
            width: `${Math.min(100 - Math.max(0, pct(b.startTime)), pct(b.endTime) - pct(b.startTime))}%`,
          }}
        />
      ))}

      {/* Block strips */}
      {blocks.filter(bl => !bl.isFullDay && bl.startTime && bl.endTime).map((bl) => (
        <div
          key={bl.id}
          title="Bloqueado"
          className="absolute top-1 bottom-1 rounded-md border border-gray-300 bg-gray-300/60"
          style={{
            left:  `${Math.max(0, pct(bl.startTime!))}%`,
            width: `${Math.min(100 - Math.max(0, pct(bl.startTime!)), pct(bl.endTime!) - pct(bl.startTime!))}%`,
          }}
        />
      ))}

      {/* Hour labels */}
      {HOURS.map((h) => (
        <span
          key={`label-${h}`}
          className="absolute bottom-0.5 text-[9px] text-muted-foreground"
          style={{ left: `${pct(h)}%`, transform: "translateX(-50%)" }}
        >
          {h}
        </span>
      ))}
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────

interface DayDetailModalProps {
  dateStr:    string | null;
  bookings:   CalendarBooking[];
  blocks:     CalendarBlock[];
  openDay:    OpenDay | undefined;
  onClose:    () => void;
  onDeleteBlock: (id: string) => void;
}

export function DayDetailModal({
  dateStr, bookings, blocks, openDay, onClose, onDeleteBlock,
}: DayDetailModalProps) {
  const isOpen = !!dateStr;

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const dayLabel = dateStr
    ? format(parseISO(dateStr), "EEEE, d 'de' MMMM", { locale: es })
    : "";

  const hasBookings = bookings.length > 0;
  const hasBlocks   = blocks.length > 0;
  const isEmpty     = !hasBookings && !hasBlocks;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border z-50 flex flex-col shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold capitalize text-sm">{dayLabel}</p>
                  {openDay ? (
                    <p className="text-xs text-muted-foreground">
                      Abierto {openDay.openTime}–{openDay.closeTime}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Cerrado</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Timeline */}
            {openDay && (hasBookings || hasBlocks) && (
              <div className="px-5 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Vista de día
                </p>
                <TimelineStrip bookings={bookings} blocks={blocks} openDay={openDay} />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {isEmpty && (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm">Sin actividad</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No hay reservas ni bloqueos este día
                  </p>
                </div>
              )}

              {hasBookings && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-2">
                    Reservas ({bookings.length})
                  </p>
                  <div className="space-y-3">
                    {bookings.map((b) => <BookingCard key={b.id} booking={b} />)}
                  </div>
                </div>
              )}

              {hasBlocks && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Bloqueos ({blocks.length})
                  </p>
                  <div className="space-y-2">
                    {blocks.map((bl) => (
                      <BlockCard key={bl.id} block={bl} onDelete={onDeleteBlock} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
