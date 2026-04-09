export const dynamic = "force-dynamic";
import { ok, handleApiError } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";


export const GET = withAdmin(async () => {
  try {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));

    const data = await Promise.all(
      months.map(async (month) => {
        const start = startOfMonth(month);
        const end = endOfMonth(month);

        const [revenueResult, bookingsCount] = await Promise.all([
          db.booking.aggregate({
            where: {
              status: { in: ["CONFIRMED", "COMPLETED"] },
              confirmedAt: { gte: start, lte: end },
            },
            _sum: { total: true, platformFee: true },
          }),
          db.booking.count({
            where: {
              status: { in: ["CONFIRMED", "COMPLETED"] },
              confirmedAt: { gte: start, lte: end },
            },
          }),
        ]);

        return {
          month: format(month, "MMM", { locale: es }),
          revenue: Number(revenueResult._sum.total ?? 0),
          commission: Number(revenueResult._sum.platformFee ?? 0),
          bookings: bookingsCount,
        };
      })
    );

    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
});
