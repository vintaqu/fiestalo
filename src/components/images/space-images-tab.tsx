"use client";

import { useState } from "react";
import { ImageUploadZone } from "@/components/images/image-upload-zone";
import { ImageGallery } from "@/components/images/image-gallery";

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

interface SpaceImagesTabProps {
  venueId:       string;
  initialImages: GalleryImage[];
}

export function SpaceImagesTab({ venueId, initialImages }: SpaceImagesTabProps) {
  const [images, setImages] = useState<GalleryImage[]>(
    [...initialImages].sort((a, b) => a.sortOrder - b.sortOrder)
  );

  function handleUploaded(uploaded: {
    url:          string;
    cloudinaryId: string;
    width:        number;
    height:       number;
    format:       string;
  }) {
    // Optimistically add to gallery — DB was already updated by the upload zone
    setImages((prev) => [
      ...prev,
      {
        id:           `temp_${Date.now()}`,
        url:          uploaded.url,
        cloudinaryId: uploaded.cloudinaryId,
        alt:          null,
        isCover:      prev.length === 0,
        sortOrder:    prev.length,
        width:        uploaded.width,
        height:       uploaded.height,
      },
    ]);

    // Re-fetch to get the real DB id
    fetch(`/api/owner/spaces/${venueId}/images`)
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setImages(data.data);
      })
      .catch(() => {});
  }

  return (
    <div className="space-y-8">
      {/* Tips */}
      <div className="bg-secondary/50 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Consejos para mejores fotos</p>
        <ul className="space-y-0.5 list-disc list-inside text-xs">
          <li>Usa fotos horizontales (paisaje) para mejor aspecto en búsquedas</li>
          <li>Mínimo 3 fotos para aumentar el completeness score y las conversiones</li>
          <li>La primera foto (portada) es la más importante — elige la más atractiva</li>
          <li>Iluminación natural y espacios ordenados generan más reservas</li>
          <li>Resolución recomendada: mínimo 1200×800px</li>
        </ul>
      </div>

      {/* Upload zone */}
      <section>
        <h3 className="font-semibold text-sm mb-3">Subir nuevas fotos</h3>
        <ImageUploadZone
          venueId={venueId}
          onUploaded={handleUploaded}
          maxImages={20}
          current={images.length}
        />
      </section>

      {/* Gallery */}
      <section>
        <h3 className="font-semibold text-sm mb-3">
          Galería ({images.length}/20)
        </h3>
        <ImageGallery
          venueId={venueId}
          images={images}
          onChange={setImages}
        />
      </section>
    </div>
  );
}
