/**
 * Prisma returns Decimal fields as Prisma.Decimal objects, not JS numbers.
 * These helpers convert them to plain numbers so typed components don't reject them.
 * Use at the boundary between Prisma queries and React components.
 */

/** Normalize a venue object from Prisma for use in VenueCard / VenueCardData */
export function normalizeVenue<T extends {
  pricePerHour: unknown;
  averageRating?: unknown;
  cleaningFee?:  unknown;
  depositAmount?: unknown;
}>(venue: T): Omit<T, "pricePerHour" | "averageRating" | "cleaningFee" | "depositAmount"> & {
  pricePerHour:  number;
  averageRating: number | null;
  cleaningFee?:  number | null;
  depositAmount?: number | null;
} {
  return {
    ...venue,
    pricePerHour:  Number(venue.pricePerHour  ?? 0),
    averageRating: venue.averageRating != null ? Number(venue.averageRating) : null,
    cleaningFee:   venue.cleaningFee   != null ? Number(venue.cleaningFee)   : undefined,
    depositAmount: venue.depositAmount != null ? Number(venue.depositAmount)  : undefined,
  };
}

/** Normalize a booking object from Prisma for use in RecentBookingsTable */
export function normalizeBooking<T extends {
  total:       unknown;
  subtotal?:   unknown;
  platformFee?: unknown;
}>(booking: T): Omit<T, "total" | "subtotal" | "platformFee"> & {
  total:        number;
  subtotal:     number;
  platformFee:  number;
} {
  return {
    ...booking,
    total:       Number(booking.total       ?? 0),
    subtotal:    Number(booking.subtotal    ?? 0),
    platformFee: Number(booking.platformFee ?? 0),
  };
}
