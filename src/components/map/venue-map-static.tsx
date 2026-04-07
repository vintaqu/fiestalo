"use client";

import { VenueMap } from "@/components/map/venue-map";

interface MapVenue {
  id: string;
  title: string;
  slug: string;
  latitude: number;
  longitude: number;
  pricePerHour: number | string;
  images: Array<{ url: string }>;
}

interface VenueMapStaticProps {
  venue: MapVenue;
}

// Wrapper client component so the server page doesn't pass functions as props
export function VenueMapStatic({ venue }: VenueMapStaticProps) {
  return (
    <VenueMap
      venues={[venue]}
      hoveredId={null}
      onVenueHover={() => {}}
    />
  );
}
