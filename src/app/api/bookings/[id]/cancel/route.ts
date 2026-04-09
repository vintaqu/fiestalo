import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bookingService } from "@/services/booking.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const result = await bookingService.cancel(
      params.id,
      session.user.id,
      body.reason
    );
    return NextResponse.json({ data: result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Error al cancelar" },
      { status: err.statusCode ?? 500 }
    );
  }
}
