/**
 * AvailabilityService
 *
 * Handles all availability logic for Fiestalo venues:
 *   - Slot validation (hours, rules, blocks)
 *   - Overbooking prevention via atomic DB transactions with SELECT FOR UPDATE
 *   - Buffer enforcement between bookings
 *   - Manual owner blocks (full-day and partial)
 *   - Free slot enumeration for a given day
 *   - Calendar view (which days have any free slots)
 *   - Recalculation after cancellation
 *
 * All write operations that reserve a slot must go through
 * `acquireSlotLock()` — never bypass it.
 */

import { db } from "@/lib/db";
import { parseISO, format, addMinutes, addDays, startOfDay } from "date-fns";
import { Prisma } from "@prisma/client";
import { ValidationError, NotFoundError } from "@/lib/api-response";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface TimeSlot {
  startTime: string; // "HH:MM"
  endTime: string;
}

export interface AvailabilityResult {
  available: boolean;
  reason?: string;
  /** Populated only when available=true */
  pricing?: {
    pricePerHour: number;
    isSeasonalRate: boolean;
    seasonName?: string;
  };
}

export interface DayAvailability {
  date: string; // "YYYY-MM-DD"
  open: boolean;
  openTime?: string;
  closeTime?: string;
  /** Slots that are already taken (including buffers) */
  blockedSlots: TimeSlot[];
  /** Fully free contiguous slots >= minHours */
  freeSlots: TimeSlot[];
  /** True when every minute of the day is blocked */
  fullyBooked: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number; // 1-12
  days: Array<{
    date: string;
    available: boolean; // has at least one free slot >= minHours
    isOpen: boolean;    // venue opens this day at all
  }>;
}

// Statuses that "hold" a slot (must be checked for conflicts)
const HOLDING_STATUSES: Prisma.EnumBookingStatusFilter["in"] = [
  "PENDING",
  "AWAITING_PAYMENT",
  "CONFIRMED",
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

function addMinutesToTime(t: string, delta: number): string {
  return minutesToTime(Math.max(0, Math.min(1440, timeToMinutes(t) + delta)));
}

/** Interval overlap check — returns true if [s1,e1) and [s2,e2) overlap */
function overlaps(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 < e2 && e1 > s2;
}

function dateToISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

// ─────────────────────────────────────────────────────────────
// AvailabilityService
// ─────────────────────────────────────────────────────────────

export class AvailabilityService {

  // ── 1. Core availability check (read-only, fast) ──────────────

  /**
   * Check whether a specific slot is available.
   * Does NOT lock anything — use acquireSlotLock() inside a transaction
   * when you actually need to reserve the slot.
   */
  async check(
    venueId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<AvailabilityResult> {

    // ── Load venue with everything needed in one query ──────────
    const venue = await db.venue.findUnique({
      where: { id: venueId },
      select: {
        status: true,
        minHours: true,
        maxHours: true,
        bufferMinutes: true,
        availabilityRules: true,
        blockedDates: {
          where: { date: parseISO(date) },
        },
        seasonalPrices: {
          where: {
            startDate: { lte: parseISO(date) },
            endDate:   { gte: parseISO(date) },
          },
        },
      },
    });

    if (!venue) return { available: false, reason: "Espacio no encontrado" };
    if (venue.status !== "ACTIVE") {
      return { available: false, reason: "El espacio no está disponible actualmente" };
    }

    // ── 1a. Validate time order ─────────────────────────────────
    if (startTime >= endTime) {
      return { available: false, reason: "La hora de entrada debe ser anterior a la de salida" };
    }

    // ── 1b. Duration constraints ────────────────────────────────
    const durationH = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;

    if (durationH < venue.minHours) {
      return {
        available: false,
        reason: `Reserva mínima: ${venue.minHours}h`,
      };
    }

    if (venue.maxHours && durationH > venue.maxHours) {
      return {
        available: false,
        reason: `Reserva máxima: ${venue.maxHours}h`,
      };
    }

    // ── 1c. Opening hours for this weekday ──────────────────────
    const dayOfWeek = parseISO(date).getDay(); // 0=Sun
    const rule = venue.availabilityRules.find((r) => r.dayOfWeek === dayOfWeek);

    if (!rule || !rule.isOpen) {
      return { available: false, reason: "El espacio no abre este día" };
    }

    if (startTime < rule.openTime || endTime > rule.closeTime) {
      return {
        available: false,
        reason: `Horario disponible: ${rule.openTime}–${rule.closeTime}`,
      };
    }

    // ── 1d. Manual blocks by owner ──────────────────────────────
    for (const block of venue.blockedDates) {
      // Full-day block
      if (!block.startTime || !block.endTime) {
        return { available: false, reason: "Espacio bloqueado este día" };
      }
      // Partial block — overlaps the requested slot?
      if (overlaps(startTime, endTime, block.startTime, block.endTime)) {
        return {
          available: false,
          reason: block.reason
            ? `Franja bloqueada: ${block.reason}`
            : "Franja bloqueada por el propietario",
        };
      }
    }

    // ── 1e. Existing bookings (WITH buffer padding) ─────────────
    const buf = venue.bufferMinutes;
    // Effective "occupied" interval of requested slot (expanded by buffer)
    const checkStart = addMinutesToTime(startTime, -buf);
    const checkEnd   = addMinutesToTime(endTime,    buf);

    const conflict = await db.booking.findFirst({
      where: {
        venueId,
        date:   parseISO(date),
        status: { in: HOLDING_STATUSES },
        // A booking overlaps if its buffered range intersects ours
        AND: [
          { startTime: { lt: checkEnd } },
          { endTime:   { gt: checkStart } },
        ],
      },
      select: { id: true, startTime: true, endTime: true },
    });

    if (conflict) {
      return { available: false, reason: "Franja no disponible" };
    }

    // ── 1f. Price info (bonus) ──────────────────────────────────
    const dayOfWeekNum = parseISO(date).getDay();
    const seasonal = venue.seasonalPrices.find(
      (sp) => sp.daysOfWeek.length === 0 || sp.daysOfWeek.includes(dayOfWeekNum)
    );

    return {
      available: true,
      pricing: {
        pricePerHour: Number(seasonal?.pricePerHour),
        isSeasonalRate: !!seasonal,
        seasonName: (seasonal as any)?.name,
      },
    };
  }

  // ── 2. Atomic slot lock (use inside db.$transaction) ─────────

  /**
   * Acquires an exclusive lock on the slot using a Prisma raw query
   * (SELECT ... FOR UPDATE on a "locks" row).
   *
   * Pattern:
   *   await db.$transaction(async (tx) => {
   *     await availabilityService.acquireSlotLock(tx, venueId, date);
   *     // now safe to check conflicts and create booking
   *     const avail = await availabilityService.checkWithTx(tx, ...);
   *     if (!avail.available) throw new ValidationError(avail.reason!);
   *     await tx.booking.create({ ... });
   *   });
   *
   * The lock is released automatically when the transaction commits
   * or rolls back — no manual cleanup needed.
   */
  async acquireSlotLock(
    tx: Prisma.TransactionClient,
    venueId: string,
    date: string
  ): Promise<void> {
    // Lock the venue row itself for the duration of the transaction.
    // This serialises all concurrent booking attempts for the same venue+date.
    // We use a raw query because Prisma does not expose SELECT FOR UPDATE yet.
    await tx.$executeRaw`
      SELECT id FROM "Venue"
      WHERE id = ${venueId}
      FOR UPDATE
    `;
  }

  /**
   * Same as check() but uses the transaction client (tx) so all reads
   * are consistent within the locked transaction.
   */
  async checkWithTx(
    tx: Prisma.TransactionClient,
    venueId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<AvailabilityResult> {
    const venue = await tx.venue.findUnique({
      where: { id: venueId },
      select: {
        status: true,
        minHours: true,
        maxHours: true,
        bufferMinutes: true,
        availabilityRules: true,
        blockedDates: { where: { date: parseISO(date) } },
      },
    });

    if (!venue) return { available: false, reason: "Espacio no encontrado" };
    if (venue.status !== "ACTIVE") {
      return { available: false, reason: "El espacio no está disponible" };
    }

    if (startTime >= endTime) {
      return { available: false, reason: "Hora de entrada inválida" };
    }

    const durationH = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
    if (durationH < venue.minHours) {
      return { available: false, reason: `Mínimo ${venue.minHours}h` };
    }
    if (venue.maxHours && durationH > venue.maxHours) {
      return { available: false, reason: `Máximo ${venue.maxHours}h` };
    }

    const dayOfWeek = parseISO(date).getDay();
    const rule = venue.availabilityRules.find((r) => r.dayOfWeek === dayOfWeek);
    if (!rule || !rule.isOpen) {
      return { available: false, reason: "El espacio no abre este día" };
    }
    if (startTime < rule.openTime || endTime > rule.closeTime) {
      return {
        available: false,
        reason: `Horario: ${rule.openTime}–${rule.closeTime}`,
      };
    }

    for (const block of venue.blockedDates) {
      if (!block.startTime || !block.endTime) {
        return { available: false, reason: "Espacio bloqueado este día" };
      }
      if (overlaps(startTime, endTime, block.startTime, block.endTime)) {
        return { available: false, reason: "Franja bloqueada" };
      }
    }

    const buf = venue.bufferMinutes;
    const checkStart = addMinutesToTime(startTime, -buf);
    const checkEnd   = addMinutesToTime(endTime,    buf);

    const conflict = await tx.booking.findFirst({
      where: {
        venueId,
        date:   parseISO(date),
        status: { in: HOLDING_STATUSES },
        AND: [
          { startTime: { lt: checkEnd } },
          { endTime:   { gt: checkStart } },
        ],
      },
      select: { id: true },
    });

    if (conflict) {
      return { available: false, reason: "Franja ya reservada" };
    }

    return { available: true };
  }

  // ── 3. Free slots for a day ───────────────────────────────────

  /**
   * Returns all free contiguous slots (>= minHours, in bufferMinutes steps)
   * for a given venue and date.
   * Useful for displaying a time-picker to the user.
   */
  async getFreeSlotsForDay(
    venueId: string,
    date: string,
    slotStepMinutes = 30
  ): Promise<DayAvailability> {
    const venue = await db.venue.findUnique({
      where: { id: venueId },
      select: {
        minHours: true,
        maxHours: true,
        bufferMinutes: true,
        availabilityRules: true,
        blockedDates: { where: { date: parseISO(date) } },
      },
    });

    if (!venue) throw new NotFoundError("Espacio no encontrado");

    const dayOfWeek = parseISO(date).getDay();
    const rule = venue.availabilityRules.find((r) => r.dayOfWeek === dayOfWeek);

    if (!rule || !rule.isOpen) {
      return {
        date,
        open: false,
        blockedSlots: [],
        freeSlots: [],
        fullyBooked: false,
      };
    }

    // Full-day block?
    const hasFullDayBlock = venue.blockedDates.some(
      (b) => !b.startTime || !b.endTime
    );
    if (hasFullDayBlock) {
      return {
        date,
        open: true,
        openTime: rule.openTime,
        closeTime: rule.closeTime,
        blockedSlots: [{ startTime: rule.openTime, closeTime: rule.closeTime } as any],
        freeSlots: [],
        fullyBooked: true,
      };
    }

    // Load all holding bookings for this day
    const bookings = await db.booking.findMany({
      where: {
        venueId,
        date:   parseISO(date),
        status: { in: HOLDING_STATUSES },
      },
      select: { startTime: true, endTime: true },
    });

    const buf = venue.bufferMinutes;
    const minDurationMins = Math.round(venue.minHours * 60);

    // Build a minute-level occupation map [openMinute..closeMinute)
    const openMin  = timeToMinutes(rule.openTime);
    const closeMin = timeToMinutes(rule.closeTime);

    // A boolean array: occupied[i] = true means minute (openMin+i) is occupied
    const size = closeMin - openMin;
    const occupied = new Uint8Array(size); // 0 = free, 1 = occupied

    // Mark bookings (+ buffers)
    for (const b of bookings) {
      const bStart = Math.max(0,    timeToMinutes(b.startTime) - openMin - buf);
      const bEnd   = Math.min(size, timeToMinutes(b.endTime)   - openMin + buf);
      for (let i = bStart; i < bEnd; i++) occupied[i] = 1;
    }

    // Mark partial manual blocks
    for (const block of venue.blockedDates) {
      if (block.startTime && block.endTime) {
        const bStart = Math.max(0,    timeToMinutes(block.startTime) - openMin);
        const bEnd   = Math.min(size, timeToMinutes(block.endTime)   - openMin);
        for (let i = bStart; i < bEnd; i++) occupied[i] = 1;
      }
    }

    // Collect occupied slots for the response
    const blockedSlots: TimeSlot[] = [];
    for (const b of bookings) {
      blockedSlots.push({ startTime: b.startTime, endTime: b.endTime });
    }

    // Enumerate all valid start times (step = slotStepMinutes)
    // and find the maximum contiguous free run from each start
    const freeSlots: TimeSlot[] = [];
    const seen = new Set<string>();

    for (let start = 0; start + minDurationMins <= size; start += slotStepMinutes) {
      if (occupied[start]) continue; // start point is blocked

      // Find max contiguous free end
      let end = start;
      while (end < size && !occupied[end]) end++;

      // The slot can be from start to any valid end within [minDuration, maxDuration]
      const maxDurationMins = venue.maxHours
        ? Math.round(venue.maxHours * 60)
        : size;

      // Emit slots from this start to all valid end points (step = slotStepMinutes)
      for (
        let dur = minDurationMins;
        dur <= Math.min(end - start, maxDurationMins);
        dur += slotStepMinutes
      ) {
        const slotStart = minutesToTime(openMin + start);
        const slotEnd   = minutesToTime(openMin + start + dur);
        const key = `${slotStart}-${slotEnd}`;
        if (!seen.has(key)) {
          seen.add(key);
          freeSlots.push({ startTime: slotStart, endTime: slotEnd });
        }
      }
    }

    const fullyBooked = freeSlots.length === 0;

    return {
      date,
      open: true,
      openTime: rule.openTime,
      closeTime: rule.closeTime,
      blockedSlots,
      freeSlots,
      fullyBooked,
    };
  }

  // ── 4. Calendar month view ────────────────────────────────────

  /**
   * Returns a whole month's availability at a glance.
   * For each day: is the venue open? Does it have at least one free slot?
   * Runs a single batched query — does NOT do N queries per day.
   */
  async getCalendarMonth(
    venueId: string,
    year: number,
    month: number // 1-12
  ): Promise<CalendarMonth> {
    const venue = await db.venue.findUnique({
      where: { id: venueId },
      select: {
        minHours: true,
        bufferMinutes: true,
        availabilityRules: true,
      },
    });

    if (!venue) throw new NotFoundError("Espacio no encontrado");

    // Date range for the month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay  = new Date(year, month, 0); // last day of month

    // All bookings in the month (one query)
    const bookings = await db.booking.findMany({
      where: {
        venueId,
        date:   { gte: firstDay, lte: lastDay },
        status: { in: HOLDING_STATUSES },
      },
      select: { date: true, startTime: true, endTime: true },
    });

    // All blocks in the month (one query)
    const blocks = await db.blockedDate.findMany({
      where: {
        venueId,
        date: { gte: firstDay, lte: lastDay },
      },
      select: { date: true, startTime: true, endTime: true },
    });

    // Group by date string
    const bookingsByDate = new Map<string, Array<{ startTime: string; endTime: string }>>();
    for (const b of bookings) {
      const key = dateToISO(b.date);
      if (!bookingsByDate.has(key)) bookingsByDate.set(key, []);
      bookingsByDate.get(key)!.push({ startTime: b.startTime, endTime: b.endTime });
    }

    const blocksByDate = new Map<string, Array<{ startTime: string | null; endTime: string | null }>>();
    for (const b of blocks) {
      const key = dateToISO(b.date);
      if (!blocksByDate.has(key)) blocksByDate.set(key, []);
      blocksByDate.get(key)!.push({ startTime: b.startTime, endTime: b.endTime });
    }

    const minDurationMins = Math.round(venue.minHours * 60);
    const buf = venue.bufferMinutes;
    const days: CalendarMonth["days"] = [];

    let cursor = new Date(firstDay);
    while (cursor <= lastDay) {
      const dateStr  = dateToISO(cursor);
      const dow      = cursor.getDay();
      const rule     = venue.availabilityRules.find((r) => r.dayOfWeek === dow);
      const isOpen   = !!rule && rule.isOpen;

      if (!isOpen) {
        days.push({ date: dateStr, available: false, isOpen: false });
        cursor = addDays(cursor, 1);
        continue;
      }

      // Full-day block?
      const dayBlocks = blocksByDate.get(dateStr) ?? [];
      if (dayBlocks.some((b) => !b.startTime || !b.endTime)) {
        days.push({ date: dateStr, available: false, isOpen: true });
        cursor = addDays(cursor, 1);
        continue;
      }

      const openMin  = timeToMinutes(rule.openTime);
      const closeMin = timeToMinutes(rule.closeTime);
      const size = closeMin - openMin;
      const occupied = new Uint8Array(size);

      // Mark bookings
      for (const b of (bookingsByDate.get(dateStr) ?? [])) {
        const s = Math.max(0,    timeToMinutes(b.startTime) - openMin - buf);
        const e = Math.min(size, timeToMinutes(b.endTime)   - openMin + buf);
        for (let i = s; i < e; i++) occupied[i] = 1;
      }

      // Mark partial blocks
      for (const b of dayBlocks) {
        if (b.startTime && b.endTime) {
          const s = Math.max(0,    timeToMinutes(b.startTime) - openMin);
          const e = Math.min(size, timeToMinutes(b.endTime)   - openMin);
          for (let i = s; i < e; i++) occupied[i] = 1;
        }
      }

      // Does any contiguous free run of >= minDurationMins exist?
      let freeRun = 0;
      let hasSlot = false;
      for (let i = 0; i < size; i++) {
        if (!occupied[i]) {
          freeRun++;
          if (freeRun >= minDurationMins) { hasSlot = true; break; }
        } else {
          freeRun = 0;
        }
      }

      days.push({ date: dateStr, available: hasSlot, isOpen: true });
      cursor = addDays(cursor, 1);
    }

    return { year, month, days };
  }

  // ── 5. Block management (owner) ───────────────────────────────

  async addBlock(
    venueId: string,
    ownerId: string,
    date: string,
    startTime?: string,
    endTime?: string,
    reason?: string
  ) {
    // Ownership check
    const venue = await db.venue.findUnique({
      where: { id: venueId },
      select: { ownerId: true },
    });
    if (!venue) throw new NotFoundError("Espacio no encontrado");
    if (venue.ownerId !== ownerId) {
      throw new ValidationError("Sin permisos para bloquear este espacio");
    }

    // If partial block, validate times make sense
    if (startTime && endTime && startTime >= endTime) {
      throw new ValidationError("Hora de inicio debe ser anterior a hora de fin");
    }

    // Check there's no existing block that fully covers this one (prevent duplicates)
    const existingFullDay = await db.blockedDate.findFirst({
      where: {
        venueId,
        date:      parseISO(date),
        startTime: null,
        endTime:   null,
      },
    });
    if (existingFullDay) {
      throw new ValidationError("Este día ya tiene un bloqueo de día completo");
    }

    return db.blockedDate.create({
      data: {
        venueId,
        date:      parseISO(date),
        startTime: startTime ?? null,
        endTime:   endTime   ?? null,
        reason,
      },
    });
  }

  async removeBlock(blockId: string, ownerId: string) {
    const block = await db.blockedDate.findUnique({
      where: { id: blockId },
      include: { venue: { select: { ownerId: true } } },
    });
    if (!block) throw new NotFoundError("Bloqueo no encontrado");
    if (block.venue.ownerId !== ownerId) {
      throw new ValidationError("Sin permisos para eliminar este bloqueo");
    }
    return db.blockedDate.delete({ where: { id: blockId } });
  }

  async getBlocksForVenue(venueId: string, from: Date, to: Date) {
    return db.blockedDate.findMany({
      where: {
        venueId,
        date: { gte: startOfDay(from), lte: startOfDay(to) },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
  }

  // ── 6. Post-cancellation recalculation ────────────────────────

  /**
   * When a booking is cancelled, we may want to notify the owner
   * that the slot is free again, or re-expose it in search results.
   * This method returns the now-freed slot info.
   */
  async onBookingCancelled(bookingId: string): Promise<{
    venueId: string;
    date: string;
    freedSlot: TimeSlot;
    dayNowAvailable: boolean;
  }> {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        venueId:   true,
        date:      true,
        startTime: true,
        endTime:   true,
      },
    });
    if (!booking) throw new NotFoundError("Reserva no encontrada");

    const dateStr = dateToISO(booking.date);

    // Check if the day now has at least one free slot
    const dayAvail = await this.getFreeSlotsForDay(booking.venueId, dateStr);

    return {
      venueId:         booking.venueId,
      date:            dateStr,
      freedSlot:       { startTime: booking.startTime, endTime: booking.endTime },
      dayNowAvailable: dayAvail.freeSlots.length > 0,
    };
  }

  // ── 7. Availability rules management (owner) ──────────────────

  async updateAvailabilityRules(
    venueId: string,
    ownerId: string,
    rules: Array<{
      dayOfWeek: number; // 0-6
      isOpen: boolean;
      openTime?: string;
      closeTime?: string;
    }>
  ) {
    const venue = await db.venue.findUnique({
      where: { id: venueId },
      select: { ownerId: true },
    });
    if (!venue) throw new NotFoundError("Espacio no encontrado");
    if (venue.ownerId !== ownerId) {
      throw new ValidationError("Sin permisos");
    }

    // Validate rules
    for (const r of rules) {
      if (r.dayOfWeek < 0 || r.dayOfWeek > 6) {
        throw new ValidationError(`dayOfWeek inválido: ${r.dayOfWeek}`);
      }
      if (r.isOpen) {
        if (!r.openTime || !r.closeTime) {
          throw new ValidationError("Los días abiertos deben tener openTime y closeTime");
        }
        if (r.openTime >= r.closeTime) {
          throw new ValidationError(`openTime debe ser anterior a closeTime (día ${r.dayOfWeek})`);
        }
      }
    }

    // Upsert all 7 days atomically
    return db.$transaction(
      rules.map((r) =>
        db.availabilityRule.upsert({
          where:  { venueId_dayOfWeek: { venueId, dayOfWeek: r.dayOfWeek } },
          update: {
            isOpen:    r.isOpen,
            openTime:  r.openTime  ?? "09:00",
            closeTime: r.closeTime ?? "21:00",
          },
          create: {
            venueId,
            dayOfWeek: r.dayOfWeek,
            isOpen:    r.isOpen,
            openTime:  r.openTime  ?? "09:00",
            closeTime: r.closeTime ?? "21:00",
          },
        })
      )
    );
  }
}

export const availabilityService = new AvailabilityService();
