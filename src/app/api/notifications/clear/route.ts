export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";


// DELETE /api/notifications/clear — delete all notifications for the user
export async function DELETE(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await db.notification.deleteMany({
    where: { userId: session.user.id },
  });

  return new NextResponse(null, { status: 204 });
}
