export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOwner } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, parseISO, format } from "date-fns";

const schema = z.object({
  venueId: z.string().min(1),
  month:   z.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM"),
});

// GET /api/owner/calendar?venueId=&month=YYYY-MM
export const GET = withOwner(async (req: NextRequest, { userId }) => {
  try {
    const p = Object.fromEntries(new URL(req.url).searchParams);
    const { venueId, month } = schema.parse(p);

    // Verify ownership
    const venue = await db.venue.findFirst({
      where: { id: venueId, ownerId: userId, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!venue) {
      return NextResponse.json({ error: "Espacio no encontrado" }, { status: 404 });
    }

    const [year, monthNum] = month.split("-").map(Number);
    const from = startOfMonth(new Date(year, monthNum - 1, 1));
    const to   = endOfMonth(from);

    // Fetch bookings with full detail for calendar
    const bookings = await db.booking.findMany({
      where: {
        venueId,
        date:   { gte: from, lte: to },
        status: { notIn: ["CANCELLED_BY_USER", "CANCELLED_BY_OWNER", "REFUNDED"] },
      },
      include: {
        tenant: { select: { id: true, name: true, email: true, image: true } },
        payment: { select: { status: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    // Fetch manual blocks
    const blocks = await db.blockedDate.findMany({
      where: { venueId, date: { gte: from, lte: to } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    // Fetch availability rules for this venue
    const availabilityRules = await db.availabilityRule.findMany({
      where: { venueId },
      orderBy: { dayOfWeek: "asc" },
    });

    // Normalize bookings
    const normalizedBookings = bookings.map((b) => ({
      id:         b.id,
      bookingRef: b.bookingRef,
      date:       format(b.date, "yyyy-MM-dd"),
      startTime:  b.startTime,
      endTime:    b.endTime,
      status:     b.status,
      guestCount: b.guestCount,
      total:      Number(b.total),
      tenant: {
        id:    b.tenant.id,
        name:  b.tenant.name ?? "Cliente",
        email: b.tenant.email,
        image: b.tenant.image,
      },
      paymentStatus: b.payment?.status ?? null,
    }));

    // Normalize blocks
    const normalizedBlocks = blocks.map((bl) => ({
      id:        bl.id,
      date:      format(bl.date, "yyyy-MM-dd"),
      startTime: bl.startTime ?? null,
      endTime:   bl.endTime   ?? null,
      reason:    bl.reason    ?? null,
      isFullDay: !bl.startTime && !bl.endTime,
    }));

    // Open days derived from rules (day of week 0=Sun..6=Sat)
    const openDays = availabilityRules
      .filter((r) => r.isOpen)
      .map((r) => ({
        dayOfWeek: r.dayOfWeek,
        openTime:  r.openTime,
        closeTime: r.closeTime,
      }));

    return NextResponse.json({
      data: {
        venue:     { id: venue.id, title: venue.title },
        month,
        bookings:  normalizedBookings,
        blocks:    normalizedBlocks,
        openDays,
      },
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }
    console.error("[GET /api/owner/calendar]", err);
    return NextResponse.json({ error: err.message ?? "Error interno" }, { status: 500 });
  }
});
