import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { availabilityService } from "@/services/availability.service";

// GET /api/availability?venueId=&date=&startTime=&endTime=
// GET /api/availability?venueId=&date=&slots=true  (free slots for a day)
// GET /api/availability?venueId=&year=&month=       (calendar month)

const checkSchema = z.object({
  venueId:   z.string().min(1),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
});

const slotsSchema = z.object({
  venueId: z.string().min(1),
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  step:    z.coerce.number().int().min(15).max(120).optional().default(30),
});

const calendarSchema = z.object({
  venueId: z.string().min(1),
  year:    z.coerce.number().int().min(2024).max(2100),
  month:   z.coerce.number().int().min(1).max(12),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const p = Object.fromEntries(searchParams);

  try {
    // ── Calendar month view ──────────────────────────────────────
    if (p.year && p.month) {
      const { venueId, year, month } = calendarSchema.parse(p);
      const calendar = await availabilityService.getCalendarMonth(venueId, year, month);
      return NextResponse.json({ data: calendar });
    }

    // ── Free slots for a day ─────────────────────────────────────
    if (p.slots === "true" || p.slots === "1") {
      const { venueId, date, step } = slotsSchema.parse(p);
      const slots = await availabilityService.getFreeSlotsForDay(venueId, date, step);
      return NextResponse.json({ data: slots });
    }

    // ── Single slot check ────────────────────────────────────────
    const { venueId, date, startTime, endTime } = checkSchema.parse(p);
    const result = await availabilityService.check(venueId, date, startTime, endTime);
    return NextResponse.json({ data: result });

  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "Parámetros inválidos", details: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[GET /api/availability]", err);
    return NextResponse.json({ error: err.message ?? "Error interno" }, { status: 500 });
  }
}
