import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { availabilityService } from "@/services/availability.service";

const createSchema = z.object({
  venueId:   z.string().min(1),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason:    z.string().max(200).optional(),
}).refine(
  (d) => (!d.startTime && !d.endTime) || (d.startTime && d.endTime),
  { message: "Debes proporcionar startTime y endTime juntos, o ninguno (día completo)" }
);

const listSchema = z.object({
  venueId: z.string().min(1),
  from:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// GET /api/owner/blocks?venueId=&from=&to=
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const p = Object.fromEntries(new URL(req.url).searchParams);
    const { venueId, from, to } = listSchema.parse(p);

    const now  = new Date();
    const fromDate = from ? new Date(from) : now;
    const toDate   = to   ? new Date(to)   : new Date(now.getFullYear(), now.getMonth() + 3, 0);

    const blocks = await availabilityService.getBlocksForVenue(venueId, fromDate, toDate);
    return NextResponse.json({ data: blocks });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: err.message ?? "Error" }, { status: 500 });
  }
}

// POST /api/owner/blocks
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!["OWNER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const block = await availabilityService.addBlock(
      data.venueId,
      session.user.id,
      data.date,
      data.startTime,
      data.endTime,
      data.reason
    );

    return NextResponse.json({ data: block }, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err.message ?? "Error" }, { status: err.statusCode ?? 500 });
  }
}
