import { ok, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/db";

// Toggle favorite
export const POST = withAuth(async (req, { params, userId }) => {
  try {
    const venueId = params!.venueId as string;
    const existing = await db.favorite.findUnique({
      where: { userId_venueId: { userId, venueId } },
    });

    if (existing) {
      await db.favorite.delete({
        where: { userId_venueId: { userId, venueId } },
      });
      return ok({ favorited: false });
    } else {
      await db.favorite.create({ data: { userId, venueId } });
      return ok({ favorited: true });
    }
  } catch (error) {
    return handleApiError(error);
  }
});

// Get user favorites
export const GET = withAuth(async (req, { userId }) => {
  try {
    const favorites = await db.favorite.findMany({
      where: { userId },
      include: {
        venue: {
          select: {
            id: true,
            title: true,
            slug: true,
            pricePerHour: true,
            city: true,
            capacity: true,
            averageRating: true,
            totalReviews: true,
            isFeatured: true,
            isVerified: true,
            bookingType: true,
            shortDescription: true,
            images: { where: { isCover: true }, take: 1 },
            category: { select: { name: true, icon: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(favorites.map((f) => ({ ...f.venue, favoritedAt: f.createdAt })));
  } catch (error) {
    return handleApiError(error);
  }
});
