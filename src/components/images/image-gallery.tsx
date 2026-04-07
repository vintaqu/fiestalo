"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Star, Trash2, GripVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

interface GalleryImage {
  id:           string;
  url:          string;
  cloudinaryId?: string | null;
  alt?:         string | null;
  isCover:      boolean;
  sortOrder:    number;
  width?:       number | null;
  height?:      number | null;
}

interface ImageGalleryProps {
  venueId:  string;
  images:   GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}

export function ImageGallery({ venueId, images, onChange }: ImageGalleryProps) {
  const { toast } = useToast();
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Drag state
  const dragIdx  = useRef<number | null>(null);
  const overIdx  = useRef<number | null>(null);

  // ── Drag & drop reorder ───────────────────────────────────────

  function onDragStart(e: React.DragEvent, idx: number) {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    // Chrome requires setData
    e.dataTransfer.setData("text/plain", String(idx));
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    overIdx.current = idx;
  }

  function onDrop(e: React.DragEvent, dropIdx: number) {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === dropIdx) return;

    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(dropIdx, 0, moved);

    // Re-assign sortOrders
    const reordered = next.map((img, i) => ({ ...img, sortOrder: i }));
    onChange(reordered);
    dragIdx.current  = null;
    overIdx.current = null;

    // Persist reorder
    saveOrder(reordered);
  }

  async function saveOrder(ordered: GalleryImage[]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/owner/spaces/${venueId}/images`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          images: ordered.map((img) => ({
            id:        img.id,
            sortOrder: img.sortOrder,
            isCover:   img.isCover,
          })),
        }),
      });
      if (!res.ok) throw new Error("Error guardando orden");
    } catch {
      toast({ title: "Error guardando el orden", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // ── Set cover ─────────────────────────────────────────────────

  async function setCover(targetId: string) {
    const next = images.map((img) => ({
      ...img,
      isCover: img.id === targetId,
    }));
    onChange(next);

    setSaving(true);
    try {
      const res = await fetch(`/api/owner/spaces/${venueId}/images`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          images: next.map((img) => ({
            id:        img.id,
            sortOrder: img.sortOrder,
            isCover:   img.isCover,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Portada actualizada" });
    } catch {
      toast({ title: "Error actualizando portada", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────

  async function deleteImage(imageId: string) {
    if (deleting) return;
    setDeleting(imageId);
    try {
      const res = await fetch(`/api/owner/spaces/${venueId}/images/${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      onChange(
        images
          .filter((img) => img.id !== imageId)
          .map((img, i) => ({ ...img, sortOrder: i }))
      );
      toast({ title: "Imagen eliminada" });
    } catch {
      toast({ title: "Error eliminando imagen", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  if (images.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground">
        <p className="text-sm">Aún no hay imágenes. Sube la primera foto arriba.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{images.length} imagen{images.length !== 1 ? "es" : ""} · Arrastra para reordenar</span>
        {saving && (
          <span className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Guardando...
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, idx) => (
          <div
            key={img.id}
            draggable
            onDragStart={(e) => onDragStart(e, idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDrop={(e) => onDrop(e, idx)}
            onDragEnd={() => { dragIdx.current = null; overIdx.current = null; }}
            className={cn(
              "group relative rounded-xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing aspect-[4/3] bg-muted",
              img.isCover ? "border-primary" : "border-transparent hover:border-border",
            )}
          >
            {/* Image */}
            <Image
              src={img.url}
              alt={img.alt ?? ""}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />

            {/* Cover badge */}
            {img.isCover && (
              <div className="absolute top-2 left-2 bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-white" />
                Portada
              </div>
            )}

            {/* Drag handle */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg p-1">
              <GripVertical className="w-4 h-4 text-white" />
            </div>

            {/* Action overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-2 gap-2 opacity-0 group-hover:opacity-100">
              {/* Set as cover */}
              {!img.isCover && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs px-2 bg-white/90 hover:bg-white text-foreground"
                  onClick={(e) => { e.stopPropagation(); setCover(img.id); }}
                  disabled={saving}
                >
                  <Star className="w-3 h-3 mr-1" />
                  Portada
                </Button>
              )}

              {/* Delete */}
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs px-2 ml-auto"
                onClick={(e) => { e.stopPropagation(); deleteImage(img.id); }}
                disabled={!!deleting}
              >
                {deleting === img.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        La imagen marcada como <strong>Portada</strong> aparece en las búsquedas y en la cabecera del espacio.
      </p>
    </div>
  );
}
