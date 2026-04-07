import { SearchPageClient } from "@/components/search/search-page-client";
import { SiteHeader } from "@/components/shared/site-header";
import { db } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buscar espacios",
  description: "Encuentra y reserva el espacio perfecto para tu evento, reunión o proyecto.",
};

async function getFilterOptions() {
  const [categories, amenities] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, icon: true, slug: true },
    }),
    db.amenity.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, icon: true, category: true },
    }),
  ]);
  return { categories, amenities };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const filterOptions = await getFilterOptions();
  return (
    <>
      <SiteHeader />
      <SearchPageClient
        initialSearchParams={searchParams}
        filterOptions={filterOptions}
      />
    </>
  );
}
