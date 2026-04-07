import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Star, ExternalLink } from "lucide-react";
import { formatDate } from "@/utils/format";
import { AdminReviewActions } from "@/components/reviews/admin-review-actions";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`w-3 h-3 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

const STATUS_TABS = [
  { key: "pending",     label: "Pendientes",    where: { isPublished: false, isFlagged: false } },
  { key: "published",   label: "Publicadas",    where: { isPublished: true,  isFlagged: false } },
  { key: "flagged",     label: "Reportadas",    where: { isFlagged: true } },
  { key: "unpublished", label: "No publicadas", where: { isPublished: false } },
];

async function getReviews(status: string) {
  const tab = STATUS_TABS.find((t) => t.key === status) ?? STATUS_TABS[0];
  return db.review.findMany({
    where:   tab.where,
    include: {
      author: { select: { id: true, name: true, email: true } },
      venue:  { select: { id: true, title: true, slug: true, ownerId: true, owner: { select: { name: true } } } },
      booking:{ select: { bookingRef: true, date: true } },
    },
    orderBy: { createdAt: "desc" },
    take:    200,
  });
}

async function getCounts() {
  const [pending, flagged, total] = await Promise.all([
    db.review.count({ where: { isPublished: false, isFlagged: false } }),
    db.review.count({ where: { isFlagged: true } }),
    db.review.count(),
  ]);
  return { pending, flagged, total };
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const activeTab = searchParams.status ?? "pending";
  const [reviews, counts] = await Promise.all([
    getReviews(activeTab),
    getCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Moderación de reseñas</h1>
          <p className="text-muted-foreground mt-1">{counts.total} reseñas en total</p>
        </div>
        {(counts.pending > 0 || counts.flagged > 0) && (
          <div className="flex gap-3">
            {counts.pending > 0 && (
              <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-sm font-medium">
                {counts.pending} pendientes
              </div>
            )}
            {counts.flagged > 0 && (
              <div className="bg-red-100 text-red-700 px-3 py-1.5 rounded-xl text-sm font-medium">
                {counts.flagged} reportadas
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <a
            key={tab.key}
            href={`/admin/reviews?status=${tab.key}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.key === "pending" && counts.pending > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {counts.pending}
              </span>
            )}
            {tab.key === "flagged" && counts.flagged > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {counts.flagged}
              </span>
            )}
          </a>
        ))}
      </div>

      {/* Reviews */}
      {reviews.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <p className="text-3xl mb-3">✅</p>
          <p className="font-medium">No hay reseñas en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className={`bg-card border rounded-2xl p-5 space-y-4 ${review.isFlagged ? "border-red-200" : "border-border"}`}>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{review.author.name ?? "Anónimo"}</p>
                    <span className="text-xs text-muted-foreground">{review.author.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link
                      href={`/venues/${review.venue.slug}`}
                      target="_blank"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      {review.venue.title}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <span>·</span>
                    <span>Owner: {review.venue.owner.name}</span>
                    <span>·</span>
                    <span>{formatDate(review.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StarRow rating={review.rating} />
                  <span className="text-sm font-bold">{review.rating}/5</span>
                  {review.isFlagged && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      🚩 Reportada
                    </span>
                  )}
                </div>
              </div>

              {/* Flag reason */}
              {review.flagReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  <strong>Motivo del reporte:</strong> {review.flagReason}
                </div>
              )}

              {/* Comment */}
              <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/30 rounded-xl p-3">
                "{review.comment}"
              </p>

              {/* Sub-ratings */}
              {(review.cleanlinessRating || review.locationRating || review.valueRating || review.communicationRating) && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {review.cleanlinessRating   && <span>Limpieza: {review.cleanlinessRating}★</span>}
                  {review.locationRating      && <span>Ubicación: {review.locationRating}★</span>}
                  {review.valueRating         && <span>Precio: {review.valueRating}★</span>}
                  {review.communicationRating && <span>Comunicación: {review.communicationRating}★</span>}
                </div>
              )}

              {/* Owner response */}
              {review.ownerResponse && (
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
                  <p className="text-xs font-medium text-primary mb-1">Respuesta del propietario</p>
                  <p className="text-sm text-muted-foreground">{review.ownerResponse}</p>
                </div>
              )}

              {/* Admin actions */}
              <AdminReviewActions
                reviewId={review.id}
                isPublished={review.isPublished}
                isFlagged={review.isFlagged}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
