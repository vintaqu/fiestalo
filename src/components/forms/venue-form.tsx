"use client";

import { useState, useEffect } from "react";
import { Loader2, MapPin } from "lucide-react";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import type { GeoResult } from "@/hooks/use-geocoder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

interface Amenity {
  id: string;
  name: string;
  icon?: string | null;
  category?: string | null;
}

interface VenueFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  loading: boolean;
  mode: "create" | "edit";
  initialData?: Record<string, unknown>;
  categories?: Category[];
  amenities?: Amenity[];
}

const BOOKING_TYPES = [
  { value: "INSTANT", label: "Reserva instantánea", desc: "Se confirma automáticamente" },
  { value: "REQUEST", label: "Bajo solicitud", desc: "Tú apruebas cada reserva" },
];

export function VenueForm({
  onSubmit,
  loading,
  mode,
  initialData = {},
  categories = [],
  amenities = [],
}: VenueFormProps) {
  const [cats, setCats] = useState<Category[]>(categories);
  const [ams, setAms] = useState<Amenity[]>(amenities);

  // Load categories/amenities if not passed (create mode)
  useEffect(() => {
    if (cats.length === 0) {
      fetch("/api/categories").then((r) => r.json()).then((d) => setCats(d.data ?? [])).catch(() => {});
    }
    if (ams.length === 0) {
      fetch("/api/amenities").then((r) => r.json()).then((d) => setAms(d.data ?? [])).catch(() => {});
    }
  }, []);

  // Coerce Prisma Decimal fields to JS numbers (Prisma returns them as Decimal objects)
  const toNum = (v: unknown, fallback: number) =>
    v !== undefined && v !== null ? Number(v) : fallback;

  const [form, setForm] = useState({
    title:            (initialData.title as string) ?? "",
    description:      (initialData.description as string) ?? "",
    shortDescription: (initialData.shortDescription as string) ?? "",
    address:          (initialData.address as string) ?? "",
    city:             (initialData.city as string) ?? "",
    postalCode:       (initialData.postalCode as string) ?? "",
    country:          (initialData.country as string) ?? "ES",
    latitude:         toNum(initialData.latitude, 40.4168),
    longitude:        toNum(initialData.longitude, -3.7038),
    categoryId:       (initialData.categoryId as string) ?? "",
    capacity:         toNum(initialData.capacity, 10),
    minHours:         toNum(initialData.minHours, 1),
    pricePerHour:     toNum(initialData.pricePerHour, 50),
    cleaningFee:      toNum(initialData.cleaningFee, 0),
    bookingType:      (initialData.bookingType as string) ?? "INSTANT",
    isIndoor:         (initialData.isIndoor as boolean) ?? true,
    isOutdoor:        (initialData.isOutdoor as boolean) ?? false,
    hasParking:       (initialData.hasParking as boolean) ?? false,
    isAccessible:     (initialData.isAccessible as boolean) ?? false,
    allowsPets:       (initialData.allowsPets as boolean) ?? false,
    allowsMusic:      (initialData.allowsMusic as boolean) ?? false,
    houseRules:       (initialData.houseRules as string) ?? "",
    amenityIds:       (initialData.amenityIds as string[]) ?? [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(key: string, value: unknown) {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: "" }));
  }

  function toggleAmenity(id: string) {
    setForm((p) => ({
      ...p,
      amenityIds: p.amenityIds.includes(id)
        ? p.amenityIds.filter((a) => a !== id)
        : [...p.amenityIds, id],
    }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title.trim() || form.title.length < 5) errs.title = "Mínimo 5 caracteres";
    if (!form.description.trim() || form.description.length < 50)
      errs.description = "Mínimo 50 caracteres";
    if (!form.address.trim()) errs.address = "La dirección es obligatoria";
    if (!form.city.trim()) errs.city = "La ciudad es obligatoria";
    if (form.capacity < 1) errs.capacity = "Mínimo 1 persona";
    if (form.pricePerHour <= 0) errs.pricePerHour = "El precio debe ser positivo";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    // Strip empty strings from optional FK fields so Prisma never receives ""
    const payload = {
      ...form,
      categoryId: form.categoryId || undefined,
    };
    await onSubmit(payload as Record<string, unknown>);
  }

  const flagOptions = [
    { key: "isIndoor", label: "🏠 Interior" },
    { key: "isOutdoor", label: "🌿 Exterior" },
    { key: "hasParking", label: "🚗 Parking" },
    { key: "isAccessible", label: "♿ Accesible" },
    { key: "allowsPets", label: "🐾 Mascotas" },
    { key: "allowsMusic", label: "🎵 Música" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic info */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-base">Información básica</h2>

        <div className="space-y-1.5">
          <Label>Título del espacio *</Label>
          <Input
            placeholder="Ej: Sala de reuniones premium en el centro"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={errors.title ? "border-destructive" : ""}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Descripción corta</Label>
          <Input
            placeholder="Una frase que resuma tu espacio (max 200 chars)"
            value={form.shortDescription}
            onChange={(e) => set("shortDescription", e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Descripción completa * <span className="text-muted-foreground text-xs">(mín. 50 chars)</span></Label>
          <textarea
            rows={5}
            placeholder="Describe tu espacio en detalle: equipamiento, ambiente, usos ideales..."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={cn(
              "w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none",
              errors.description ? "border-destructive" : "border-input"
            )}
          />
          <div className="flex items-center justify-between">
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            <span className="text-xs text-muted-foreground ml-auto">{form.description.length}/5000</span>
          </div>
        </div>

        {cats.length > 0 && (
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <div className="flex flex-wrap gap-2">
              {cats.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => set("categoryId", form.categoryId === cat.id ? "" : cat.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-all",
                    form.categoryId === cat.id
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Location */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-base flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          Ubicación
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Dirección *</Label>
            <AddressAutocomplete
              value={form.address}
              onChange={(v) => set("address", v)}
              onSelect={(result: GeoResult) => {
                set("address",    result.address);
                set("city",       result.city);
                set("postalCode", result.postalCode);
                set("latitude",   result.latitude);
                set("longitude",  result.longitude);
              }}
              placeholder="Calle Mayor 12, Madrid..."
              error={errors.address}
              initialLocked={mode === "edit" && !!initialData.address}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ciudad *</Label>
            <Input
              placeholder="Se rellena al seleccionar dirección"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              className={errors.city ? "border-destructive" : ""}
            />
            {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Código postal</Label>
            <Input
              placeholder="Se rellena automáticamente"
              value={form.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              Latitud
              {form.latitude !== 40.4168 && (
                <span className="text-xs text-emerald-600 font-normal">✓ geocodificado</span>
              )}
            </Label>
            <Input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => set("latitude", parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              Longitud
              {form.longitude !== -3.7038 && (
                <span className="text-xs text-emerald-600 font-normal">✓ geocodificado</span>
              )}
            </Label>
            <Input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => set("longitude", parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Las coordenadas se rellenan automáticamente al seleccionar una dirección.
          Puedes ajustarlas manualmente si es necesario.
        </p>
      </section>

      {/* Pricing & specs */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-base">Precio y capacidad</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Precio por hora (€) *</Label>
            <Input
              type="number"
              min={1}
              step={0.5}
              value={form.pricePerHour}
              onChange={(e) => set("pricePerHour", parseFloat(e.target.value) || 0)}
              className={errors.pricePerHour ? "border-destructive" : ""}
            />
            {errors.pricePerHour && <p className="text-xs text-destructive">{errors.pricePerHour}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Tarifa de limpieza (€)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.cleaningFee}
              onChange={(e) => set("cleaningFee", parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Capacidad máxima (personas) *</Label>
            <Input
              type="number"
              min={1}
              max={10000}
              value={form.capacity}
              onChange={(e) => set("capacity", parseInt(e.target.value) || 1)}
              className={errors.capacity ? "border-destructive" : ""}
            />
            {errors.capacity && <p className="text-xs text-destructive">{errors.capacity}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Mínimo de horas</Label>
            <Input
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={form.minHours}
              onChange={(e) => set("minHours", parseFloat(e.target.value) || 1)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tipo de reserva</Label>
          <div className="grid grid-cols-2 gap-3">
            {BOOKING_TYPES.map((bt) => (
              <button
                key={bt.value}
                type="button"
                onClick={() => set("bookingType", bt.value)}
                className={cn(
                  "p-3 rounded-xl border-2 text-left transition-all",
                  form.bookingType === bt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <p className="text-sm font-medium">{bt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{bt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-base">Características</h2>
        <div className="flex flex-wrap gap-2">
          {flagOptions.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => set(key, !(form as Record<string, unknown>)[key])}
              className={cn(
                "text-sm px-3 py-1.5 rounded-full border-2 transition-all",
                (form as Record<string, unknown>)[key]
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/30"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Amenities */}
      {ams.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-base">Instalaciones incluidas</h2>
          <div className="flex flex-wrap gap-2">
            {ams.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAmenity(a.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border-2 transition-all",
                  form.amenityIds.includes(a.id)
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border hover:border-primary/30"
                )}
              >
                {a.icon && <span className="text-base">{a.icon}</span>}
                {a.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* House rules */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-base">Normas del espacio</h2>
        <textarea
          rows={3}
          placeholder="Ej: No fumar. Dejar el espacio recogido al finalizar."
          value={form.houseRules}
          onChange={(e) => set("houseRules", e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </section>

      {/* Submit */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          Podrás añadir fotos y publicar el espacio después de guardarlo.
        </p>
        <Button
          type="submit"
          disabled={loading}
          className="px-8"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === "create" ? (
            "Crear espacio"
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </div>
    </form>
  );
}
