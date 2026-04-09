export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";


// GET /api/admin/payments — paginated payment list for admin dashboard
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page   = Number(searchParams.get("page")   ?? "1");
  const limit  = Number(searchParams.get("limit")  ?? "20");
  const status = searchParams.get("status");

  const where = status ? { status: status as any } : {};

  const [total, payments] = await db.$transaction([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            total: true,
            status: true,
            tenant: { select: { name: true, email: true } },
            venue:  { select: { title: true } },
          },
        },
        refunds: { select: { amount: true, processedAt: true, refundType: true } },
      },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
  ]);

  return NextResponse.json({
    data: payments,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
