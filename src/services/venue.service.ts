import { db } from "@/lib/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/api-response";
import type { VenueCreateInput, VenueUpdateInput, SearchInput } from "@/lib/validations";
import type { Prisma, Role } from "@prisma/client";
import { slugify } from "@/utils/slugify";
import { calculateCompleteness } from "@/utils/venue-completeness";

// ── Venue Selects ─────────────────────────────────

export const venueCardSelect = {
  id: true,
  title: true,
  slug: true,
  shortDescription: true,
  pricePerHour: true,
  city: true,
  latitude: true,
  longitude: true,
  capacity: true,
  isIndoor: true,
  isOutdoor: true,
  hasParking: true,
  averageRating: true,
  totalReviews: true,
  isFeatured: true,
  isVerified: true,
  bookingType: true,
  images: {
    where: { isCover: true },
    take: 1,
    select: { url: true, alt: true },
  },
  category: {
    select: { name: true, slug: true, icon: true },
  },
  owner: {
    select: {
      id: true,
      name: true,
      image: true,
      profile: { select: { isVerified: true } },
    },
  },
} satisfies Prisma.VenueSelect;

export const venueDetailSelect = {
  ...venueCardSelect,
  description: true,
  address: true,
  postalCode: true,
  country: true,
  minHours: true,
  maxHours: true,
  bufferMinutes: true,
  cleaningFee: true,
  depositAmount: true,
  cancellationPolicy: true,
  houseRules: true,
  isAccessible: true,
  allowsPets: true,
  allowsMusic: true,
  allowsAlcohol: true,
  allowsCatering: true,
  allowsSmoking: true,
  viewCount: true,
  totalBookings: true,
  publishedAt: true,
  amenities: {
    include: { amenity: true },
  },
  images: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, url: true, alt: true, isCover: true, sortOrder: true },
  },
  availabilityRules: {
    orderBy: { dayOfWeek: "asc" as const },
  },
  extras: true,
  seasonalPrices: {
    where: { endDate: { gte: new Date() } },
  },
} satisfies Prisma.VenueSelect;

// ── Service ───────────────────────────────────────

export class VenueService {
  async getAll(params: SearchInput) {
    const {
      q,
      city,
      lat,
      lng,
      radius = 50,
      date,
      startTime,
      endTime,
      minPrice,
      maxPrice,
      minCapacity,
      categoryId,
      amenityIds,
      bookingType,
      isAccessible,
      hasParking,
      isOutdoor,
      allowsPets,
      minRating,
      sortBy,
      page,
      limit,
    } = params;

    // ── If geo search requested, use Haversine raw query ─────────────────────
    // Haversine gives true great-circle distance; bounding box alone is
    // inaccurate near poles and at large radii.
    if (lat !== undefined && lng !== undefined) {
      return this.geoSearch({
        lat, lng, radius,
        q, city, date, startTime, endTime,
        minPrice, maxPrice, minCapacity, categoryId, amenityIds,
        bookingType, isAccessible, hasParking, isOutdoor, allowsPets,
        minRating, sortBy, page, limit,
      });
    }

    // ── Standard non-geo search (Prisma ORM, fast) ────────────────────────────
    const where: Prisma.VenueWhereInput = {
      status: "ACTIVE",
      deletedAt: null,
    };

    // Full-text search across title, shortDescription, city
    if (q) {
      where.OR = [
        { title:            { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
        { description:      { contains: q, mode: "insensitive" } },
        { city:             { contains: q, mode: "insensitive" } },
        { address:          { contains: q, mode: "insensitive" } },
      ];
    }

    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }

    // Availability filter: exclude venues with confirmed bookings
    // that overlap the requested time slot
    if (date && startTime && endTime) {
      where.bookings = {
        none: {
          date:   new Date(date),
          status: { in: ["CONFIRMED", "AWAITING_PAYMENT"] },
          OR: [
            { startTime: { lt: endTime },   endTime: { gt: startTime } },
          ],
        },
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.pricePerHour = {};
      if (minPrice !== undefined) where.pricePerHour.gte = minPrice;
      if (maxPrice !== undefined) where.pricePerHour.lte = maxPrice;
    }

    if (minCapacity) where.capacity = { gte: minCapacity };
    if (categoryId)  where.categoryId = categoryId;
    if (bookingType) where.bookingType = bookingType;
    if (isAccessible) where.isAccessible = true;
    if (hasParking)   where.hasParking = true;
    if (isOutdoor)    where.isOutdoor = true;
    if (allowsPets)   where.allowsPets = true;
    if (minRating)    where.averageRating = { gte: minRating };

    if (amenityIds) {
      const ids = amenityIds.split(",").filter(Boolean);
      if (ids.length > 0) {
        where.amenities = { some: { amenityId: { in: ids } } };
      }
    }

    const orderBy = this.buildOrderBy(sortBy);

    const [total, venues] = await db.$transaction([
      db.venue.count({ where }),
      db.venue.findMany({
        where,
        select: venueCardSelect,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { venues, total };
  }

  // ── Haversine geo search via raw SQL ────────────────────────────────────────
  //
  // Strategy:
  //   1. Pre-filter with a bounding box (uses the @@index([latitude,longitude]))
  //      to avoid full table scan.
  //   2. Apply exact Haversine filter inside the same query.
  //   3. Prisma ORM cannot express computed columns in ORDER BY, so we use
  //      $queryRaw for the geo case and reconstruct the same shape as venueCardSelect.
  //
  private async geoSearch(params: {
    lat: number; lng: number; radius: number;
    q?: string; city?: string;
    date?: string; startTime?: string; endTime?: string;
    minPrice?: number; maxPrice?: number;
    minCapacity?: number; categoryId?: string; amenityIds?: string;
    bookingType?: string; isAccessible?: boolean; hasParking?: boolean;
    isOutdoor?: boolean; allowsPets?: boolean; minRating?: number;
    sortBy: string; page: number; limit: number;
  }) {
    const {
      lat, lng, radius,
      q, city, date, startTime, endTime,
      minPrice, maxPrice, minCapacity, categoryId, amenityIds,
      bookingType, isAccessible, hasParking, isOutdoor, allowsPets,
      minRating, sortBy, page, limit,
    } = params;

    // Bounding box for index pre-filter (1° lat ≈ 111 km)
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180));
    const latMin = lat - latDelta;
    const latMax = lat + latDelta;
    const lngMin = lng - lngDelta;
    const lngMax = lng + lngDelta;

    // Build Prisma WHERE for all non-geo filters — then extract IDs via ORM
    // so we don't have to re-implement complex filters in raw SQL.
    const where: Prisma.VenueWhereInput = {
      status:   "ACTIVE",
      deletedAt: null,
      latitude:  { gte: latMin, lte: latMax },
      longitude: { gte: lngMin, lte: lngMax },
    };

    if (q) {
      where.OR = [
        { title:            { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
        { city:             { contains: q, mode: "insensitive" } },
        { address:          { contains: q, mode: "insensitive" } },
      ];
    }
    if (city)        where.city         = { contains: city, mode: "insensitive" };
    if (date && startTime && endTime) {
      where.bookings = {
        none: {
          date:   new Date(date),
          status: { in: ["CONFIRMED", "AWAITING_PAYMENT"] },
          OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }],
        },
      };
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.pricePerHour = {};
      if (minPrice !== undefined) where.pricePerHour.gte = minPrice;
      if (maxPrice !== undefined) where.pricePerHour.lte = maxPrice;
    }
    if (minCapacity) where.capacity     = { gte: minCapacity };
    if (categoryId)  where.categoryId   = categoryId;
    if (bookingType) where.bookingType  = bookingType as any;
    if (isAccessible) where.isAccessible = true;
    if (hasParking)   where.hasParking   = true;
    if (isOutdoor)    where.isOutdoor    = true;
    if (allowsPets)   where.allowsPets   = true;
    if (minRating)    where.averageRating = { gte: minRating };
    if (amenityIds) {
      const ids = amenityIds.split(",").filter(Boolean);
      if (ids.length > 0) where.amenities = { some: { amenityId: { in: ids } } };
    }

    // Get IDs + coordinates of candidates (bounding-box filtered)
    const candidates = await db.venue.findMany({
      where,
      select: { id: true, latitude: true, longitude: true },
    });

    if (candidates.length === 0) return { venues: [], total: 0 };

    // Apply exact Haversine filter in JS (candidates are already a small set)
    const R = 6371; // Earth radius km
    const toRad = (d: number) => (d * Math.PI) / 180;

    const withDistance = candidates
      .map((c) => {
        const dLat = toRad(c.latitude  - lat);
        const dLng = toRad(c.longitude - lng);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat)) * Math.cos(toRad(c.latitude)) *
          Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { id: c.id, dist };
      })
      .filter((c) => c.dist <= radius);

    if (withDistance.length === 0) return { venues: [], total: 0 };

    // Sort by distance or other criteria
    if (sortBy === "distance") {
      withDistance.sort((a, b) => a.dist - b.dist);
    }

    const total = withDistance.length;

    // Paginate the sorted ID list
    const pageIds = withDistance
      .slice((page - 1) * limit, page * limit)
      .map((c) => c.id);

    // Fetch full venue data for the page
    const venueMap = await db.venue.findMany({
      where:  { id: { in: pageIds } },
      select: venueCardSelect,
    });

    // Re-order to match sorted IDs (db returns arbitrary order)
    const indexed = new Map(venueMap.map((v) => [v.id, v]));
    const venues  = pageIds.map((id) => indexed.get(id)).filter(Boolean) as typeof venueMap;

    // Attach distance_km to each result for the frontend
    const distMap = new Map(withDistance.map((c) => [c.id, c.dist]));
    const venuesWithDist = venues.map((v) => ({
      ...v,
      distanceKm: Math.round(distMap.get(v.id)! * 10) / 10,
    }));

    // Non-distance sorts: re-sort the page after fetching
    if (sortBy !== "distance") {
      venuesWithDist.sort((a, b) => {
        switch (sortBy) {
          case "price_asc":  return Number(a.pricePerHour) - Number(b.pricePerHour);
          case "price_desc": return Number(b.pricePerHour) - Number(a.pricePerHour);
          case "rating":     return (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0);
          default:           return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        }
      });
    }

    return { venues: venuesWithDist, total };
  }

  async getById(id: string, incrementView = false) {
    const venue = await db.venue.findFirst({
      where: { id, deletedAt: null },
      select: venueDetailSelect,
    });

    if (!venue) throw new NotFoundError("Espacio no encontrado");

    if (incrementView) {
      await db.venue.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return venue;
  }

  async getBySlug(slug: string) {
    const venue = await db.venue.findFirst({
      where: { slug, status: "ACTIVE", deletedAt: null },
      select: venueDetailSelect,
    });
    if (!venue) throw new NotFoundError("Espacio no encontrado");
    return venue;
  }

  async create(data: VenueCreateInput, ownerId: string) {
    const slug = await this.generateUniqueSlug(data.title);
    const completeness = calculateCompleteness({ ...data, images: [] });

    const venue = await db.venue.create({
      data: {
        ownerId,
        slug,
        completenessScore: completeness,
        title: data.title,
        description: data.description,
        shortDescription: data.shortDescription,
        address: data.address,
        addressLine2: data.addressLine2,
        city: data.city,
        cityId: data.cityId,
        postalCode: data.postalCode,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        categoryId: data.categoryId,
        capacity: data.capacity,
        minHours: data.minHours,
        maxHours: data.maxHours,
        bufferMinutes: data.bufferMinutes,
        pricePerHour: data.pricePerHour,
        cleaningFee: data.cleaningFee,
        depositAmount: data.depositAmount,
        bookingType: data.bookingType,
        isIndoor: data.isIndoor,
        isOutdoor: data.isOutdoor,
        hasParking: data.hasParking,
        isAccessible: data.isAccessible,
        allowsPets: data.allowsPets,
        allowsMusic: data.allowsMusic,
        allowsAlcohol: data.allowsAlcohol,
        allowsCatering: data.allowsCatering,
        allowsSmoking: data.allowsSmoking,
        houseRules: data.houseRules,
        cancellationPolicy: data.cancellationPolicy
          ? (data.cancellationPolicy as Prisma.InputJsonValue)
          : undefined,
        amenities:
          data.amenityIds.length > 0
            ? {
                create: data.amenityIds.map((amenityId) => ({ amenityId })),
              }
            : undefined,
      },
    });

    // Create default availability (Mon-Fri 9-21, Sat-Sun closed)
    await db.availabilityRule.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        venueId: venue.id,
        dayOfWeek: day,
        openTime: "09:00",
        closeTime: "21:00",
        isOpen: day !== 0 && day !== 6, // closed Sun, Sat
      })),
    });

    return venue;
  }

  async update(
    id: string,
    data: VenueUpdateInput,
    userId: string,
    userRole: Role
  ) {
    const venue = await db.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundError();
    if (venue.ownerId !== userId && userRole !== "ADMIN") throw new ForbiddenError();

    // Destructure amenityIds out so it doesn't get passed to Prisma
    const { amenityIds, ...venueFields } = data;
    const updateData: Prisma.VenueUpdateInput = { ...venueFields };

    if (amenityIds !== undefined) {
      await db.venueAmenity.deleteMany({ where: { venueId: id } });
      if (amenityIds.length > 0) {
        await db.venueAmenity.createMany({
          data: amenityIds.map((amenityId) => ({ venueId: id, amenityId })),
        });
      }
    }

    return db.venue.update({ where: { id }, data: updateData });
  }

  async publish(id: string, userId: string, userRole: Role) {
    const venue = await db.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundError();
    if (venue.ownerId !== userId && userRole !== "ADMIN") throw new ForbiddenError();
    if (venue.completenessScore < 60)
      throw new ValidationError(
        "El anuncio no está lo suficientemente completo para publicarse (mínimo 60%)"
      );

    return db.venue.update({
      where: { id },
      data: {
        status: userRole === "ADMIN" ? "ACTIVE" : "PENDING_REVIEW",
        publishedAt: new Date(),
      },
    });
  }

  async softDelete(id: string, userId: string, userRole: Role) {
    const venue = await db.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundError();
    if (venue.ownerId !== userId && userRole !== "ADMIN") throw new ForbiddenError();

    return db.venue.update({
      where: { id },
      data: { deletedAt: new Date(), status: "PAUSED" },
    });
  }

  async getFeatured(limit = 8) {
    return db.venue.findMany({
      where: { isFeatured: true, status: "ACTIVE", deletedAt: null },
      select: venueCardSelect,
      orderBy: { averageRating: "desc" },
      take: limit,
    });
  }

  async getSimilar(venueId: string, limit = 4) {
    const venue = await db.venue.findUnique({
      where: { id: venueId },
      select: { categoryId: true, city: true, pricePerHour: true },
    });
    if (!venue) return [];

    return db.venue.findMany({
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
      take: limit,
      orderBy: { averageRating: "desc" },
    });
  }

  // ── Owner dashboard ────────────────────────────

  async getOwnerVenues(ownerId: string) {
    return db.venue.findMany({
      where: { ownerId, deletedAt: null },
      select: {
        ...venueCardSelect,
        status: true,
        completenessScore: true,
        totalBookings: true,
        viewCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ── Private helpers ────────────────────────────

  private buildOrderBy(sortBy: string): Prisma.VenueOrderByWithRelationInput[] {
    switch (sortBy) {
      case "price_asc":
        return [{ pricePerHour: "asc" }];
      case "price_desc":
        return [{ pricePerHour: "desc" }];
      case "rating":
        return [{ averageRating: "desc" }, { totalReviews: "desc" }];
      case "newest":
        return [{ publishedAt: "desc" }];
      default:
        return [{ isFeatured: "desc" }, { averageRating: "desc" }];
    }
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    let slug = slugify(title);
    let suffix = 0;
    while (true) {
      const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
      const exists = await db.venue.findUnique({ where: { slug: candidate } });
      if (!exists) return candidate;
      suffix++;
    }
  }
}

export const venueService = new VenueService();
