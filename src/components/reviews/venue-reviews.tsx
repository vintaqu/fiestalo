import Image from "next/image";
import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/utils/format";

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}

interface VenueReviewsProps {
  venueId:       string;
  averageRating: number;
  totalReviews:  number;
}

export async function VenueReviews({
  venueId,
  averageRating,
  totalReviews,
}: VenueReviewsProps) {
  if (totalReviews === 0) {
    return (
      <div className="bg-secondary/40 rounded-2xl p-8 text-center">
        <p className="text-3xl mb-2">⭐</p>
        <p className="text-muted-foreground text-sm">Aún no hay reseñas para este espacio.</p>
        <p className="text-muted-foreground text-xs mt-1">¡Sé el primero en dejar una valoración!</p>
      </div>
    );
  }

  const reviews = await db.review.findMany({
    where:   { venueId, isPublished: true },
    include: { author: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take:    10,
  });

  // Sub-rating averages
  const subAvgs = reviews.reduce(
    (acc, r) => ({
      cleanliness:   acc.cleanliness   + (Number(r.cleanlinessRating)  || 0),
      location:      acc.location      + (Number(r.locationRating)     || 0),
      value:         acc.value         + (Number(r.valueRating)        || 0),
      communication: acc.communication + (Number(r.communicationRating)|| 0),
      counts: {
        cleanliness:   acc.counts.cleanliness   + (r.cleanlinessRating   ? 1 : 0),
        location:      acc.counts.location      + (r.locationRating      ? 1 : 0),
        value:         acc.counts.value         + (r.valueRating         ? 1 : 0),
        communication: acc.counts.communication + (r.communicationRating ? 1 : 0),
      },
    }),
    { cleanliness: 0, location: 0, value: 0, communication: 0,
      counts: { cleanliness: 0, location: 0, value: 0, communication: 0 } }
  );

  const subRatingItems = [
    { label: "Limpieza",           value: subAvgs.counts.cleanliness   ? subAvgs.cleanliness   / subAvgs.counts.cleanliness   : 0 },
    { label: "Ubicación",          value: subAvgs.counts.location      ? subAvgs.location      / subAvgs.counts.location      : 0 },
    { label: "Calidad/precio",     value: subAvgs.counts.value         ? subAvgs.value         / subAvgs.counts.value         : 0 },
    { label: "Comunicación",       value: subAvgs.counts.communication ? subAvgs.communication / subAvgs.counts.communication : 0 },
  ].filter((i) => i.value > 0);

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="flex flex-col sm:flex-row gap-8 items-start">
        {/* Global score */}
        <div className="text-center shrink-0">
          <p className="text-5xl font-bold">{averageRating.toFixed(1)}</p>
          <StarDisplay rating={Math.round(averageRating)} size="md" />
          <p className="text-sm text-muted-foreground mt-1">{totalReviews} reseña{totalReviews !== 1 ? "s" : ""}</p>
        </div>

        {/* Sub-ratings bars */}
        {subRatingItems.length > 0 && (
          <div className="flex-1 space-y-2.5 w-full">
            {subRatingItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-32 shrink-0">{item.label}</span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${(item.value / 5) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-6 text-right">{item.value.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review list */}
      <div className="space-y-5">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-border pb-5 last:border-0 last:pb-0">
            <div className="flex items-start gap-3 mb-3">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0 overflow-hidden">
                {review.author.image ? (
                  <Image src={review.author.image} alt="" width={36} height={36} className="w-full h-full object-cover" />
                ) : (
                  review.author.name?.charAt(0) ?? "?"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{review.author.name ?? "Anónimo"}</p>
                  <StarDisplay rating={review.rating} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(review.createdAt)}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
          </div>
        ))}
      </div>

      {totalReviews > 10 && (
        <p className="text-sm text-center text-muted-foreground">
          Mostrando las 10 reseñas más recientes de {totalReviews}.
        </p>
      )}
    </div>
  );
}
