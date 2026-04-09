export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear,
  startOfDay, endOfDay, eachMonthOfInterval, format,
} from "date-fns";
import { es } from "date-fns/locale";

// ── Auth guard ────────────────────────────────────────────────────────────────
async function guard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

// ── Date range helpers ────────────────────────────────────────────────────────
function getRange(sp: URLSearchParams): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const preset = sp.get("preset") ?? "this_month";
  const now    = new Date();

  let start: Date, end: Date;

  switch (preset) {
    case "this_year":
      start = startOfYear(now);
      end   = endOfYear(now);
      break;
    case "last_month": {
      const last = subMonths(now, 1);
      start = startOfMonth(last);
      end   = endOfMonth(last);
      break;
    }
    case "last_3":
      start = startOfMonth(subMonths(now, 2));
      end   = endOfMonth(now);
      break;
    case "last_6":
      start = startOfMonth(subMonths(now, 5));
      end   = endOfMonth(now);
      break;
    case "last_12":
      start = startOfMonth(subMonths(now, 11));
      end   = endOfMonth(now);
      break;
    case "custom": {
      const from = sp.get("from");
      const to   = sp.get("to");
      start = from ? startOfDay(new Date(from)) : startOfMonth(now);
      end   = to   ? endOfDay(new Date(to))     : endOfMonth(now);
      break;
    }
    default: // this_month
      start = startOfMonth(now);
      end   = endOfMonth(now);
  }

  const duration   = end.getTime() - start.getTime();
  const prevEnd    = new Date(start.getTime() - 1);
  const prevStart  = new Date(prevEnd.getTime() - duration);

  return { start, end, prevStart, prevEnd };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp         = new URL(req.url).searchParams;
  const { start, end, prevStart, prevEnd } = getRange(sp);

  // Optional filters
  const ownerId    = sp.get("ownerId")    ?? undefined;
  const city       = sp.get("city")       ?? undefined;
  const categoryId = sp.get("categoryId") ?? undefined;

  // Venue filter (applies when ownerId / city / category set)
  const venueWhere: any = { deletedAt: null };
  if (ownerId)    venueWhere.ownerId    = ownerId;
  if (city)       venueWhere.city       = { contains: city, mode: "insensitive" };
  if (categoryId) venueWhere.categoryId = categoryId;

  const hasVenueFilter = !!(ownerId || city || categoryId);

  // Booking base where
  const bWhere: any = {
    status: { in: ["CONFIRMED", "COMPLETED"] },
    confirmedAt: { gte: start, lte: end },
  };
  const bWherePrev: any = {
    status: { in: ["CONFIRMED", "COMPLETED"] },
    confirmedAt: { gte: prevStart, lte: prevEnd },
  };

  if (hasVenueFilter) {
    const venueIds = (await db.venue.findMany({ where: venueWhere, select: { id: true } }))
      .map((v) => v.id);
    bWhere.venueId     = { in: venueIds };
    bWherePrev.venueId = { in: venueIds };
  }

  // ── Run all queries in parallel ───────────────────────────────────────────

  const [
    // Period KPIs
    revCurrent, revPrev,
    bookingsCurrent, bookingsPrev,
    // User KPIs
    newUsers, newUsersPrev, totalUsers,
    // Venue KPIs
    activeVenues, pendingVenues, totalVenues,
    // Review KPIs
    newReviews, avgRating,
    // Cancellations
    cancelsCurrent, cancelsPrev,
    // Top venues
    topVenueRaw,
    // Top owners
    topOwnerRaw,
    // Monthly series (for charts) — always last 12 months
    monthlyRaw,
    // Booking status distribution
    statusDist,
    // City distribution
    cityDist,
    // Category distribution
    categoryDist,
    // Recent activity
    recentBookings,
    // Pending reviews to moderate
    pendingReviews,
  ] = await Promise.all([
    // Revenue current / prev
    db.booking.aggregate({ where: bWhere,     _sum: { total: true, platformFee: true } }),
    db.booking.aggregate({ where: bWherePrev, _sum: { total: true, platformFee: true } }),
    // Bookings count
    db.booking.count({ where: bWhere }),
    db.booking.count({ where: bWherePrev }),
    // Users
    db.user.count({ where: { createdAt: { gte: start, lte: end }, deletedAt: null } }),
    db.user.count({ where: { createdAt: { gte: prevStart, lte: prevEnd }, deletedAt: null } }),
    db.user.count({ where: { deletedAt: null } }),
    // Venues
    db.venue.count({ where: { status: "ACTIVE", deletedAt: null } }),
    db.venue.count({ where: { status: "PENDING_REVIEW", deletedAt: null } }),
    db.venue.count({ where: { deletedAt: null } }),
    // Reviews
    db.review.count({ where: { createdAt: { gte: start, lte: end } } }),
    db.review.aggregate({ where: { isPublished: true }, _avg: { rating: true } }),
    // Cancellations
    db.booking.count({ where: { ...bWhere,     status: { in: ["CANCELLED_BY_USER", "CANCELLED_BY_OWNER"] } } }),
    db.booking.count({ where: { ...bWherePrev, status: { in: ["CANCELLED_BY_USER", "CANCELLED_BY_OWNER"] } } }),
    // Top venues by revenue (current period)
    db.booking.groupBy({
      by:      ["venueId"],
      where:   bWhere,
      _sum:    { total: true, platformFee: true },
      _count:  { id: true },
      orderBy: { _sum: { total: "desc" } },
      take:    8,
    }),
    // Top owners computed after Promise.all via separate query — placeholder
    Promise.resolve([]),
    // Monthly series — last 12 months always
    Promise.all(
      eachMonthOfInterval({
        start: startOfMonth(subMonths(new Date(), 11)),
        end:   endOfMonth(new Date()),
      }).map(async (month) => {
        const s = startOfMonth(month);
        const e = endOfMonth(month);
        const monthBWhere = {
          ...bWhere,
          confirmedAt: { gte: s, lte: e },
        };
        const [rev, cnt, newU, cancelled] = await Promise.all([
          db.booking.aggregate({ where: monthBWhere, _sum: { total: true, platformFee: true } }),
          db.booking.count({ where: monthBWhere }),
          db.user.count({ where: { createdAt: { gte: s, lte: e }, deletedAt: null } }),
          db.booking.count({ where: { ...monthBWhere, status: { in: ["CANCELLED_BY_USER", "CANCELLED_BY_OWNER"] } } }),
        ]);
        return {
          month:      format(month, "MMM yy", { locale: es }),
          revenue:    Number(rev._sum.total      ?? 0),
          commission: Number(rev._sum.platformFee ?? 0),
          bookings:   cnt,
          newUsers:   newU,
          cancelled,
        };
      })
    ),
    // Status distribution
    db.booking.groupBy({
      by:      ["status"],
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    // City distribution
    db.venue.groupBy({
      by:      ["city"],
      where:   { status: "ACTIVE", deletedAt: null },
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
      take:    8,
    }),
    // Category distribution
    db.venue.groupBy({
      by:      ["categoryId"],
      where:   { status: "ACTIVE", deletedAt: null, categoryId: { not: null } },
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
      take:    6,
    }),
    // Recent bookings
    db.booking.findMany({
      where:   bWhere,
      include: {
        tenant: { select: { name: true, email: true, image: true } },
        venue:  { select: { title: true, city: true, owner: { select: { name: true } } } },
        payment:{ select: { status: true } },
      },
      orderBy: { confirmedAt: "desc" },
      take:    20,
    }),
    // Pending reviews
    db.review.count({ where: { isPublished: false, isFlagged: false } }),
  ]);

  // ── Enrich top venues with names ─────────────────────────────────────────
  const venueIds = topVenueRaw.map((r) => r.venueId);
  const venueDetails = await db.venue.findMany({
    where:  { id: { in: venueIds } },
    select: { id: true, title: true, city: true, owner: { select: { name: true } } },
  });
  const venueMap = new Map(venueDetails.map((v) => [v.id, v]));

  const topVenues = topVenueRaw.map((r) => ({
    venueId:    r.venueId,
    title:      venueMap.get(r.venueId)?.title ?? "Desconocido",
    city:       venueMap.get(r.venueId)?.city  ?? "",
    ownerName:  venueMap.get(r.venueId)?.owner?.name ?? "",
    revenue:    Number(r._sum.total      ?? 0),
    commission: Number(r._sum.platformFee ?? 0),
    bookings:   r._count.id,
  }));

  // ── Top owners via raw aggregation ────────────────────────────────────────
  const topOwnersRaw = await db.booking.findMany({
    where:   bWhere,
    select:  { total: true, platformFee: true, venue: { select: { ownerId: true, owner: { select: { name: true, email: true } } } } },
  });
  const ownerAgg: Record<string, { name: string; email: string; revenue: number; commission: number; bookings: number }> = {};
  for (const b of topOwnersRaw) {
    const oid = b.venue.ownerId;
    if (!ownerAgg[oid]) ownerAgg[oid] = { name: b.venue.owner.name ?? "", email: "", revenue: 0, commission: 0, bookings: 0 };
    ownerAgg[oid].revenue    += Number(b.total      ?? 0);
    ownerAgg[oid].commission += Number(b.platformFee ?? 0);
    ownerAgg[oid].bookings   += 1;
  }
  const topOwners = Object.entries(ownerAgg)
    .map(([ownerId, d]) => ({ ownerId, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // ── Enrich category distribution ─────────────────────────────────────────
  const catIds = categoryDist.map((c) => c.categoryId!).filter(Boolean);
  const cats   = await db.category.findMany({
    where:  { id: { in: catIds } },
    select: { id: true, name: true, icon: true },
  });
  const catMap = new Map(cats.map((c) => [c.id, c]));

  // ── Compute KPIs with % change ────────────────────────────────────────────
  const pct = (curr: number, prev: number) =>
    prev === 0 ? null : Math.round(((curr - prev) / prev) * 100 * 10) / 10;

  const gmvCurrent  = Number(revCurrent._sum.total       ?? 0);
  const gmvPrev     = Number(revPrev._sum.total           ?? 0);
  const feeCurrent  = Number(revCurrent._sum.platformFee  ?? 0);
  const feePrev     = Number(revPrev._sum.platformFee     ?? 0);
  const cancelRate  = bookingsCurrent > 0
    ? Math.round((cancelsCurrent / (bookingsCurrent + cancelsCurrent)) * 100 * 10) / 10
    : 0;
  const cancelRatePrev = bookingsPrev > 0
    ? Math.round((cancelsPrev / (bookingsPrev + cancelsPrev)) * 100 * 10) / 10
    : 0;

  const avgTicket     = bookingsCurrent > 0 ? gmvCurrent / bookingsCurrent : 0;
  const avgTicketPrev = bookingsPrev > 0    ? gmvPrev    / bookingsPrev    : 0;

  return NextResponse.json({
    period: {
      start: start.toISOString(),
      end:   end.toISOString(),
      preset: sp.get("preset") ?? "this_month",
    },
    kpis: {
      gmv:          { value: gmvCurrent,       change: pct(gmvCurrent,    gmvPrev) },
      commission:   { value: feeCurrent,       change: pct(feeCurrent,    feePrev) },
      bookings:     { value: bookingsCurrent,  change: pct(bookingsCurrent, bookingsPrev) },
      avgTicket:    { value: avgTicket,        change: pct(avgTicket,     avgTicketPrev) },
      newUsers:     { value: newUsers,         change: pct(newUsers,      newUsersPrev) },
      totalUsers:   { value: totalUsers },
      activeVenues: { value: activeVenues },
      pendingVenues:{ value: pendingVenues },
      cancelRate:   { value: cancelRate,       change: pct(cancelRate,    cancelRatePrev) },
      newReviews:   { value: newReviews },
      avgRating:    { value: Math.round((avgRating._avg.rating ?? 0) * 100) / 100 },
      pendingReviews:{ value: pendingReviews },
      totalVenues:  { value: totalVenues },
    },
    charts: {
      monthly: monthlyRaw,
      statusDist: statusDist.map((s) => ({ status: s.status, count: s._count.id })),
      cityDist:   cityDist.map((c) => ({ city: c.city ?? "Sin ciudad", count: c._count.id })),
      categoryDist: categoryDist.map((c) => ({
        name:  catMap.get(c.categoryId!)?.name  ?? "Otro",
        icon:  catMap.get(c.categoryId!)?.icon  ?? "",
        count: c._count.id,
      })),
    },
    tables: {
      topVenues,
      topOwners,
      recentBookings,
    },
    filters: { ownerId, city, categoryId },
  });
}
