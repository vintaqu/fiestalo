export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { messagingService } from "@/services/messaging.service";


const sendSchema = z.object({
  content: z.string().min(1).max(5000),
});

// GET /api/conversations/[id]/messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page  = Number(searchParams.get("page")  ?? "1");
  const limit = Number(searchParams.get("limit") ?? "50");

  try {
    const result = await messagingService.getMessages({
      conversationId: params.id,
      userId:         session.user.id,
      userRole:       session.user.role,
      page,
      limit,
    });
    return NextResponse.json({ data: result.messages, meta: { total: result.total, hasMore: result.hasMore, page } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

// POST /api/conversations/[id]/messages — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const { content } = sendSchema.parse(body);

    const message = await messagingService.sendMessage({
      conversationId: params.id,
      senderId:        session.user.id,
      senderRole:      session.user.role,
      content,
      type:            "TEXT",
    });

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: err.message ?? "Error interno" }, { status: 500 });
  }
}
