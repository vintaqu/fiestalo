"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface GeoResult {
  id:         string;
  label:      string;
  address:    string;
  city:       string;
  postalCode: string;
  latitude:   number;
  longitude:  number;
}

interface UseGeocoderOptions {
  debounceMs?: number;
  minChars?:   number;
  country?:    string;
}

export function useGeocoder(options: UseGeocoderOptions = {}) {
  const { debounceMs = 350, minChars = 3, country = "es" } = options;

  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.length < minChars) {
        setResults([]);
        return;
      }

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const url = `/api/geocode?q=${encodeURIComponent(q)}&country=${country}&limit=5`;
        const res  = await fetch(url, { signal: abortRef.current.signal });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error ?? "Error");
        setResults(data.data ?? []);
      } catch (e: any) {
        if (e.name === "AbortError") return; // intentional cancel
        setError(e.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [minChars, country]
  );

  // Debounce the query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }

    timerRef.current = setTimeout(() => search(query), debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, search, debounceMs]);

  function clear() {
    setQuery("");
    setResults([]);
    setError(null);
  }

  return { query, setQuery, results, loading, error, clear };
}

// ── Reverse geocoder (one-shot, no debounce) ─────────────────────

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeoResult | null> {
  try {
    const res  = await fetch(`/api/geocode?mode=reverse&lat=${lat}&lng=${lng}`);
    const data = await res.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}
