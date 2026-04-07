import { db } from "@/lib/db";
import { venueCardSelect } from "@/services/venue.service";
import { VenueCard } from "./venue-card";

export async function VenueSimilar({ venueId }: { venueId: string }) {
  const venue = await db.venue.findUnique({
    where: { id: venueId },
    select: { categoryId: true, city: true },
  });
  if (!venue) return null;

  const similar = await db.venue.findMany({
    where: {
      id: { not: venueId },
      status: "ACTIVE",
      deletedAt: null,
      OR: [
        { categoryId: venue.categoryId ?? undefined },
        { city: { contains: venue.city, mode: "insensitive" } },
      ],
    },
    select: venueCardSelect,
    take: 4,
    orderBy: { averageRating: "desc" },
  });

  if (similar.length === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t border-border">
      <h2 className="text-2xl font-bold mb-6">Espacios similares</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {similar.map((v, i) => (
          <VenueCard key={v.id} venue={v as any} index={i} />
        ))}
      </div>
    </section>
  );
}
