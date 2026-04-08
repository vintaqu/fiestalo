"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  comment: string;
  ownerResponse?: string | null;
  ownerRespondedAt?: Date | string | null;
  createdAt: Date | string;
  cleanlinessRating?: number | null;
  locationRating?: number | null;
  valueRating?: number | null;
  communicationRating?: number | null;
  author: {
    name?: string | null;
    image?: string | null;
    createdAt?: Date | string;
  };
}

function StarRow({ label, value }: { label: string; value?: number | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "w-3 h-3",
              i < value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            )}
          />
        ))}
        <span className="ml-1 font-medium">{value}</span>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.comment.length > 200;

  return (
    <div className="border border-border rounded-2xl p-5 space-y-3 hover:shadow-sm transition-shadow">
      {/* Author */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={review.author.image ?? ""} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {review.author.name?.charAt(0) ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{review.author.name ?? "Anónimo"}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "w-4 h-4",
                i < review.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="text-sm text-muted-foreground leading-relaxed">
        {isLong && !expanded
          ? `${review.comment.slice(0, 200)}...`
          : review.comment}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-primary font-medium hover:underline"
          >
            {expanded ? "Ver menos" : "Ver más"}
          </button>
        )}
      </div>

      {/* Sub-ratings */}
      {(review.cleanlinessRating || review.locationRating || review.valueRating || review.communicationRating) && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 pt-1 border-t border-border">
          <StarRow label="Limpieza" value={review.cleanlinessRating} />
          <StarRow label="Ubicación" value={review.locationRating} />
          <StarRow label="Calidad/precio" value={review.valueRating} />
          <StarRow label="Comunicación" value={review.communicationRating} />
        </div>
      )}

      {/* Owner response */}
      {review.ownerResponse && (
        <div className="bg-secondary/60 rounded-xl p-3 text-sm">
          <p className="font-medium text-xs text-muted-foreground mb-1">
            Respuesta del propietario
          </p>
          <p className="text-muted-foreground">{review.ownerResponse}</p>
        </div>
      )}
    </div>
  );
}

export function VenueReviews({
  reviews,
  venueId,
}: {
  reviews: Review[];
  venueId: string;
}) {
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;
  const paginated = reviews.slice(0, page * PER_PAGE);
  const hasMore = reviews.length > page * PER_PAGE;

  if (reviews.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Reseñas</h2>
        <div className="text-center py-10 rounded-2xl border border-dashed border-border">
          <p className="text-4xl mb-2">💬</p>
          <p className="text-muted-foreground text-sm">
            Todavía no hay reseñas para este espacio
          </p>
        </div>
      </div>
    );
  }

  // Aggregate average
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold">Reseñas</h2>
        <div className="flex items-center gap-1.5">
          <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          <span className="font-bold">{avg.toFixed(1)}</span>
          <span className="text-muted-foreground text-sm">
            ({reviews.length} reseñas)
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {paginated.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {hasMore && (
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={() => setPage((p) => p + 1)}
        >
          Ver más reseñas
        </Button>
      )}
    </div>
  );
}
