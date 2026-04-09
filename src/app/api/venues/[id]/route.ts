export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  ok,
  noContent,
  handleApiError,
} from "@/lib/api-response";
import { withAuth } from "@/lib/auth-middleware";
import { venueUpdateSchema } from "@/lib/validations";
import { venueService } from "@/services/venue.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venue = await venueService.getById(params.id, true);
    return ok(venue);
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withAuth(async (req, { params, userId, userRole }) => {
  try {
    const body = await req.json();
    const data = venueUpdateSchema.parse(body);
    const venue = await venueService.update(params!.id, data, userId, userRole);
    return ok(venue);
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = withAuth(async (req, { params, userId, userRole }) => {
  try {
    await venueService.softDelete(params!.id, userId, userRole);
    return noContent();
  } catch (error) {
    return handleApiError(error);
  }
});
