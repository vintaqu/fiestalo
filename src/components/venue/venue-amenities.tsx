"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Amenity {
  amenity: {
    name: string;
    icon?: string | null;
    category?: string | null;
  };
}

export function VenueAmenities({ amenities }: { amenities: Amenity[] }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? amenities : amenities.slice(0, 10);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Lo que incluye</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {displayed.map(({ amenity }, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            <span className="text-base w-6 text-center">
              {amenity.icon ?? "✓"}
            </span>
            <span>{amenity.name}</span>
          </div>
        ))}
      </div>
      {amenities.length > 10 && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll
            ? "Ver menos"
            : `Mostrar los ${amenities.length - 10} restantes`}
        </Button>
      )}
    </div>
  );
}
