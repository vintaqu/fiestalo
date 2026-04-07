import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/db";

export const POST = withAdmin(async (_req: NextRequest, { params }) => {
  const venueId = params!.id as string;
  const newStatus = "suspend" === "suspend" ? "SUSPENDED" : "ACTIVE";

  await db.venue.update({
    where: { id: venueId },
    data:  { status: newStatus },
  });

  return NextResponse.json({ data: { status: newStatus } });
});
