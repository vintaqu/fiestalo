"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Star,
  Users,
  Heart,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/utils/format";

export interface VenueCardData {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  pricePerHour: number | string;
  city: string;
  capacity: number;
  averageRating?: number | string | null;
  totalReviews: number;
  isFeatured: boolean;
  isVerified: boolean;
  bookingType: "INSTANT" | "REQUEST";
  images: Array<{ url: string; alt?: string | null }>;
  category?: { name: string; icon?: string | null } | null;
}

interface VenueCardProps {
  venue: VenueCardData;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  isHovered?: boolean;
  onHover?: (id: string | null) => void;
  index?: number;
}

export function VenueCard({
  venue,
  isFavorite = false,
  onToggleFavorite,
  isHovered = false,
  onHover,
  index = 0,
}: VenueCardProps) {
  const [imgError, setImgError] = useState(false);
  const coverImage = venue.images[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onMouseEnter={() => onHover?.(venue.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Link href={`/venues/${venue.slug}`} className="block group">
        <div
          className={cn(
            "rounded-2xl overflow-hidden border border-border bg-card transition-all duration-300",
            isHovered
              ? "shadow-xl -translate-y-1 border-primary/30"
              : "shadow-sm hover:shadow-md hover:-translate-y-0.5"
          )}
        >
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            {coverImage && !imgError ? (
              <Image
                src={coverImage.url}
                alt={coverImage.alt ?? venue.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                onError={() => setImgError(true)}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 relative overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=60"
                  alt={venue.title}
                  fill
                  className="object-cover opacity-60"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <span className="text-4xl relative z-10">🎉</span>
              </div>
            )}

            {/* Badges overlay */}
            <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
              {venue.isFeatured && (
                <Badge className="bg-amber-500 text-white text-xs border-0 shadow-sm">
                  ⭐ Destacado
                </Badge>
              )}
              {venue.bookingType === "INSTANT" && (
                <Badge className="bg-emerald-500 text-white text-xs border-0 shadow-sm">
                  <Zap className="w-3 h-3 mr-0.5" />
                  Instantáneo
                </Badge>
              )}
            </div>

            {/* Favorite button */}
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(venue.id);
                }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm transition-transform hover:scale-110"
                aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
              >
                <Heart
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  )}
                />
              </button>
            )}

            {/* Category chip */}
            {venue.category && (
              <div className="absolute bottom-3 left-3">
                <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                  {venue.category.icon && (
                    <span>{venue.category.icon}</span>
                  )}
                  {venue.category.name}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {venue.title}
              </h3>
              {venue.isVerified && (
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              )}
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 text-muted-foreground mb-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs truncate">{venue.city}</span>
            </div>

            {/* Specs */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {venue.capacity} pers.
              </span>
            </div>

            {/* Footer: rating + price */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-1">
                {venue.totalReviews > 0 ? (
                  <>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium">
                      {Number(venue.averageRating).toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({venue.totalReviews})
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Nuevo</span>
                )}
              </div>
              <div className="text-right">
                <span className="font-bold text-sm">
                  {formatPrice(Number(venue.pricePerHour))}
                </span>
                <span className="text-muted-foreground text-xs">/hora</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
