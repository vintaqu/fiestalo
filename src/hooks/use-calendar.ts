"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CalendarBooking {
  id:            string;
  bookingRef:    string;
  date:          string; // YYYY-MM-DD
  startTime:     string;
  endTime:       string;
  status:        string;
  guestCount:    number;
  total:         number;
  tenant: {
    id:    string;
    name:  string;
    email: string;
    image: string | null;
  };
  paymentStatus: string | null;
}

export interface CalendarBlock {
  id:        string;
  date:      string; // YYYY-MM-DD
  startTime: string | null;
  endTime:   string | null;
  reason:    string | null;
  isFullDay: boolean;
}

export interface OpenDay {
  dayOfWeek: number; // 0=Sun..6=Sat
  openTime:  string;
  closeTime: string;
}

export interface CalendarData {
  venue:    { id: string; title: string };
  month:    string; // YYYY-MM
  bookings: CalendarBooking[];
  blocks:   CalendarBlock[];
  openDays: OpenDay[];
}

// ── Hook ───────────────────────────────────────────────────────────────────

const cache = new Map<string, CalendarData>();

export function useCalendar(venueId: string, currentDate: Date) {
  const month = format(currentDate, "yyyy-MM");
  const key   = `${venueId}:${month}`;

  const [data,    setData]    = useState<CalendarData | null>(cache.get(key) ?? null);
  const [loading, setLoading] = useState(!cache.has(key));
  const [error,   setError]   = useState<string | null>(null);

  const fetchMonth = useCallback(async (vId: string, m: string, k: string) => {
    if (cache.has(k)) {
      setData(cache.get(k)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/owner/calendar?venueId=${vId}&month=${m}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error cargando calendario");
      cache.set(k, json.data);
      setData(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (venueId) fetchMonth(venueId, month, key);
  }, [venueId, month, key, fetchMonth]);

  const invalidate = useCallback(() => {
    cache.delete(key);
    fetchMonth(venueId, month, key);
  }, [venueId, month, key, fetchMonth]);

  // Group by date for O(1) day lookup
  const bookingsByDate = new Map<string, CalendarBooking[]>();
  const blocksByDate   = new Map<string, CalendarBlock[]>();

  if (data) {
    for (const b of data.bookings) {
      if (!bookingsByDate.has(b.date)) bookingsByDate.set(b.date, []);
      bookingsByDate.get(b.date)!.push(b);
    }
    for (const bl of data.blocks) {
      if (!blocksByDate.has(bl.date)) blocksByDate.set(bl.date, []);
      blocksByDate.get(bl.date)!.push(bl);
    }
  }

  return { data, loading, error, bookingsByDate, blocksByDate, invalidate };
}
