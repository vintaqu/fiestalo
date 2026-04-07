import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { messagingService } from "@/services/messaging.service";
import { db } from "@/lib/db";

const createSchema = z.object({
  type:        z.enum(["VENUE_INQUIRY", "BOOKING_SUPPORT", "GENERAL"]).default("VENUE_INQUIRY"),
  venueId:     z.string().optional(),
  bookingId:   z.string().optional(),
  recipientId: z.string().min(1),
  subject:     z.string().max(200).optional(),
  firstMessage:z.string().min(1).max(2000),
});

// GET /api/conversations — list conversations for current user
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page     = Number(searchParams.get("page") ?? "1");
  const limit    = Number(searchParams.get("limit") ?? "20");
  const venueId  = searchParams.get("venueId") ?? undefined;
  const bookingId= searchParams.get("bookingId") ?? undefined;
  const archived = searchParams.get("archived") === "true";

  const result = await messagingService.getConversations({
    userId:   session.user.id,
    userRole: session.user.role,
    venueId, bookingId, archived, page, limit,
  });

  return NextResponse.json({ data: result.conversations, meta: { total: result.total, page, limit } });
}

// POST /api/conversations — start a new conversation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    // Validate recipient exists
    const recipient = await db.user.findUnique({
      where: { id: data.recipientId },
      select: { id: true },
    });
    if (!recipient) return NextResponse.json({ error: "Destinatario no encontrado" }, { status: 404 });

    // Can't message yourself
    if (data.recipientId === session.user.id) {
      return NextResponse.json({ error: "No puedes enviarte mensajes a ti mismo" }, { status: 422 });
    }

    const conversation = await messagingService.getOrCreateConversation({
      type:         data.type,
      venueId:      data.venueId,
      bookingId:    data.bookingId,
      subject:      data.subject,
      initiatorId:  session.user.id,
      recipientId:  data.recipientId,
      firstMessage: data.firstMessage,
    });

    return NextResponse.json({ data: conversation }, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: err.message ?? "Error interno" }, { status: 500 });
  }
}
