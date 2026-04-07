"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { VenueForm } from "@/components/forms/venue-form";
import { SpaceImagesTab } from "@/components/images/space-images-tab";
import { cn } from "@/lib/utils";

interface SpaceEditClientProps {
  venue: Record<string, unknown>;
  categories: Array<{ id: string; name: string; icon?: string | null }>;
  amenities: Array<{ id: string; name: string; icon?: string | null; category?: string | null }>;
}

type Tab = "info" | "photos";

export function SpaceEditClient({ venue, categories, amenities }: SpaceEditClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("info");

  const amenityIds = Array.isArray(venue.amenities)
    ? (venue.amenities as Array<{ amenity: { id: string } }>).map((a) => a.amenity.id)
    : [];

  const images = Array.isArray(venue.images)
    ? (venue.images as Array<{
        id: string;
        url: string;
        cloudinaryId?: string | null;
        alt?: string | null;
        isCover: boolean;
        sortOrder: number;
        width?: number | null;
        height?: number | null;
      }>)
    : [];

  async function handleSubmit(formData: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/spaces/${venue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");

      toast({ title: "Cambios guardados correctamente" });
      router.push("/owner/spaces");
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
      setLoading(false);
    }
  }

  const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: "info",   label: "Información",  icon: <FileText className="w-4 h-4" /> },
    { id: "photos", label: `Fotos (${images.length})`, icon: <ImageIcon className="w-4 h-4" /> },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/owner/spaces">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar espacio</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{venue.title as string}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl mb-8 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "info" ? (
        <VenueForm
          onSubmit={handleSubmit}
          loading={loading}
          mode="edit"
          initialData={{ ...venue, amenityIds }}
          categories={categories}
          amenities={amenities}
        />
      ) : (
        <SpaceImagesTab
          venueId={venue.id as string}
          initialImages={images}
        />
      )}
    </div>
  );
}
