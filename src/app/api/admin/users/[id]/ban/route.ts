import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const POST = withAdmin(async (_req: NextRequest, { params }) => {
  const userId = params!.id as string;
  await db.user.update({
    where: { id: userId },
    data:  { isBanned: true, isActive: false },
  });
  return NextResponse.json({ success: true });
});
