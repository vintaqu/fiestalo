"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatShortDate } from "@/utils/format";

interface PendingVenuesPanelProps {
  venues: Array<{
    id: string;
    title: string;
    city: string;
    createdAt: Date | string;
    category?: { name: string } | null;
    owner: { name?: string | null; email: string };
    images: Array<{ url: string }>;
  }>;
}

export function PendingVenuesPanel({ venues: initial }: PendingVenuesPanelProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [venues, setVenues] = useState(initial);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function handleAction(venueId: string, action: "approve" | "reject") {
    setLoading((p) => ({ ...p, [venueId]: true }));
    try {
      const res = await fetch(`/api/admin/venues/${venueId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      setVenues((p) => p.filter((v) => v.id !== venueId));
      toast({
        title: action === "approve" ? "Espacio aprobado" : "Espacio rechazado",
        description:
          action === "approve"
            ? "El espacio ya está activo en la plataforma."
            : "Se ha notificado al propietario.",
      });
      router.refresh();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, [venueId]: false }));
    }
  }

  if (venues.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <p className="text-emerald-500 text-3xl mb-2">✓</p>
        <p className="text-muted-foreground text-sm">Sin espacios pendientes</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="divide-y divide-border">
        {venues.map((venue) => (
          <div key={venue.id} className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors">
            {/* Thumbnail */}
            <div className="w-16 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
              {venue.images[0] ? (
                <Image
                  src={venue.images[0].url}
                  alt={venue.title}
                  width={64}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">🏢</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{venue.title}</p>
              <p className="text-xs text-muted-foreground">
                {venue.city} · {venue.category?.name} · {venue.owner.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Enviado {formatShortDate(venue.createdAt)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                asChild
              >
                <a href={`/admin/venues/${venue.id}`} target="_blank">
                  <Eye className="w-3.5 h-3.5" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleAction(venue.id, "reject")}
                disabled={loading[venue.id]}
              >
                {loading[venue.id] ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Rechazar
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleAction(venue.id, "approve")}
                disabled={loading[venue.id]}
              >
                {loading[venue.id] ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                Aprobar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
