import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Star, ExternalLink } from "lucide-react";
import { formatDate } from "@/utils/format";
import { Button } from "@/components/ui/button";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

async function getMyReviews(userId: string) {
  return db.review.findMany({
    where:   { authorId: userId },
    include: {
      venue:   { select: { id: true, title: true, slug: true, city: true } },
      booking: { select: { id: true, bookingRef: true, date: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Bookings that are completed but have no review yet
async function getPendingReviews(userId: string) {
  return db.booking.findMany({
    where:   {
      tenantId: userId,
      status:   "COMPLETED",
      review:   null,
    },
    include: {
      venue: { select: { id: true, title: true, slug: true, city: true } },
    },
    orderBy: { date: "desc" },
    take: 10,
  });
}

export default async function TenantReviewsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [myReviews, pendingReviews] = await Promise.all([
    getMyReviews(session.user.id),
    getPendingReviews(session.user.id),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mis reseñas</h1>
        <p className="text-muted-foreground mt-1">Valoraciones que has dejado</p>
      </div>

      {/* Pending reviews to write */}
      {pendingReviews.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full text-xs flex items-center justify-center font-bold">
              {pendingReviews.length}
            </span>
            Pendientes de reseñar
          </h2>
          <div className="space-y-3">
            {pendingReviews.map((booking) => (
              <div key={booking.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">{booking.venue.title}</p>
                  <p className="text-xs text-muted-foreground">{booking.venue.city} · {formatDate(booking.date)}</p>
                </div>
                <Button size="sm" asChild>
                  <Link href={`/tenant/bookings/${booking.id}/review`}>
                    <Star className="w-3.5 h-3.5 mr-1.5 fill-white" />
                    Reseñar
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Written reviews */}
      <section>
        <h2 className="font-semibold mb-3">Reseñas escritas ({myReviews.length})</h2>
        {myReviews.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">⭐</p>
            <p className="font-medium">Aún no has escrito ninguna reseña</p>
            <p className="text-muted-foreground text-sm mt-1">
              Después de cada reserva completada podrás valorar el espacio
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {myReviews.map((review) => (
              <div key={review.id} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/venues/${review.venue.slug}`}
                      className="font-medium text-sm hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {review.venue.title}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <p className="text-xs text-muted-foreground">{review.venue.city} · {formatDate(review.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StarRow rating={review.rating} />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      review.isPublished
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {review.isPublished ? "Publicada" : "En revisión"}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>

                {/* Sub-ratings inline */}
                {(review.cleanlinessRating || review.locationRating) && (
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t border-border pt-2">
                    {review.cleanlinessRating   && <span>🧹 Limpieza: {review.cleanlinessRating}/5</span>}
                    {review.locationRating      && <span>📍 Ubicación: {review.locationRating}/5</span>}
                    {review.valueRating         && <span>💰 Precio: {review.valueRating}/5</span>}
                    {review.communicationRating && <span>💬 Comunicación: {review.communicationRating}/5</span>}
                  </div>
                )}

                {/* Owner response */}
                {review.ownerResponse && (
                  <div className="bg-secondary/50 rounded-xl p-3 border-l-2 border-primary/30">
                    <p className="text-xs font-medium text-primary mb-1">Respuesta del propietario</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{review.ownerResponse}</p>
                  </div>
                )}

                {!review.isPublished && (
                  <p className="text-xs text-amber-600">
                    ⏳ Tu reseña está siendo revisada y se publicará en breve.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
