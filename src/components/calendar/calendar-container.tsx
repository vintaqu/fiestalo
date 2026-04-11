"use client";

import { useState, useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useCalendar, CalendarBooking } from "@/hooks/use-calendar";
import { CalendarHeader }   from "./calendar-header";
import { CalendarGrid }     from "./calendar-grid";
import { DayDetailModal }   from "./day-detail-modal";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface Venue { id: string; title: string }

interface CalendarContainerProps {
  venues:          Venue[];
  initialVenueId:  string;
}

export function CalendarContainer({ venues, initialVenueId }: CalendarContainerProps) {
  const [currentDate,     setCurrentDate]     = useState(new Date());
  const [selectedVenueId, setSelectedVenueId] = useState(initialVenueId);
  const [selectedDate,    setSelectedDate]    = useState<string | null>(null);
  const { toast } = useToast();

  const {
    data, loading, error,
    bookingsByDate, blocksByDate,
    invalidate,
  } = useCalendar(selectedVenueId, currentDate);

  // ── Legend counts ─────────────────────────────────────────────────────────
  const legendCounts = useMemo(() => {
    if (!data) return null;
    const confirmed = data.bookings.filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED").length;
    const pending   = data.bookings.filter((b) => b.status === "PENDING" || b.status === "AWAITING_PAYMENT").length;
    const blocked   = data.blocks.length;
    return { confirmed, pending, blocked };
  }, [data]);

  // ── Selected day data ──────────────────────────────────────────────────────
  const selectedBookings = selectedDate ? (bookingsByDate.get(selectedDate) ?? []) : [];
  const selectedBlocks   = selectedDate ? (blocksByDate.get(selectedDate)   ?? []) : [];
  const selectedOpenDay  = useMemo(() => {
    if (!selectedDate || !data) return undefined;
    const dow = parseISO(selectedDate).getDay();
    return data.openDays.find((d) => d.dayOfWeek === dow);
  }, [selectedDate, data]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDayClick = useCallback((dateStr: string) => {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }, []);

  const handleBookingClick = useCallback((b: CalendarBooking) => {
    // Navigate to booking detail (already handled via the link in the modal)
    // We just open the modal for the day
    setSelectedDate(b.date);
  }, []);

  const handleDeleteBlock = useCallback(async (blockId: string) => {
    try {
      const res = await fetch(`/api/owner/blocks/${blockId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Error eliminando bloqueo");
      invalidate();
      toast({ title: "Bloqueo eliminado", description: "El día vuelve a estar disponible." });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el bloqueo.", variant: "destructive" });
    }
  }, [invalidate, toast]);

  const handleCloseModal = useCallback(() => setSelectedDate(null), []);

  // ── Venue change ──────────────────────────────────────────────────────────
  function handleVenueChange(id: string) {
    setSelectedVenueId(id);
    setSelectedDate(null);
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <p className="font-semibold">Error cargando el calendario</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={invalidate} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <CalendarHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        venues={venues}
        selectedVenueId={selectedVenueId}
        onVenueChange={handleVenueChange}
        loading={loading}
      />

      {/* Legend */}
      {legendCounts && (legendCounts.confirmed > 0 || legendCounts.pending > 0 || legendCounts.blocked > 0) && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {legendCounts.confirmed > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {legendCounts.confirmed} confirmada{legendCounts.confirmed !== 1 ? "s" : ""}
            </span>
          )}
          {legendCounts.pending > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              {legendCounts.pending} pendiente{legendCounts.pending !== 1 ? "s" : ""}
            </span>
          )}
          {legendCounts.blocked > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              {legendCounts.blocked} bloqueo{legendCounts.blocked !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Calendar grid — skeleton on loading */}
      <div className={loading ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
        <CalendarGrid
          currentDate={currentDate}
          bookingsByDate={bookingsByDate}
          blocksByDate={blocksByDate}
          openDays={data?.openDays ?? []}
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
          onBookingClick={handleBookingClick}
        />
      </div>

      {/* Empty month state */}
      {!loading && data && data.bookings.length === 0 && data.blocks.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-2">
          No hay reservas ni bloqueos este mes
        </p>
      )}

      {/* Day detail slide-over */}
      <DayDetailModal
        dateStr={selectedDate}
        bookings={selectedBookings}
        blocks={selectedBlocks}
        openDay={selectedOpenDay}
        onClose={handleCloseModal}
        onDeleteBlock={handleDeleteBlock}
      />
    </div>
  );
}
