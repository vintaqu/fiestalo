import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { venueDetailSelect } from "@/services/venue.service";
import { SiteHeader } from "@/components/shared/site-header";
import { VenueGallery } from "@/components/venue/venue-gallery";
import { VenueInfo } from "@/components/venue/venue-info";
import { VenueAmenities } from "@/components/venue/venue-amenities";
import { VenueAvailability } from "@/components/venue/venue-availability";
import { VenueReviews } from "@/components/venue/venue-reviews";
import { BookingWidget } from "@/components/booking/booking-widget";
import { VenueSimilar } from "@/components/venue/venue-similar";
import { VenueMap } from "@/components/map/venue-map";
import { auth } from "@/lib/auth";

interface PageProps {
  params: { id: string };
}

async function getVenue(slug: string) {
  const venue = await db.venue.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    select: venueDetailSelect,
  });
  return venue;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const venue = await getVenue(params.id);
  if (!venue) return { title: "Espacio no encontrado" };

  return {
    title: venue.title,
    description:
      venue.shortDescription ??
      `Reserva ${venue.title} en ${venue.city}. Capacidad: ${venue.capacity} personas.`,
    openGraph: {
      title: venue.title,
      description: venue.shortDescription ?? "",
      images: venue.images[0] ? [{ url: venue.images[0].url }] : [],
    },
  };
}

export default async function VenueDetailPage({ params }: PageProps) {
  const [venue, session] = await Promise.all([
    getVenue(params.id),
    auth(),
  ]);

  if (!venue) notFound();

  // Increment view count
  await db.venue.update({
    where: { id: venue.id as string },
    data: { viewCount: { increment: 1 } },
  });

  const reviews = await db.review.findMany({
    where: { venueId: venue.id as string, isPublished: true },
    include: {
      author: {
        select: { name: true, image: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const mapVenue = {
    id: venue.id as string,
    title: venue.title as string,
    slug: venue.slug as string,
    latitude: venue.latitude as number,
    longitude: venue.longitude as number,
    pricePerHour: venue.pricePerHour as number,
    images: (venue.images as Array<{ url: string }>).slice(0, 1),
  };

  return (
    <>
      <SiteHeader />

      <main className="pt-16 pb-24">
        {/* Gallery */}
        <VenueGallery images={venue.images as any} title={venue.title as string} />

        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-10">
              <VenueInfo venue={venue as any} />

              {/* Amenities */}
              {(venue.amenities as any[]).length > 0 && (
                <VenueAmenities amenities={venue.amenities as any} />
              )}

              {/* Availability calendar */}
              <VenueAvailability
                venueId={venue.id as string}
                availabilityRules={venue.availabilityRules as any}
                minHours={venue.minHours as number}
              />

              {/* Map */}
              <section>
                <h2 className="text-xl font-semibold mb-4">Ubicación</h2>
                <div className="h-72 rounded-2xl overflow-hidden border border-border">
                  <VenueMap
                    venues={[mapVenue]}
                    hoveredId={null}
                    onVenueHover={() => {}}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  📍 {venue.address as string}, {venue.city as string}
                </p>
              </section>

              {/* Reviews */}
              <VenueReviews reviews={reviews} venueId={venue.id as string} />
            </div>

            {/* Right column: Booking widget */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <BookingWidget
                  venue={venue as any}
                  userId={session?.user?.id ?? null}
                />
              </div>
            </div>
          </div>

          {/* Similar venues */}
          <VenueSimilar venueId={venue.id as string} />
        </div>
      </main>
    </>
  );
}
