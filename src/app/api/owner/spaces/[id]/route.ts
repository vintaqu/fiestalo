import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { venueUpdateSchema } from "@/lib/validations";
import { calculateCompleteness } from "@/utils/venue-completeness";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

async function assertOwnership(venueId: string, userId: string, userRole: string) {
  const venue = await db.venue.findUnique({
    where: { id: venueId, deletedAt: null },
    select: { id: true, ownerId: true },
  });
  if (!venue) return { error: "Espacio no encontrado", status: 404 };
  if (venue.ownerId !== userId && userRole !== "ADMIN") {
    return { error: "Sin permisos", status: 403 };
  }
  return { venue };
}

// PATCH /api/owner/spaces/[id] — update
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const check = await assertOwnership(params.id, session.user.id, session.user.role);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const body = await req.json();
    const { amenityIds, ...fields } = venueUpdateSchema.parse(body);

    // Recalculate completeness if relevant fields changed
    const currentVenue = await db.venue.findUnique({
      where: { id: params.id },
      include: { images: true },
    });

    const mergedForCompleteness = { ...currentVenue, ...fields };
    const completeness = calculateCompleteness({
      ...mergedForCompleteness,
      images: currentVenue?.images ?? [],
      amenityIds: amenityIds ?? [],
    });

    // Update amenities if provided
    if (amenityIds !== undefined) {
      await db.venueAmenity.deleteMany({ where: { venueId: params.id } });
      if (amenityIds.length > 0) {
        await db.venueAmenity.createMany({
          data: amenityIds.map((amenityId) => ({ venueId: params.id, amenityId })),
        });
      }
    }

    // Sanitize optional FK fields — never pass "" to Prisma
    const { categoryId, cityId, ...restFields } = fields as any;
    const updateData = {
      ...restFields,
      completenessScore: completeness,
      ...(categoryId ? { categoryId } : {}),
      ...(cityId     ? { cityId }     : {}),
    };

    const updated = await db.venue.update({
      where: { id: params.id },
      data:  updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/owner/spaces/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/owner/spaces/[id] — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const check = await assertOwnership(params.id, session.user.id, session.user.role);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  // Prevent delete if there are upcoming confirmed bookings
  const upcomingBookings = await db.booking.count({
    where: {
      venueId: params.id,
      status: { in: ["CONFIRMED", "AWAITING_PAYMENT"] },
      date: { gte: new Date() },
    },
  });

  if (upcomingBookings > 0) {
    return NextResponse.json(
      { error: "No puedes eliminar un espacio con reservas futuras activas" },
      { status: 409 }
    );
  }

  await db.venue.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), status: "PAUSED" },
  });

  return new NextResponse(null, { status: 204 });
}
