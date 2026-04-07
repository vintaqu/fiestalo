import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { paymentService } from "@/services/payment.service";

const refundSchema = z.object({
  reason:         z.string().max(500).optional(),
  overrideAmount: z.number().positive().optional(), // admin-only
});

// POST /api/bookings/[id]/refund
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { reason, overrideAmount } = refundSchema.parse(body);

    // Only admins can override the refund amount
    if (overrideAmount && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos para override" }, { status: 403 });
    }

    const result = await paymentService.refund(
      params.id,
      session.user.id,
      reason,
      overrideAmount
    );

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Error procesando reembolso" },
      { status: error.statusCode ?? 500 }
    );
  }
}
