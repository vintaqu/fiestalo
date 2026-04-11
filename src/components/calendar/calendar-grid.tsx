"use client";

import { useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDayCell } from "./calendar-day-cell";
import type { CalendarBooking, CalendarBlock, OpenDay } from "@/hooks/use-calendar";

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface CalendarGridProps {
  currentDate:    Date;
  bookingsByDate: Map<string, CalendarBooking[]>;
  blocksByDate:   Map<string, CalendarBlock[]>;
  openDays:       OpenDay[];
  selectedDate:   string | null;
  onDayClick:     (dateStr: string) => void;
  onBookingClick: (b: CalendarBooking) => void;
}

export function CalendarGrid({
  currentDate,
  bookingsByDate,
  blocksByDate,
  openDays,
  selectedDate,
  onDayClick,
  onBookingClick,
}: CalendarGridProps) {
  const openDaySet = useMemo(
    () => new Set(openDays.map((d) => d.dayOfWeek)),
    [openDays]
  );

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd   = endOfMonth(currentDate);
    // Week starting Monday (weekStartsOn: 1)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd   = endOfWeek(monthEnd,   { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="py-2.5 text-center text-xs font-semibold text-muted-foreground tracking-wide uppercase"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dateStr        = format(day, "yyyy-MM-dd");
          const inCurrentMonth = isSameMonth(day, currentDate);
          // Sunday = 0 in JS, but we map it correctly for our open day set
          const dow    = day.getDay(); // 0=Sun, 1=Mon...6=Sat
          const isOpen = inCurrentMonth && openDaySet.has(dow);

          return (
            <CalendarDayCell
              key={dateStr}
              date={day}
              dateStr={dateStr}
              isToday={isToday(day)}
              isCurrentMonth={inCurrentMonth}
              isOpen={isOpen}
              bookings={inCurrentMonth ? (bookingsByDate.get(dateStr) ?? []) : []}
              blocks={inCurrentMonth   ? (blocksByDate.get(dateStr)   ?? []) : []}
              isSelected={selectedDate === dateStr}
              onClick={onDayClick}
              onBookingClick={onBookingClick}
            />
          );
        })}
      </div>
    </div>
  );
}
