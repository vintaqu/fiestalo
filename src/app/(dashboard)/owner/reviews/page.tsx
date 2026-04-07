import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatDate } from "@/utils/format";
import { Star } from "lucide-react";
import { OwnerReviewActions } from "@/components/reviews/owner-review-actions";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  published:   { label: "Publicada",          color: "bg-emerald-100 text-emerald-700" },
  pending:     { label: "Pendiente revisión",  color: "bg-amber-100 text-amber-700" },
  unpublished: { label: "No publicada",        color: "bg-gray-100 text-gray-600" },
  flagged:     { label: "Reportada",           color: "bg-red-100 text-red-700" },
};

async function getOwnerReviews(ownerId: string) {
  return db.review.findMany({
    where:   { venue: { ownerId } },
    include: {
      author:  { select: { name: true, image: true } },
      venue:   { select: { id: true, title: true, slug: true } },
      booking: { select: { bookingRef: true, date: true } },
    },
    orderBy: { createdAt: "desc" },
    take:    100,
  });
}

export default async function OwnerReviewsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const reviews = await getOwnerReviews(session.user.id);

  const published   = reviews.filter((r) => r.isPublished && !r.isFlagged).length;
  const pending     = reviews.filter((r) => !r.isPublished && !r.isFlagged).length;
  const withResponse= reviews.filter((r) => r.ownerResponse).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reseñas recibidas</h1>
        <p className="text-muted-foreground mt-1">Valoraciones de tus clientes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total",          value: reviews.length },
          { label: "Publicadas",     value: published },
          { label: "Pendientes",     value: pending },
          { label: "Con respuesta",  value: withResponse },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Review list */}
      {reviews.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <p className="text-3xl mb-3">⭐</p>
          <p className="font-medium">Aún no tienes reseñas</p>
          <p className="text-muted-foreground text-sm mt-1">
            Las valoraciones de tus clientes aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const statusKey = review.isFlagged
              ? "flagged"
              : review.isPublished
              ? "published"
              : "pending";
            const statusInfo = STATUS_MAP[statusKey];

            return (
              <div key={review.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                      {review.author.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{review.author.name ?? "Anónimo"}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.venue.title} · {formatDate(review.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    <StarRow rating={review.rating} />
                  </div>
                </div>

                {/* Comment */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.comment}
                </p>

                {/* Sub-ratings */}
                {(review.cleanlinessRating || review.locationRating || review.valueRating || review.communicationRating) && (
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {review.cleanlinessRating  && <span>Limpieza: {review.cleanlinessRating}★</span>}
                    {review.locationRating     && <span>Ubicación: {review.locationRating}★</span>}
                    {review.valueRating        && <span>Precio: {review.valueRating}★</span>}
                    {review.communicationRating&& <span>Comunicación: {review.communicationRating}★</span>}
                  </div>
                )}

                {/* Owner response */}
                {review.ownerResponse && (
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                    <p className="text-xs font-medium text-primary mb-1">Tu respuesta</p>
                    <p className="text-sm text-muted-foreground">{review.ownerResponse}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {review.ownerRespondedAt ? formatDate(review.ownerRespondedAt) : ""}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {review.isPublished && (
                  <OwnerReviewActions
                    reviewId={review.id}
                    hasResponse={!!review.ownerResponse}
                    existingResponse={review.ownerResponse ?? ""}
                  />
                )}
                {!review.isPublished && (
                  <p className="text-xs text-muted-foreground italic">
                    Esta reseña está pendiente de revisión por el equipo de Fiestalo.
                    Podrás responder una vez sea aprobada.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
