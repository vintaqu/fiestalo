import { Suspense } from "react";
import { db } from "@/lib/db";
import { HeroSection } from "@/components/shared/hero-section";
import { FeaturedVenues } from "@/components/venue/featured-venues";
import { CategoryGrid } from "@/components/shared/category-grid";
import { HowItWorks } from "@/components/shared/how-it-works";
import { SocialProof } from "@/components/shared/social-proof";
import { OwnerCTA } from "@/components/shared/owner-cta";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { VenueCardSkeleton } from "@/components/venue/venue-card-skeleton";

async function getFeaturedVenues() {
  return db.venue.findMany({
    where: { isFeatured: true, status: "ACTIVE", deletedAt: null },
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
    orderBy: { averageRating: "desc" },
    take: 8,
  });
}

async function getCategories() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 8,
  });
}

export default async function HomePage() {
  const [featuredVenues, categories] = await Promise.all([
    getFeaturedVenues(),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader transparent />

      {/* Hero */}
      <HeroSection />

      {/* Categories */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight">
            Encuentra tu sala de fiestas ideal
          </h2>
          <p className="text-muted-foreground mt-2">
            Salas infantiles, salones familiares y espacios temáticos para celebrar
          </p>
        </div>
        <CategoryGrid categories={categories} />
      </section>

      {/* Featured Venues */}
      <section className="py-16 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Salas destacadas
              </h2>
              <p className="text-muted-foreground mt-2">
                Las más valoradas por las familias
              </p>
            </div>
            <a
              href="/search"
              className="text-primary font-medium hover:underline hidden sm:block"
            >
              Ver todos →
            </a>
          </div>
          <Suspense fallback={<VenueGridSkeleton />}>
            <FeaturedVenues venues={featuredVenues} />
          </Suspense>
        </div>
      </section>

      {/* How it works */}
      <HowItWorks />

      {/* Social proof */}
      <SocialProof />

      {/* Owner CTA */}
      <OwnerCTA />

      <SiteFooter />
    </div>
  );
}

function VenueGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <VenueCardSkeleton key={i} />
      ))}
    </div>
  );
}
