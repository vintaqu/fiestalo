"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface Venue { id: string; title: string }

interface CalendarHeaderProps {
  currentDate:    Date;
  onDateChange:   (d: Date) => void;
  venues:         Venue[];
  selectedVenueId: string;
  onVenueChange:  (id: string) => void;
  loading:        boolean;
}

export function CalendarHeader({
  currentDate,
  onDateChange,
  venues,
  selectedVenueId,
  onVenueChange,
  loading,
}: CalendarHeaderProps) {
  const [direction, setDirection] = useState<"left" | "right">("right");

  function prev() {
    setDirection("left");
    onDateChange(subMonths(currentDate, 1));
  }
  function next() {
    setDirection("right");
    onDateChange(addMonths(currentDate, 1));
  }
  function goToday() {
    const now = new Date();
    setDirection(currentDate < now ? "right" : "left");
    onDateChange(now);
  }

  const monthLabel = format(currentDate, "MMMM yyyy", { locale: es });
  const isCurrentMonth =
    format(currentDate, "yyyy-MM") === format(new Date(), "yyyy-MM");

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      {/* Left: venue selector */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Calendario</h1>
          {venues.length > 1 ? (
            <select
              value={selectedVenueId}
              onChange={(e) => onVenueChange(e.target.value)}
              className="text-xs text-muted-foreground bg-transparent border-0 p-0 focus:outline-none cursor-pointer mt-0.5"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.title}</option>
              ))}
            </select>
          ) : venues.length === 1 ? (
            <p className="text-xs text-muted-foreground mt-0.5">{venues[0].title}</p>
          ) : null}
        </div>
      </div>

      {/* Right: month navigation */}
      <div className="flex items-center gap-2">
        {!isCurrentMonth && (
          <Button variant="ghost" size="sm" onClick={goToday} className="text-xs h-8">
            Hoy
          </Button>
        )}
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={prev}
            disabled={loading}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="overflow-hidden w-36 text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={monthLabel}
                initial={{ x: direction === "right" ? 24 : -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction === "right" ? -24 : 24, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="block text-sm font-semibold capitalize"
              >
                {monthLabel}
              </motion.span>
            </AnimatePresence>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={next}
            disabled={loading}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {loading && (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
