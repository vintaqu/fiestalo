import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const venue = await db.venue.findUnique({
    where: { id: params.id, deletedAt: null },
    select: { id: true, ownerId: true, status: true, completenessScore: true },
  });

  if (!venue) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (venue.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // Toggle: if active => pause, if draft/paused => submit for review
  let newStatus: string;
  if (venue.status === "ACTIVE") {
    newStatus = "PAUSED";
  } else if (venue.status === "PAUSED" || venue.status === "DRAFT") {
    if (venue.completenessScore < 40) {
      return NextResponse.json(
        { error: "El anuncio está incompleto (mínimo 40%). Añade más información antes de publicar." },
        { status: 422 }
      );
    }
    // Admin can publish directly; owner submits for review
    newStatus = session.user.role === "ADMIN" ? "ACTIVE" : "PENDING_REVIEW";
  } else {
    return NextResponse.json(
      { error: "No se puede cambiar el estado desde " + venue.status },
      { status: 422 }
    );
  }

  const updated = await db.venue.update({
    where: { id: params.id },
    data: {
      status: newStatus as any,
      publishedAt: newStatus === "ACTIVE" ? new Date() : undefined,
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ data: updated });
}
