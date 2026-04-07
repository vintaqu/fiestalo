import { ok, created, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/auth-middleware";
import { bookingCreateSchema } from "@/lib/validations";
import { bookingService } from "@/services/booking.service";

export const GET = withAuth(async (req, { userId, userRole }) => {
  try {
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId") ?? undefined;

    if (userRole === "OWNER" || userRole === "ADMIN") {
      const bookings = await bookingService.getOwnerBookings(userId, venueId);
      return ok(bookings);
    }

    const bookings = await bookingService.getTenantBookings(userId);
    return ok(bookings);
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withAuth(async (req, { userId }) => {
  try {
    const body = await req.json();
    const data = bookingCreateSchema.parse(body);
    const booking = await bookingService.create(data, userId);
    return created(booking);
  } catch (error) {
    return handleApiError(error);
  }
});
