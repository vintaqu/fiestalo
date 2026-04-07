import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const addImageSchema = z.object({
  url:          z.string().url(),
  cloudinaryId: z.string().min(1),
  alt:          z.string().max(200).optional(),
  width:        z.number().int().positive().optional(),
  height:       z.number().int().positive().optional(),
  isCover:      z.boolean().default(false),
});

const reorderSchema = z.object({
  images: z.array(
    z.object({
      id:        z.string(),
      sortOrder: z.number().int().min(0),
      isCover:   z.boolean().optional(),
    })
  ),
});

async function assertVenueOwner(venueId: string, userId: string, role: string) {
  const venue = await db.venue.findUnique({
    where:  { id: venueId, deletedAt: null },
    select: { id: true, ownerId: true },
  });
  if (!venue) return null;
  if (venue.ownerId !== userId && role !== "ADMIN") return null;
  return venue;
}

// GET /api/owner/spaces/[id]/images
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const venue = await assertVenueOwner(params.id, session.user.id, session.user.role);
  if (!venue) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const images = await db.venueImage.findMany({
    where:   { venueId: params.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ data: images });
}

// POST /api/owner/spaces/[id]/images — register a newly uploaded image
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const venue = await assertVenueOwner(params.id, session.user.id, session.user.role);
  if (!venue) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const data = addImageSchema.parse(body);

    // Max 20 images per venue
    const count = await db.venueImage.count({ where: { venueId: params.id } });
    if (count >= 20) {
      return NextResponse.json(
        { error: "Máximo 20 imágenes por espacio" },
        { status: 422 }
      );
    }

    // If this is the first image or isCover requested, make it cover
    const makeCover = data.isCover || count === 0;

    if (makeCover) {
      // Unset any existing cover
      await db.venueImage.updateMany({
        where: { venueId: params.id, isCover: true },
        data:  { isCover: false },
      });
    }

    const image = await db.venueImage.create({
      data: {
        venueId:      params.id,
        url:          data.url,
        cloudinaryId: data.cloudinaryId,
        alt:          data.alt,
        width:        data.width,
        height:       data.height,
        isCover:      makeCover,
        sortOrder:    count,
      },
    });

    // Update completeness score
    const allImages = await db.venueImage.count({ where: { venueId: params.id } });
    const { calculateCompleteness } = await import("@/utils/venue-completeness");
    const fullVenue = await db.venue.findUnique({ where: { id: params.id } });
    if (fullVenue) {
      const score = calculateCompleteness({
        ...fullVenue,
        images: Array.from({ length: allImages }),
      });
      await db.venue.update({
        where: { id: params.id },
        data:  { completenessScore: score },
      });
    }

    return NextResponse.json({ data: image }, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH /api/owner/spaces/[id]/images — reorder or set cover
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const venue = await assertVenueOwner(params.id, session.user.id, session.user.role);
  if (!venue) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const { images } = reorderSchema.parse(body);

    // Verify all images belong to this venue
    const owned = await db.venueImage.findMany({
      where:  { venueId: params.id },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((i) => i.id));
    const allOwned = images.every((img) => ownedIds.has(img.id));
    if (!allOwned) {
      return NextResponse.json({ error: "Imágenes no pertenecen a este espacio" }, { status: 403 });
    }

    // Ensure exactly one cover
    const coverImages = images.filter((i) => i.isCover === true);
    if (coverImages.length > 1) {
      return NextResponse.json({ error: "Solo puede haber una imagen de portada" }, { status: 422 });
    }

    // Atomic reorder
    await db.$transaction(
      images.map((img) =>
        db.venueImage.update({
          where: { id: img.id },
          data: {
            sortOrder: img.sortOrder,
            ...(img.isCover !== undefined ? { isCover: img.isCover } : {}),
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
