"use client";

import { useState } from "react";
import { VenueCard, type VenueCardData } from "./venue-card";

export function FeaturedVenues({ venues }: { venues: VenueCardData[] }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  async function toggleFavorite(venueId: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(venueId)) next.delete(venueId);
      else next.add(venueId);
      return next;
    });
    try {
      await fetch(`/api/favorites/${venueId}`, { method: "POST" });
    } catch {}
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {venues.map((venue, i) => (
        <VenueCard
          key={venue.id}
          venue={venue}
          isFavorite={favorites.has(venue.id)}
          onToggleFavorite={toggleFavorite}
          isHovered={hoveredId === venue.id}
          onHover={setHoveredId}
          index={i}
        />
      ))}
    </div>
  );
}
