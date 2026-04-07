import { NextRequest } from "next/server";
import { ok, created, badRequest, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/auth-middleware";
import { reviewCreateSchema } from "@/lib/validations";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId");
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "10");

    if (!venueId) return badRequest("venueId requerido");

    const [total, reviews] = await db.$transaction([
      db.review.count({ where: { venueId, isPublished: true } }),
      db.review.findMany({
        where: { venueId, isPublished: true },
        include: {
          author: { select: { name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return ok({ reviews, total });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuth(async (req, { userId }) => {
  try {
    const body = await req.json();
    const data = reviewCreateSchema.parse(body);

    // Verify booking exists and belongs to user
    const booking = await db.booking.findFirst({
      where: {
        id: data.bookingId,
        tenantId: userId,
        status: "COMPLETED",
      },
    });

    if (!booking) {
      return badRequest("No puedes reseñar esta reserva");
    }

    // Check not already reviewed
    const existing = await db.review.findUnique({
      where: { bookingId: data.bookingId },
    });
    if (existing) return badRequest("Ya has reseñado esta reserva");

    const review = await db.review.create({
      data: {
        venueId:             booking.venueId,
        bookingId:           data.bookingId,
        authorId:            userId,
        rating:              data.rating,
        comment:             data.comment,
        cleanlinessRating:   data.cleanlinessRating,
        locationRating:      data.locationRating,
        valueRating:         data.valueRating,
        communicationRating: data.communicationRating,
        isPublished:         false, // pending admin moderation
      },
    });

    // Note: venue stats (averageRating, totalReviews) are updated
    // only when admin publishes the review — not on creation.

    // Notify venue owner of new review (async)
    db.venue.findUnique({
      where:  { id: booking.venueId },
      select: { ownerId: true, title: true },
    }).then((venue) => {
      if (!venue) return;
      const { notificationService } = require("@/services/notification.service");
      notificationService.notify({
        type: "REVIEW_NEW",
        review: {
          id:         review.id,
          venueId:    booking.venueId,
          venueTitle: venue.title,
          ownerId:    venue.ownerId,
          tenantId:   userId,
          rating:     data.rating,
        },
      }).catch(() => {});
    }).catch(() => {});

    return created(review);
  } catch (error) {
    return handleApiError(error);
  }
});
