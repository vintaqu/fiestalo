import { ok, handleApiError } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { notificationService } from "@/services/notification.service";

export const dynamic = "force-dynamic";

export const POST = withAdmin(async (req, { params }) => {
  try {
    const venueId = params!.id as string;
    const isApprove = req.url.includes("/approve");

    const venue = await db.venue.findUnique({
      where: { id: venueId },
      select: { ownerId: true, title: true },
    });

    if (!venue) return handleApiError(new Error("Not found"));

    await db.venue.update({
      where: { id: venueId },
      data: {
        status: isApprove ? "ACTIVE" : "REJECTED",
        publishedAt: isApprove ? new Date() : null,
      },
    });

    // Need slug for venue links
    const venueWithSlug = await db.venue.findUnique({ where: { id: venueId }, select: { slug: true } });
    await notificationService.notify({
      type: isApprove ? "VENUE_APPROVED" : "VENUE_REJECTED",
      venue: {
        id:      venueId,
        title:   venue.title,
        slug:    venueWithSlug?.slug ?? venueId,
        ownerId: venue.ownerId,
      },
    });

    return ok({ status: isApprove ? "ACTIVE" : "REJECTED" });
  } catch (error) {
    return handleApiError(error);
  }
});
