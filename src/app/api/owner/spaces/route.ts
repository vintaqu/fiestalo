import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { venueCreateSchema } from "@/lib/validations";
import { slugify } from "@/utils/slugify";
import { calculateCompleteness } from "@/utils/venue-completeness";
import { ZodError } from "zod";

async function generateUniqueSlug(title: string): Promise<string> {
  let slug = slugify(title);
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const exists = await db.venue.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
    suffix++;
  }
}

// GET /api/owner/spaces — list own spaces
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!["OWNER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const venues = await db.venue.findMany({
    where: { ownerId: session.user.id, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      city: true,
      pricePerHour: true,
      capacity: true,
      totalBookings: true,
      viewCount: true,
      completenessScore: true,
      averageRating: true,
      totalReviews: true,
      isFeatured: true,
      createdAt: true,
      category: { select: { name: true, icon: true } },
      images: { where: { isCover: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: venues });
}

// POST /api/owner/spaces — create new space
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!["OWNER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = venueCreateSchema.parse(body);

    const slug = await generateUniqueSlug(data.title);
    const completeness = calculateCompleteness({ ...data, images: [] });

    const venue = await db.venue.create({
      data: {
        ownerId: session.user.id,
        slug,
        completenessScore: completeness,
        title: data.title,
        description: data.description,
        shortDescription: data.shortDescription,
        address: data.address,
        addressLine2: data.addressLine2,
        city: data.city,
        cityId: data.cityId || undefined,
        postalCode: data.postalCode,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        categoryId: data.categoryId || undefined,
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
        status: "DRAFT",
        amenities:
          data.amenityIds?.length > 0
            ? { create: data.amenityIds.map((amenityId) => ({ amenityId })) }
            : undefined,
      },
    });

    // Default availability rules (Mon-Sun 9-21)
    await db.availabilityRule.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        venueId: venue.id,
        dayOfWeek: day,
        openTime: "09:00",
        closeTime: "21:00",
        isOpen: true,
      })),
    });

    return NextResponse.json({ data: venue }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[POST /api/owner/spaces]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
