export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { v2 as cloudinary } from "cloudinary";


cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// DELETE /api/owner/spaces/[id]/images/[imageId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Find image and verify ownership
  const image = await db.venueImage.findUnique({
    where:   { id: params.imageId },
    include: { venue: { select: { ownerId: true } } },
  });

  if (!image) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  if (
    image.venue.ownerId !== session.user.id &&
    session.user.role !== "ADMIN"
  ) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (image.venueId !== params.id) {
    return NextResponse.json({ error: "Imagen no pertenece a este espacio" }, { status: 403 });
  }

  // Delete from Cloudinary (best-effort, don't fail if Cloudinary is down)
  if (image.cloudinaryId) {
    try {
      await cloudinary.uploader.destroy(image.cloudinaryId);
    } catch (err) {
      console.error("[image delete] Cloudinary destroy failed:", err);
    }
  }

  // Delete from DB
  await db.venueImage.delete({ where: { id: params.imageId } });

  // If deleted image was cover, promote next image as cover
  if (image.isCover) {
    const next = await db.venueImage.findFirst({
      where:   { venueId: params.id },
      orderBy: { sortOrder: "asc" },
    });
    if (next) {
      await db.venueImage.update({
        where: { id: next.id },
        data:  { isCover: true },
      });
    }
  }

  // Re-number sortOrders sequentially to avoid gaps
  const remaining = await db.venueImage.findMany({
    where:   { venueId: params.id },
    orderBy: { sortOrder: "asc" },
    select:  { id: true },
  });

  if (remaining.length > 0) {
    await db.$transaction(
      remaining.map((img, i) =>
        db.venueImage.update({
          where: { id: img.id },
          data:  { sortOrder: i },
        })
      )
    );
  }

  // Update completeness score
  try {
    const { calculateCompleteness } = await import("@/utils/venue-completeness");
    const fullVenue = await db.venue.findUnique({ where: { id: params.id } });
    if (fullVenue) {
      const score = calculateCompleteness({
        ...fullVenue,
        pricePerHour: fullVenue.pricePerHour ? Number(fullVenue.pricePerHour) : undefined,
        images: remaining,
      });
      await db.venue.update({
        where: { id: params.id },
        data:  { completenessScore: score },
      });
    }
  } catch {}

  return new NextResponse(null, { status: 204 });
}
