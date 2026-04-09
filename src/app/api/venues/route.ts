export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  paginated,
  created,
  handleApiError,
} from "@/lib/api-response";
import { withAuth } from "@/lib/auth-middleware";
import { searchSchema, venueCreateSchema } from "@/lib/validations";
import { venueService } from "@/services/venue.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = searchSchema.parse(Object.fromEntries(searchParams));

    const { venues, total } = await venueService.getAll(params);

    return paginated(venues, {
      page: params.page,
      limit: params.limit,
      total,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuth(async (req, { userId }) => {
  try {
    const body = await req.json();
    const data = venueCreateSchema.parse(body);
    const venue = await venueService.create(data, userId);
    return created(venue);
  } catch (error) {
    return handleApiError(error);
  }
}, ["OWNER", "ADMIN"]);
