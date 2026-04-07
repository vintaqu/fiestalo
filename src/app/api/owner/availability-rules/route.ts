import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { availabilityService } from "@/services/availability.service";
import { db } from "@/lib/db";

const ruleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isOpen:    z.boolean(),
  openTime:  z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

const updateSchema = z.object({
  venueId: z.string().min(1),
  rules:   z.array(ruleSchema).length(7, "Debes enviar exactamente 7 reglas (0=Dom a 6=Sáb)"),
});

// GET /api/owner/availability-rules?venueId=
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const venueId = new URL(req.url).searchParams.get("venueId");
  if (!venueId) {
    return NextResponse.json({ error: "venueId requerido" }, { status: 400 });
  }

  const rules = await db.availabilityRule.findMany({
    where: { venueId },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({ data: rules });
}

// PUT /api/owner/availability-rules
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!["OWNER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { venueId, rules } = updateSchema.parse(body);

    const updated = await availabilityService.updateAvailabilityRules(
      venueId,
      session.user.id,
      rules
    );

    return NextResponse.json({ data: updated });
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
