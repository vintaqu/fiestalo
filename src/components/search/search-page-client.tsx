"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal, Map, LayoutGrid, X,
  Loader2, MapPin, Navigation, Search,
} from "lucide-react";
import { VenueCard } from "@/components/venue/venue-card";
import { VenueCardSkeleton } from "@/components/venue/venue-card-skeleton";
import { SearchFilters } from "@/components/search/search-filters";
import { VenueMap } from "@/components/map/venue-map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGeocoder, type GeoResult } from "@/hooks/use-geocoder";

interface FilterOptions {
  categories: Array<{ id: string; name: string; icon?: string | null; slug: string }>;
  amenities:  Array<{ id: string; name: string; icon?: string | null; category?: string | null }>;
}

interface SearchPageClientProps {
  initialSearchParams: Record<string, string>;
  filterOptions:       FilterOptions;
}

async function fetchVenues(params: Record<string, string>) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
  );
  const qs  = new URLSearchParams(clean).toString();
  const res = await fetch(`/api/venues?${qs}`);
  if (!res.ok) throw new Error("Error buscando espacios");
  return res.json();
}

// Human-readable labels for active filter chips
const FILTER_LABELS: Record<string, (v: string) => string> = {
  minPrice:    (v) => `Desde ${v}€/h`,
  maxPrice:    (v) => `Hasta ${v}€/h`,
  minCapacity: (v) => `${v}+ personas`,
  bookingType: (v) => v === "INSTANT" ? "Reserva instantánea" : "Bajo solicitud",
  isAccessible:(v) => "Accesible",
  hasParking:  (v) => "Con parking",
  allowsPets:  (v) => "Mascotas OK",
  allowsMusic: (v) => "Música permitida",
  isOutdoor:   (v) => "Exterior",
  minRating:   (v) => `★ ${v}+`,
  date:        (v) => v,
  startTime:   (v) => `Desde ${v}`,
  endTime:     (v) => `Hasta ${v}`,
};

export function SearchPageClient({
  initialSearchParams,
  filterOptions,
}: SearchPageClientProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [showMap,        setShowMap]        = useState(true);
  const [showFilters,    setShowFilters]    = useState(false);
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);
  const [favorites,      setFavorites]      = useState<Set<string>>(new Set());

  // Text search
  const [textInput, setTextInput] = useState(searchParams.get("q") ?? "");

  // Location search
  const [locationLabel,  setLocationLabel]  = useState(searchParams.get("city") ?? "");
  const [locDropdown,    setLocDropdown]    = useState(false);
  const locRef = useRef<HTMLDivElement>(null);

  const { query, setQuery, results: geoResults, loading: geoLoading } =
    useGeocoder({ debounceMs: 280, minChars: 2 });

  // Close location dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!locRef.current?.contains(e.target as Node)) setLocDropdown(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const params  = Object.fromEntries(searchParams.entries());
  const hasGeo  = !!(params.lat && params.lng);

  // Fetch venues
  const { data, isLoading, isFetching } = useQuery({
    queryKey:        ["venues", params],
    queryFn:         () => fetchVenues(params),
    placeholderData: (prev) => prev,
    staleTime:       30_000,
  });

  const venues      = data?.data ?? [];
  const total       = data?.meta?.total ?? 0;
  const hasNextPage = data?.meta?.hasNextPage ?? false;

  // Update URL with new params
  function updateSearch(updates: Record<string, string | undefined>) {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === "") current.delete(k);
      else current.set(k, v);
    });
    current.delete("page");
    router.push(`/search?${current.toString()}`, { scroll: false });
  }

  // Submit text search
  function handleTextSearch(e: React.FormEvent) {
    e.preventDefault();
    updateSearch({ q: textInput.trim() || undefined });
  }

  // Location handlers
  function handleLocationInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setLocationLabel(v);
    setQuery(v);
    setLocDropdown(true);
  }

  function handleSelectLocation(r: GeoResult) {
    setLocationLabel(r.city || r.address.split(",")[0]);
    setLocDropdown(false);
    setQuery("");
    updateSearch({
      city:   r.city || r.address.split(",")[0],
      lat:    String(r.latitude),
      lng:    String(r.longitude),
      sortBy: "distance",
    });
  }

  function handleLocationKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (geoResults.length > 0) handleSelectLocation(geoResults[0]);
      else {
        updateSearch({ city: locationLabel, lat: undefined, lng: undefined });
        setLocDropdown(false);
      }
    }
    if (e.key === "Escape") setLocDropdown(false);
  }

  function clearLocation() {
    setLocationLabel("");
    setQuery("");
    updateSearch({ city: undefined, lat: undefined, lng: undefined, sortBy: undefined });
  }

  function handleLocateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      updateSearch({ lat: String(latitude), lng: String(longitude), sortBy: "distance", city: undefined });
      setLocationLabel("Mi ubicación actual");
    }, () => {});
  }

  // Active filter chips (exclude geo/sort/pagination/q from chips — they have their own UI)
  const CHIP_KEYS = [
    "date","startTime","endTime",
    "minPrice","maxPrice","minCapacity","categoryId",
    "bookingType","isAccessible","hasParking","allowsPets",
    "allowsMusic","isOutdoor","minRating","amenityIds",
  ];

  const activeChips = CHIP_KEYS.flatMap((key) => {
    const val = params[key];
    if (!val) return [];
    if (key === "categoryId") {
      const cat = filterOptions.categories.find((c) => c.id === val);
      return cat ? [{ key, label: `${cat.icon ?? ""} ${cat.name}`.trim() }] : [];
    }
    if (key === "amenityIds") {
      const ids = val.split(",").filter(Boolean);
      return [{ key, label: `${ids.length} instalación${ids.length !== 1 ? "es" : ""}` }];
    }
    const labelFn = FILTER_LABELS[key];
    return labelFn ? [{ key, label: labelFn(val) }] : [{ key, label: `${key}: ${val}` }];
  });

  const activeFilterCount = activeChips.length;

  const showLocDropdown = locDropdown && query.length >= 2 && (geoLoading || geoResults.length > 0);

  async function toggleFavorite(venueId: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(venueId) ? next.delete(venueId) : next.add(venueId);
      return next;
    });
    try { await fetch(`/api/favorites/${venueId}`, { method: "POST" }); } catch {}
  }

  return (
    <div className="flex flex-col h-screen pt-16">

      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-16 z-30">
        <div className="px-4 py-3 flex items-center gap-2 flex-wrap">

          {/* Text search */}
          <form onSubmit={handleTextSearch} className="relative hidden sm:flex items-center flex-1 max-w-xs min-w-[180px]">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Buscar espacios..."
              className="w-full h-9 pl-8 pr-8 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {textInput && (
              <button
                type="button"
                onClick={() => { setTextInput(""); updateSearch({ q: undefined }); }}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </form>

          {/* Location */}
          <div ref={locRef} className="relative hidden md:block w-56">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={locationLabel}
              onChange={handleLocationInput}
              onFocus={() => geoResults.length > 0 && setLocDropdown(true)}
              onKeyDown={handleLocationKeyDown}
              placeholder="Ciudad o dirección..."
              autoComplete="off"
              className="w-full h-9 pl-7 pr-14 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {geoLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              {locationLabel && !geoLoading && (
                <button type="button" onClick={clearLocation} className="text-muted-foreground hover:text-foreground p-0.5">
                  <X className="w-3 h-3" />
                </button>
              )}
              <button type="button" onClick={handleLocateMe} title="Usar mi ubicación" className="text-muted-foreground hover:text-primary p-0.5 ml-0.5">
                <Navigation className="w-3 h-3" />
              </button>
            </div>
            {showLocDropdown && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                {geoLoading && geoResults.length === 0 ? (
                  <div className="px-3 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                  </div>
                ) : (
                  <ul>
                    {geoResults.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-secondary transition-colors flex items-start gap-2"
                          onClick={() => handleSelectLocation(r)}
                        >
                          <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate">{r.address.split(",")[0]}</p>
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
          </div>

          {/* Filters button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Sort */}
          <select
            value={params.sortBy ?? "relevance"}
            onChange={(e) => updateSearch({ sortBy: e.target.value })}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
          >
            {hasGeo && <option value="distance">Por distancia</option>}
            <option value="relevance">Relevancia</option>
            <option value="price_asc">Precio ↑</option>
            <option value="price_desc">Precio ↓</option>
            <option value="rating">Mejor valorados</option>
            <option value="newest">Más recientes</option>
          </select>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {!isLoading && (
              <span className="text-sm text-muted-foreground hidden lg:flex items-center gap-1">
                {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <strong>{total.toLocaleString("es-ES")}</strong> espacios
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMap(!showMap)}
              className="gap-2 hidden md:flex"
            >
              {showMap ? <><LayoutGrid className="w-4 h-4" />Lista</> : <><Map className="w-4 h-4" />Mapa</>}
            </Button>
          </div>
        </div>

        {/* Active filter chips */}
        {(activeChips.length > 0 || params.q) && (
          <div className="px-4 pb-2.5 flex flex-wrap gap-1.5">
            {params.q && (
              <Badge variant="secondary" className="gap-1 text-xs h-6">
                <Search className="w-3 h-3" />
                "{params.q}"
                <button onClick={() => { setTextInput(""); updateSearch({ q: undefined }); }}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {activeChips.map(({ key, label }) => (
              <Badge key={key} variant="secondary" className="gap-1 text-xs h-6">
                {label}
                <button onClick={() => {
                  if (key === "amenityIds") updateSearch({ amenityIds: undefined });
                  else updateSearch({ [key]: undefined });
                }}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {(activeChips.length > 1 || params.q) && (
              <button
                onClick={() => {
                  setTextInput("");
                  const clear: Record<string, undefined> = {};
                  CHIP_KEYS.forEach((k) => (clear[k] = undefined));
                  clear.q = undefined;
                  updateSearch(clear);
                }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors underline"
              >
                Limpiar todo
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Filter drawer ────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-background/98 z-20"
          >
            <div className="max-w-7xl mx-auto px-4 py-5">
              <SearchFilters
                params={params}
                onUpdate={updateSearch}
                categories={filterOptions.categories}
                amenities={filterOptions.amenities}
                onClose={() => setShowFilters(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Venue grid */}
        <div className={cn("overflow-y-auto flex-1 p-4", showMap ? "md:max-w-[55%]" : "w-full")}>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <VenueCardSkeleton key={i} />)}
            </div>
          ) : venues.length === 0 ? (
            <EmptyState
              hasFilters={activeFilterCount > 0 || !!params.q || !!params.city}
              onClear={() => router.push("/search")}
              query={params.q}
              city={params.city}
              date={params.date}
            />
          ) : (
            <>
              {hasGeo && params.sortBy === "distance" && (
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  Por distancia a <strong>{params.city || "tu ubicación"}</strong>
                </p>
              )}
              {params.date && (
                <p className="text-xs text-emerald-600 mb-3 flex items-center gap-1">
                  ✓ Disponibles el {params.date}{params.startTime ? ` de ${params.startTime}` : ""}{params.endTime ? ` a ${params.endTime}` : ""}
                </p>
              )}
              <div className={cn(
                "grid gap-4",
                showMap
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              )}>
                {venues.map((venue: any, i: number) => (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    isFavorite={favorites.has(venue.id)}
                    onToggleFavorite={toggleFavorite}
                    isHovered={hoveredVenueId === venue.id}
                    onHover={setHoveredVenueId}
                    index={i}
                  />
                ))}
              </div>

              {hasNextPage && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => updateSearch({ page: String(Number(params.page ?? "1") + 1) })}
                    disabled={isFetching}
                    className="gap-2"
                  >
                    {isFetching && <Loader2 className="w-4 h-4 animate-spin" />}
                    Ver más espacios
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Map panel */}
        {showMap && (
          <div className="hidden md:block flex-1 sticky top-0 h-full">
            <VenueMap
              venues={venues}
              hoveredId={hoveredVenueId}
              onVenueHover={setHoveredVenueId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  hasFilters, onClear, query, city, date,
}: {
  hasFilters: boolean;
  onClear:    () => void;
  query?:     string;
  city?:      string;
  date?:      string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
      <div className="text-5xl mb-4">
        {date ? "📅" : city ? "📍" : query ? "🔍" : "🏢"}
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {date
          ? "Sin disponibilidad en esta fecha"
          : query
          ? `Sin resultados para "${query}"`
          : "No encontramos salas de fiestas"}
      </h3>
      <p className="text-muted-foreground text-sm mb-6">
        {date
          ? "Prueba con otra fecha, un horario diferente o amplía los filtros."
          : city
          ? `No hay espacios activos cerca de ${city}. Prueba una ciudad diferente o amplía el radio.`
          : hasFilters
          ? "Los filtros actuales son demasiado restrictivos. Prueba a eliminar alguno."
          : "Aún no hay espacios disponibles. ¡Vuelve pronto!"}
      </p>
      {hasFilters && (
        <Button variant="outline" onClick={onClear}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
