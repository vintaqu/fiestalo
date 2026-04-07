import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { FeaturedVenues } from "@/components/venue/featured-venues";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

async function getUserFavorites(userId: string) {
  const favs = await db.favorite.findMany({
    where: { userId },
    include: {
      venue: {
        select: {
          id: true,
          title: true,
          slug: true,
          shortDescription: true,
          pricePerHour: true,
          city: true,
          capacity: true,
          averageRating: true,
          totalReviews: true,
          isFeatured: true,
          isVerified: true,
          bookingType: true,
          images: { where: { isCover: true }, take: 1 },
          category: { select: { name: true, icon: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return favs.map((f) => f.venue);
}

export default async function TenantFavoritesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const venues = await getUserFavorites(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        <div>
          <h1 className="text-2xl font-bold">Favoritos</h1>
          <p className="text-muted-foreground mt-0.5">
            {venues.length} espacio{venues.length !== 1 ? "s" : ""} guardado{venues.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {venues.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-border p-16 text-center">
          <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No tienes favoritos todavía</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Guarda los espacios que más te gusten para encontrarlos fácilmente.
          </p>
          <Button asChild>
            <Link href="/search">Explorar espacios</Link>
          </Button>
        </div>
      ) : (
        <FeaturedVenues venues={venues as any} />
      )}
    </div>
  );
}
