interface VenueData {
  title?: string;
  description?: string;
  images?: unknown[];
  amenityIds?: string[];
  // Accept number | Prisma.Decimal | string — all coerced via Number() in checks
  pricePerHour?: number | { toNumber(): number } | string | null;
  capacity?: number | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  categoryId?: string | null;
  cancellationPolicy?: unknown;
  houseRules?: string | null;
  shortDescription?: string | null;
}

const WEIGHTS: Array<{ key: keyof VenueData; weight: number; check?: (v: unknown) => boolean }> = [
  { key: "title", weight: 10 },
  { key: "description", weight: 15, check: (v) => String(v).length >= 100 },
  { key: "shortDescription", weight: 5 },
  { key: "images", weight: 20, check: (v) => Array.isArray(v) && v.length >= 3 },
  { key: "amenityIds", weight: 10, check: (v) => Array.isArray(v) && v.length >= 3 },
  { key: "pricePerHour", weight: 10 },
  { key: "capacity", weight: 5 },
  { key: "address", weight: 10 },
  { key: "latitude", weight: 5 },
  { key: "categoryId", weight: 5 },
  { key: "cancellationPolicy", weight: 3 },
  { key: "houseRules", weight: 2 },
];

export function calculateCompleteness(venue: VenueData): number {
  let score = 0;
  for (const { key, weight, check } of WEIGHTS) {
    const value = venue[key];
    const hasValue = value !== undefined && value !== null && value !== "";
    if (hasValue) {
      if (check) {
        score += check(value) ? weight : weight * 0.5;
      } else {
        score += weight;
      }
    }
  }
  return Math.min(100, Math.round(score));
}
