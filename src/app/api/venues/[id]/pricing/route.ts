import { NextRequest } from "next/server";
import { ok, badRequest, handleApiError } from "@/lib/api-response";
import { bookingService } from "@/services/booking.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");

    if (!date || !startTime || !endTime) {
      return badRequest("Faltan parámetros: date, startTime, endTime");
    }

    const pricing = await bookingService.calculatePrice(
      params.id,
      date,
      startTime,
      endTime
    );

    return ok(pricing);
  } catch (error) {
    return handleApiError(error);
  }
}
