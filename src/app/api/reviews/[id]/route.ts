export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";


const ownerResponseSchema = z.object({
  action:   z.literal("respond"),
  response: z.string().min(10).max(1000),
});

const adminActionSchema = z.object({
  action: z.enum(["publish", "unpublish", "flag", "unflag"]),
  reason: z.string().max(500).optional(),
});

const bodySchema = z.discriminatedUnion("action", [
  ownerResponseSchema,
  adminActionSchema,
]);

async function recalcVenueStats(venueId: string) {
  const stats = await db.review.aggregate({
    where:  { venueId, isPublished: true },
    _avg:   { rating: true },
    _count: { id: true },
  });
  await db.venue.update({
    where: { id: venueId },
    data: {
      averageRating: stats._avg.rating ?? 0,
      totalReviews:  stats._count.id,
    },
  });
}

// PATCH /api/reviews/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const review = await db.review.findUnique({
    where:   { id: params.id },
    include: { venue: { select: { ownerId: true, id: true } } },
  });

  if (!review) return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });

  let body: any;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // ── Owner: respond to review ───────────────────────────────────
  if (body.action === "respond") {
    if (review.venue.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }
    if (!review.isPublished) {
      return NextResponse.json({ error: "La reseña aún no ha sido publicada" }, { status: 422 });
    }

    const updated = await db.review.update({
      where: { id: params.id },
      data: {
        ownerResponse:    body.response.trim(),
        ownerRespondedAt: new Date(),
      },
    });

    // Notify reviewer that owner responded
    const { notificationService } = await import("@/services/notification.service");
    await notificationService.notify({
      type: "REVIEW_RESPONSE",
      review: {
        id:         review.id,
        venueId:    review.venueId,
        venueTitle: "",
        ownerId:    review.venue.ownerId,
        tenantId:   review.authorId,
        rating:     review.rating,
      },
    }).catch(() => {});

    return NextResponse.json({ data: updated });
  }

  // ── Admin: moderate review ─────────────────────────────────────
  if (!["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Sin permisos de administrador" }, { status: 403 });
  }

  switch (body.action) {
    case "publish": {
      const wasPublished = review.isPublished;
      await db.review.update({
        where: { id: params.id },
        data:  { isPublished: true, isFlagged: false, flagReason: null },
      });
      if (!wasPublished) {
        await recalcVenueStats(review.venueId);
        // Notify the reviewer their review is now live
        const { notificationService } = await import("@/services/notification.service");
        await notificationService.notify({
          type:   "SYSTEM",
          userId: review.authorId,
          title:  "Tu reseña ha sido publicada",
          body:   "Tu valoración ya es visible públicamente.",
          link:   `/venues/${review.venueId}#reviews`,
        }).catch(() => {});
      }
      break;
    }
    case "unpublish": {
      const wasPublished = review.isPublished;
      await db.review.update({
        where: { id: params.id },
        data:  { isPublished: false },
      });
      if (wasPublished) await recalcVenueStats(review.venueId);
      break;
    }
    case "flag": {
      await db.review.update({
        where: { id: params.id },
        data:  { isFlagged: true, flaggedAt: new Date(), flagReason: body.reason },
      });
      break;
    }
    case "unflag": {
      await db.review.update({
        where: { id: params.id },
        data:  { isFlagged: false, flaggedAt: null, flagReason: null },
      });
      break;
    }
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/reviews/[id] — admin only hard delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const review = await db.review.findUnique({
    where: { id: params.id },
    select: { venueId: true, isPublished: true },
  });
  if (!review) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await db.review.delete({ where: { id: params.id } });
  if (review.isPublished) await recalcVenueStats(review.venueId);

  return new NextResponse(null, { status: 204 });
}
