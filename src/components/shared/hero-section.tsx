"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, MapPin, Calendar, Users, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGeocoder, type GeoResult } from "@/hooks/use-geocoder";

export function HeroSection() {
  const router = useRouter();

  const [locationLabel, setLocationLabel] = useState("");
  const [geoResult,     setGeoResult]     = useState<GeoResult | null>(null);
  const [date,   setDate]   = useState("");
  const [guests, setGuests] = useState("");
  const [dropdownOpen, setDropdownOpen]   = useState(false);

  const { query, setQuery, results, loading } = useGeocoder({ debounceMs: 300, minChars: 2 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleLocationInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setLocationLabel(v);
    setGeoResult(null);
    setQuery(v);
    setDropdownOpen(true);
  }

  function handleSelectResult(r: GeoResult) {
    setGeoResult(r);
    setLocationLabel(r.city || r.address.split(",")[0]);
    setDropdownOpen(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (geoResult) {
      params.set("lat",    String(geoResult.latitude));
      params.set("lng",    String(geoResult.longitude));
      params.set("city",   geoResult.city || locationLabel);
      params.set("sortBy", "distance");
    } else if (locationLabel.trim()) {
      params.set("city", locationLabel.trim());
    }
    if (date)   params.set("date", date);
    if (guests) params.set("minCapacity", guests);
    router.push(`/search?${params.toString()}`);
  }

  const showDropdown = dropdownOpen && query.length >= 2 && (loading || results.length > 0);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background — festive party atmosphere */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1920&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/65" />

      {/* Floating confetti-like decorations */}
      <div className="absolute top-20 left-10 text-4xl opacity-20 animate-bounce" style={{ animationDelay: "0s" }}>🎈</div>
      <div className="absolute top-32 right-16 text-3xl opacity-20 animate-bounce" style={{ animationDelay: "0.5s" }}>🎉</div>
      <div className="absolute bottom-32 left-20 text-3xl opacity-20 animate-bounce" style={{ animationDelay: "1s" }}>🎊</div>
      <div className="absolute bottom-24 right-12 text-4xl opacity-20 animate-bounce" style={{ animationDelay: "1.5s" }}>⭐</div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6 mt-16 sm:mt-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-white/90 text-sm font-medium">
              +500 salas de fiestas disponibles en España
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            La sala perfecta para
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-amber-300">
              ¡la mejor fiesta! 🎂
            </span>
          </h1>

          <p className="text-white/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Encuentra y reserva salas de fiestas infantiles, salones de celebraciones
            y espacios temáticos. Por horas, sin complicaciones.
          </p>
        </motion.div>

        {/* Search box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
        >
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-2xl p-2 flex flex-col sm:flex-row gap-2"
          >
            {/* Location */}
            <div ref={containerRef} className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <input
                type="text"
                placeholder="¿En qué ciudad buscas?"
                value={locationLabel}
                onChange={handleLocationInput}
                onFocus={() => results.length > 0 && setDropdownOpen(true)}
                autoComplete="off"
                className="w-full pl-9 pr-8 border-0 shadow-none text-sm h-12 focus:outline-none bg-transparent placeholder:text-muted-foreground text-foreground"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                {locationLabel && !loading && (
                  <button type="button" onClick={() => { setLocationLabel(""); setGeoResult(null); setQuery(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {showDropdown && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden text-left">
                  {loading && results.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />Buscando...
                    </div>
                  ) : (
                    <ul>
                      {results.map((r) => (
                        <li key={r.id}>
                          <button type="button" className="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors flex items-start gap-3" onClick={() => handleSelectResult(r)}>
                            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{r.address.split(",")[0]}</p>
                              <p className="text-xs text-muted-foreground truncate">{r.address.split(",").slice(1).join(",").trim()}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="hidden sm:block w-px bg-border self-stretch my-2" />

            {/* Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="pl-9 border-0 shadow-none text-sm h-12 focus-visible:ring-0 bg-transparent w-full sm:w-44"
                min={new Date().toISOString().split("T")[0]} />
            </div>

            <div className="hidden sm:block w-px bg-border self-stretch my-2" />

            {/* Guests */}
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="number" placeholder="Personas" value={guests} onChange={(e) => setGuests(e.target.value)}
                min={1} className="pl-9 border-0 shadow-none text-sm h-12 focus-visible:ring-0 bg-transparent w-full sm:w-32" />
            </div>

            <Button type="submit" size="lg" className="h-12 px-8 rounded-xl text-sm font-semibold shrink-0">
              <Search className="w-4 h-4 mr-2" />Buscar sala
            </Button>
          </form>

          {/* Quick links */}
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            {["🎂 Cumpleaños infantil", "👨‍👩‍👧‍👦 Celebración familiar", "🏰 Espacio temático", "🌳 Con jardín", "🤹 Con animadores"].map((tag) => (
              <button key={tag} type="button"
                onClick={() => router.push(`/search?q=${encodeURIComponent(tag.replace(/^[^\s]+\s/, ""))}`)}
                className="text-white/80 text-sm border border-white/25 rounded-full px-4 py-1.5 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm">
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.5 }}
          className="flex justify-center gap-8 mt-16">
          {[
            { value: "500+",  label: "Salas verificadas" },
            { value: "30+",   label: "Ciudades" },
            { value: "98%",   label: "Familias satisfechas" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-white/60 text-sm">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
