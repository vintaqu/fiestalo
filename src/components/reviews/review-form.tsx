"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  bookingId: string;
  venue: { id: string; title: string; city: string };
}

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md" | "lg";
}

function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              sizes[size],
              (hover || value) >= star
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: "Muy malo",
  2: "Malo",
  3: "Regular",
  4: "Bueno",
  5: "Excelente",
};

const SUB_RATINGS = [
  { key: "cleanlinessRating",    label: "Limpieza",      icon: "🧹" },
  { key: "locationRating",       label: "Ubicación",     icon: "📍" },
  { key: "valueRating",          label: "Relación calidad/precio", icon: "💰" },
  { key: "communicationRating",  label: "Comunicación",  icon: "💬" },
] as const;

export function ReviewForm({ bookingId, venue }: ReviewFormProps) {
  const router    = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [rating,   setRating]   = useState(0);
  const [comment,  setComment]  = useState("");
  const [subRatings, setSubRatings] = useState<Record<string, number>>({
    cleanlinessRating:   0,
    locationRating:      0,
    valueRating:         0,
    communicationRating: 0,
  });

  function setSubRating(key: string, value: number) {
    setSubRatings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (rating === 0) {
      toast({ title: "Selecciona una valoración global", variant: "destructive" });
      return;
    }
    if (comment.trim().length < 20) {
      toast({ title: "El comentario debe tener al menos 20 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          bookingId,
          rating,
          comment: comment.trim(),
          ...Object.fromEntries(
            Object.entries(subRatings).filter(([, v]) => v > 0)
          ),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error enviando reseña");

      toast({ title: "¡Reseña enviada! Gracias por tu valoración." });
      router.push(`/tenant/bookings/${bookingId}`);
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Global rating */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-semibold">Valoración global</h2>

        <div className="flex flex-col items-center gap-3 py-4">
          <StarRating value={rating} onChange={setRating} size="lg" />
          {rating > 0 && (
            <p className="text-sm font-medium text-amber-600">
              {RATING_LABELS[rating]}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">
            Cuéntanos tu experiencia <span className="text-destructive">*</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="¿Cómo fue el espacio? ¿Lo recomendarías? Cuéntanos los detalles..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {comment.length}/2000 · mín. 20 caracteres
          </p>
        </div>
      </div>

      {/* Sub-ratings */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-semibold">Valoraciones detalladas <span className="text-muted-foreground font-normal text-sm">(opcional)</span></h2>
        <div className="space-y-4">
          {SUB_RATINGS.map(({ key, label, icon }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm flex items-center gap-2">
                <span>{icon}</span>
                {label}
              </span>
              <StarRating
                value={subRatings[key]}
                onChange={(v) => setSubRating(key, v)}
                size="sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={loading || rating === 0}>
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</>
          ) : (
            "Publicar reseña"
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Tu reseña será visible públicamente en el perfil del espacio tras ser validada.
      </p>
    </form>
  );
}
