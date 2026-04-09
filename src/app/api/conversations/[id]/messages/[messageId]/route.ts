import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { messagingService } from "@/services/messaging.service";

export const dynamic = "force-dynamic";

// DELETE /api/conversations/[id]/messages/[messageId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    await messagingService.deleteMessage(params.messageId, session.user.id, session.user.role);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
