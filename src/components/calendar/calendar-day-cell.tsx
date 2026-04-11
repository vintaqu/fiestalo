"use client";

import { CalendarBooking, CalendarBlock } from "@/hooks/use-calendar";
import { cn } from "@/lib/utils";

// ── Status helpers ─────────────────────────────────────────────────────────

export function getBookingColor(status: string): string {
  switch (status) {
    case "CONFIRMED":        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "COMPLETED":        return "bg-green-50 text-green-700 border-green-200";
    case "PENDING":          return "bg-amber-100 text-amber-800 border-amber-200";
    case "AWAITING_PAYMENT": return "bg-blue-100 text-blue-800 border-blue-200";
    case "DISPUTED":         return "bg-red-100 text-red-800 border-red-200";
    default:                 return "bg-muted text-muted-foreground border-border";
  }
}

export function getBookingDot(status: string): string {
  switch (status) {
    case "CONFIRMED":        return "bg-emerald-500";
    case "COMPLETED":        return "bg-green-400";
    case "PENDING":          return "bg-amber-500";
    case "AWAITING_PAYMENT": return "bg-blue-500";
    case "DISPUTED":         return "bg-red-500";
    default:                 return "bg-muted-foreground";
  }
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    CONFIRMED:        "Confirmada",
    COMPLETED:        "Completada",
    PENDING:          "Pendiente",
    AWAITING_PAYMENT: "Pago pendiente",
    DISPUTED:         "Disputada",
  };
  return map[status] ?? status;
}

// ── BookingBlock ──────────────────────────────────────────────────────────

interface BookingBlockProps {
  booking:  CalendarBooking;
  compact?: boolean;
  onClick:  (b: CalendarBooking) => void;
}

export function BookingBlock({ booking, compact, onClick }: BookingBlockProps) {
  const colorClass = getBookingColor(booking.status);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(booking); }}
      title={`${booking.tenant.name} · ${booking.startTime}–${booking.endTime}`}
      className={cn(
        "w-full text-left rounded-md border px-1.5 py-0.5 text-xs font-medium truncate transition-all",
        "hover:brightness-95 hover:shadow-sm active:scale-[0.98]",
        colorClass,
        compact ? "py-0 text-[10px]" : ""
      )}
    >
      <span className="flex items-center gap-1 min-w-0">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getBookingDot(booking.status))} />
        <span className="truncate">
          {compact
            ? booking.startTime
            : `${booking.tenant.name.split(" ")[0]} · ${booking.startTime}`
          }
        </span>
      </span>
    </button>
  );
}

// ── BlockBadge ────────────────────────────────────────────────────────────

interface BlockBadgeProps {
  block:   CalendarBlock;
  compact?: boolean;
}

export function BlockBadge({ block, compact }: BlockBadgeProps) {
  return (
    <div
      title={block.isFullDay ? "Día bloqueado" : `Bloqueado ${block.startTime}–${block.endTime}${block.reason ? ` · ${block.reason}` : ""}`}
      className={cn(
        "w-full text-left rounded-md border border-gray-300 bg-gray-100 text-gray-600 px-1.5 py-0.5 text-xs font-medium truncate",
        compact ? "py-0 text-[10px]" : ""
      )}
    >
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
        <span className="truncate">
          {block.isFullDay ? "Bloqueado" : (compact ? block.startTime! : `Bloq. ${block.startTime}`)}
        </span>
      </span>
    </div>
  );
}

// ── CalendarDayCell ───────────────────────────────────────────────────────

interface CalendarDayCellProps {
  date:        Date;
  dateStr:     string; // YYYY-MM-DD
  isToday:     boolean;
  isCurrentMonth: boolean;
  isOpen:      boolean;
  bookings:    CalendarBooking[];
  blocks:      CalendarBlock[];
  isSelected:  boolean;
  onClick:     (dateStr: string) => void;
  onBookingClick: (b: CalendarBooking) => void;
}

export function CalendarDayCell({
  date, dateStr, isToday, isCurrentMonth, isOpen,
  bookings, blocks, isSelected, onClick, onBookingClick,
}: CalendarDayCellProps) {
  const dayNum     = date.getDate();
  const hasContent = bookings.length > 0 || blocks.length > 0;
  const MAX_VISIBLE = 3;
  const allItems = [
    ...bookings.map((b) => ({ type: "booking" as const, data: b })),
    ...blocks.map((bl)  => ({ type: "block"   as const, data: bl  })),
  ].sort((a, b) => {
    const ta = a.type === "booking" ? a.data.startTime : (a.data.startTime ?? "00:00");
    const tb = b.type === "booking" ? b.data.startTime : (b.data.startTime ?? "00:00");
    return ta.localeCompare(tb);
  });
  const visible  = allItems.slice(0, MAX_VISIBLE);
  const overflow = allItems.length - MAX_VISIBLE;

  return (
    <div
      onClick={() => onClick(dateStr)}
      className={cn(
        "relative min-h-[100px] p-1.5 border-b border-r border-border cursor-pointer",
        "transition-colors duration-100 group",
        isCurrentMonth ? "bg-background" : "bg-muted/20",
        !isCurrentMonth && "opacity-50",
        !isOpen && isCurrentMonth && "bg-muted/30",
        isSelected && "ring-2 ring-inset ring-primary",
        hasContent && isCurrentMonth && "hover:bg-primary/5",
        !hasContent && isCurrentMonth && "hover:bg-secondary/60",
      )}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
            isToday && "bg-primary text-primary-foreground",
            !isToday && isCurrentMonth && "text-foreground group-hover:text-primary",
            !isCurrentMonth && "text-muted-foreground",
          )}
        >
          {dayNum}
        </span>
        {/* Closed indicator */}
        {!isOpen && isCurrentMonth && (
          <span className="text-[9px] text-muted-foreground font-medium">Cerrado</span>
        )}
      </div>

      {/* Items */}
      <div className="space-y-0.5">
        {visible.map((item, idx) =>
          item.type === "booking" ? (
            <BookingBlock
              key={item.data.id}
              booking={item.data}
              compact={allItems.length > 2}
              onClick={onBookingClick}
            />
          ) : (
            <BlockBadge
              key={item.data.id}
              block={item.data}
              compact={allItems.length > 2}
            />
          )
        )}
        {overflow > 0 && (
          <p className="text-[10px] text-muted-foreground pl-1">
            +{overflow} más
          </p>
        )}
      </div>
    </div>
  );
}
