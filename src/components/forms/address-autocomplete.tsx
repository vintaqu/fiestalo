"use client";

import { useRef, useState, useEffect } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import { useGeocoder, type GeoResult } from "@/hooks/use-geocoder";
import { cn } from "@/lib/utils";

interface AddressAutocompleteProps {
  value:          string;
  onChange:       (address: string) => void;
  onSelect:       (result: GeoResult) => void;
  placeholder?:   string;
  className?:     string;
  error?:         string;
  /** If true on mount, treat value as already geocoded (edit mode) */
  initialLocked?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Escribe la dirección...",
  className,
  error,
  initialLocked = false,
}: AddressAutocompleteProps) {
  const { query, setQuery, results, loading } = useGeocoder({ debounceMs: 300 });
  const [open,   setOpen]   = useState(false);
  // Start locked when editing an existing venue that already has coordinates
  const [locked, setLocked] = useState(initialLocked);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value → query only on mount / when value changes externally
  useEffect(() => {
    if (!locked) setQuery(value);
  }, [value, locked]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setLocked(false);
    setOpen(true);
    setQuery(v);
    onChange(v);
  }

  function handleSelect(result: GeoResult) {
    setLocked(true);
    setOpen(false);
    setQuery(result.address);
    onChange(result.address);
    onSelect(result);
  }

  function handleClear() {
    setLocked(false);
    setOpen(false);
    setQuery("");
    onChange("");
  }

  const showDropdown = open && query.length >= 3 && (loading || results.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "flex h-10 w-full rounded-lg border bg-background pl-9 pr-8 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            error ? "border-destructive" : "border-input",
            className
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {query && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          {loading && results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Buscando...
            </div>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors flex items-start gap-3"
                    onClick={() => handleSelect(r)}
                  >
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.address.split(",")[0]}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.address.split(",").slice(1).join(",").trim()}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
