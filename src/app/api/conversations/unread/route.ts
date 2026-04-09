import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { messagingService } from "@/services/messaging.service";

export const dynamic = "force-dynamic";

// GET /api/conversations/unread
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const count = await messagingService.getTotalUnread(session.user.id);
  return NextResponse.json({ data: { unread: count } });
}
