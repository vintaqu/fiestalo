"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X, Star } from "lucide-react";

interface Category { id: string; name: string; icon?: string | null; }
interface Amenity  { id: string; name: string; icon?: string | null; category?: string | null; }

interface SearchFiltersProps {
  params:     Record<string, string>;
  onUpdate:   (updates: Record<string, string | undefined>) => void;
  categories: Category[];
  amenities:  Amenity[];
  onClose:    () => void;
}

const CAT_LABELS: Record<string, string> = {
  tech:    "Tecnología",
  comfort: "Comodidades",
  access:  "Acceso",
  outdoor: "Exterior",
  other:   "Otros",
};

export function SearchFilters({
  params, onUpdate, categories, amenities, onClose,
}: SearchFiltersProps) {
  const [price, setPrice] = useState<[number, number]>([
    Number(params.minPrice ?? 0),
    Number(params.maxPrice ?? 500),
  ]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    params.amenityIds ? params.amenityIds.split(",").filter(Boolean) : []
  );
  const [capacityInput, setCapacityInput] = useState(params.minCapacity ?? "");

  function toggleAmenity(id: string) {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function applyFilters() {
    onUpdate({
      minPrice:   price[0] > 0 ? String(price[0]) : undefined,
      maxPrice:   price[1] < 500 ? String(price[1]) : undefined,
      amenityIds: selectedAmenities.length > 0 ? selectedAmenities.join(",") : undefined,
      minCapacity: capacityInput ? String(capacityInput) : undefined,
    });
    onClose();
  }

  function clearAll() {
    setPrice([0, 500]);
    setSelectedAmenities([]);
    setCapacityInput("");
    onUpdate({
      minPrice: undefined, maxPrice: undefined,
      amenityIds: undefined, categoryId: undefined,
      bookingType: undefined, isAccessible: undefined,
      hasParking: undefined, allowsPets: undefined,
      allowsMusic: undefined, isOutdoor: undefined,
      minRating: undefined, minCapacity: undefined,
      date: undefined, startTime: undefined, endTime: undefined,
    });
    onClose();
  }

  const amenityGroups = amenities.reduce((acc, a) => {
    const cat = a.category ?? "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {} as Record<string, Amenity[]>);

  const activeCount = [
    params.minPrice, params.maxPrice, params.minCapacity,
    params.categoryId, params.amenityIds, params.bookingType,
    params.isAccessible, params.hasParking, params.allowsPets,
    params.allowsMusic, params.isOutdoor, params.minRating,
    params.date,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Filtros</h3>
          {activeCount > 0 && (
            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
              {activeCount} activos
            </span>
          )}
        </div>
        <button
          onClick={clearAll}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Limpiar todo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* ── Fecha y hora ─────────────────────────────────── */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Fecha y horario</Label>
          <div className="space-y-2">
            <Input
              type="date"
              value={params.date ?? ""}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => onUpdate({ date: e.target.value || undefined })}
              className="h-9 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Inicio</label>
                <Input
                  type="time"
                  value={params.startTime ?? ""}
                  onChange={(e) => onUpdate({ startTime: e.target.value || undefined })}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fin</label>
                <Input
                  type="time"
                  value={params.endTime ?? ""}
                  onChange={(e) => onUpdate({ endTime: e.target.value || undefined })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            {params.date && (
              <p className="text-xs text-emerald-600">
                ✓ Solo espacios disponibles
              </p>
            )}
          </div>
        </div>

        {/* ── Precio ───────────────────────────────────────── */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Precio/hora: {price[0]}€ – {price[1] >= 500 ? "500€+" : `${price[1]}€`}
          </Label>
          <Slider
            min={0} max={500} step={5}
            value={price}
            onValueChange={(v) => setPrice(v as [number, number])}
            className="py-2"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Mín."
              value={price[0] || ""}
              onChange={(e) => setPrice([Number(e.target.value) || 0, price[1]])}
              className="h-8 text-xs"
              min={0} max={price[1]}
            />
            <Input
              type="number"
              placeholder="Máx."
              value={price[1] >= 500 ? "" : price[1]}
              onChange={(e) => setPrice([price[0], Number(e.target.value) || 500])}
              className="h-8 text-xs"
              min={price[0]}
            />
          </div>
        </div>

        {/* ── Tipo y opciones ───────────────────────────────── */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Opciones</Label>
          <div className="space-y-2.5">
            {[
              { key: "bookingType",  label: "Reserva instantánea", value: "INSTANT" },
              { key: "hasParking",   label: "Con parking",         value: "true" },
              { key: "isAccessible", label: "Accesible",           value: "true" },
              { key: "allowsPets",   label: "Mascotas OK",         value: "true" },
              { key: "allowsMusic",  label: "Música permitida",    value: "true" },
              { key: "isOutdoor",    label: "Exterior",            value: "true" },
            ].map(({ key, label, value }) => (
              <div key={key} className="flex items-center gap-2">
                <Switch
                  id={`filter-${key}`}
                  checked={params[key] === value}
                  onCheckedChange={(checked) =>
                    onUpdate({ [key]: checked ? value : undefined })
                  }
                />
                <Label htmlFor={`filter-${key}`} className="text-sm cursor-pointer font-normal">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* ── Capacidad y valoración ────────────────────────── */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Capacidad mínima</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[1, 5, 10, 20, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    const val = params.minCapacity === String(n) ? undefined : String(n);
                    setCapacityInput(val ?? "");
                    onUpdate({ minCapacity: val });
                  }}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-all",
                    params.minCapacity === String(n)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {n}+
                </button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="O escribe un número..."
              value={capacityInput}
              onChange={(e) => setCapacityInput(e.target.value)}
              className="h-8 text-xs"
              min={1}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Valoración mínima</Label>
            <div className="flex gap-1">
              {[3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() =>
                    onUpdate({ minRating: params.minRating === String(r) ? undefined : String(r) })
                  }
                  className={cn(
                    "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all",
                    params.minRating === String(r)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Star className="w-3 h-3 fill-current" />
                  {r}+
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tipo de espacio ───────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tipo de espacio</Label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                onUpdate({ categoryId: params.categoryId === cat.id ? undefined : cat.id })
              }
              className={cn(
                "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all",
                params.categoryId === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary/50 hover:bg-secondary"
              )}
            >
              {cat.icon && <span className="text-sm leading-none">{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Amenities ─────────────────────────────────────────── */}
      {Object.keys(amenityGroups).length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Instalaciones y servicios</Label>
          <div className="space-y-3">
            {Object.entries(amenityGroups).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                  {CAT_LABELS[cat] ?? cat}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => toggleAmenity(a.id)}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-all",
                        selectedAmenities.includes(a.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/50 hover:bg-secondary"
                      )}
                    >
                      {a.icon && <span>{a.icon}</span>}
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        <Button onClick={applyFilters}>
          Aplicar filtros
          {selectedAmenities.length > 0 || capacityInput
            ? ` (${[selectedAmenities.length > 0, !!capacityInput].filter(Boolean).length} pendientes)`
            : ""}
        </Button>
      </div>
    </div>
  );
}
