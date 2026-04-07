"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Grid2X2, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VenueImage {
  id?: string;
  url: string;
  alt?: string | null;
  isCover?: boolean;
}

export function VenueGallery({
  images,
  title,
}: {
  images: VenueImage[];
  title: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  const cover = images[0];
  const rest = images.slice(1, 5);
  const total = images.length;

  if (!cover) return null;

  function openLightbox(index: number) {
    setCurrent(index);
    setLightboxOpen(true);
  }

  function prev() {
    setCurrent((c) => (c === 0 ? total - 1 : c - 1));
  }

  function next() {
    setCurrent((c) => (c === total - 1 ? 0 : c + 1));
  }

  return (
    <>
      {/* Gallery grid */}
      <div className="max-w-7xl mx-auto px-4">
        <div
          className={cn(
            "grid gap-2 rounded-2xl overflow-hidden",
            rest.length === 0
              ? "grid-cols-1"
              : rest.length < 2
                ? "grid-cols-2"
                : "grid-cols-4"
          )}
          style={{ maxHeight: 520 }}
        >
          {/* Cover image */}
          <div
            className={cn(
              "relative cursor-pointer group overflow-hidden",
              rest.length >= 2 ? "col-span-2 row-span-2" : "col-span-1"
            )}
            style={{ minHeight: rest.length >= 2 ? 520 : 360 }}
            onClick={() => openLightbox(0)}
          >
            <Image
              src={cover.url}
              alt={cover.alt ?? title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority
              sizes="(max-width: 768px) 100vw, 60vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>

          {/* Remaining images */}
          {rest.map((img, i) => (
            <div
              key={img.id ?? i}
              className="relative cursor-pointer group overflow-hidden"
              style={{ minHeight: 256 }}
              onClick={() => openLightbox(i + 1)}
            >
              <Image
                src={img.url}
                alt={img.alt ?? `${title} ${i + 2}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 20vw"
              />
              {/* Overlay on last image if more exist */}
              {i === rest.length - 1 && total > 5 && (
                <div
                  className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 cursor-pointer"
                  onClick={() => openLightbox(i + 1)}
                >
                  <Grid2X2 className="w-5 h-5 text-white" />
                  <span className="text-white font-semibold text-sm">
                    +{total - 5} fotos
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
          ))}
        </div>

        {/* Show all button */}
        {total > 1 && (
          <div className="flex justify-end mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLightbox(0)}
              className="gap-2"
            >
              <Expand className="w-4 h-4" />
              Ver todas las fotos ({total})
            </Button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Close */}
            <button
              className="absolute top-4 right-4 text-white/80 hover:text-white z-10 bg-black/30 p-2 rounded-full"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
              {current + 1} / {total}
            </div>

            {/* Prev */}
            {total > 1 && (
              <button
                className="absolute left-4 text-white/80 hover:text-white z-10 bg-black/30 p-3 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={current}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-5xl max-h-[85vh] w-full mx-16"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[current].url}
                alt={images[current].alt ?? title}
                width={1200}
                height={800}
                className="object-contain max-h-[85vh] w-full rounded-lg"
              />
            </motion.div>

            {/* Next */}
            {total > 1 && (
              <button
                className="absolute right-4 text-white/80 hover:text-white z-10 bg-black/30 p-3 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Thumbnails */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-lg overflow-x-auto px-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrent(i);
                  }}
                  className={cn(
                    "w-12 h-9 rounded overflow-hidden shrink-0 transition-all",
                    i === current
                      ? "ring-2 ring-white scale-110"
                      : "opacity-50 hover:opacity-80"
                  )}
                >
                  <Image
                    src={img.url}
                    alt=""
                    width={48}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
