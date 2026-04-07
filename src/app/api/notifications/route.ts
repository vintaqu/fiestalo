import { ok, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/auth-middleware";
import { notificationService } from "@/services/notification.service";

export const GET = withAuth(async (req, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    const { notifications, total } =
      await notificationService.getUserNotifications(userId, page, limit);
    const unreadCount = await notificationService.getUnreadCount(userId);

    return ok({ notifications, total, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PATCH = withAuth(async (req, { userId }) => {
  try {
    const body = await req.json();
    const { id, all } = body;

    if (all) {
      await notificationService.markAllRead(userId);
    } else if (id) {
      await notificationService.markRead(id, userId);
    }

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
});
