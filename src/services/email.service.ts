/**
 * EmailService
 *
 * Sends transactional emails via Resend using React Email templates.
 * All templates live in src/emails/ and are rendered server-side.
 *
 * In development (NODE_ENV !== 'production'):
 *   - Emails are logged to console but NOT sent (saves API quota)
 *   - Set RESEND_FORCE_SEND=true to override and actually send
 *
 * In production:
 *   - All emails go through Resend
 *   - Errors are caught and logged — never throw to callers
 */

import { Resend } from "resend";
import { render } from "@react-email/components";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as React from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

// In development use Resend's sandbox address (no domain verification needed)
// Switch to "Fiestalo <noreply@fiestalo.es>" once DNS is verified in Resend
const FROM = process.env.NODE_ENV === "production"
  ? "Fiestalo <noreply@fiestalo.es>"
  : "Fiestalo <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Always attempt to send if RESEND_API_KEY is present.
// Set RESEND_FORCE_SEND=true in .env.local to enable in development.
// Without the key, emails are only logged to console.
const forceSend  = process.env.RESEND_FORCE_SEND === "true";
const shouldSend = !!process.env.RESEND_API_KEY && forceSend;

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(amount);
}

function formatBookingDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "EEEE d 'de' MMMM yyyy", { locale: es });
}

// ── Core send function ────────────────────────────────────────────

async function send(
  to: string,
  subject: string,
  component: React.ReactElement
): Promise<void> {
  const html = await render(component);

  if (!shouldSend) {
    console.log(`[Email DEV] ───────────────────────────────`);
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  (set RESEND_FORCE_SEND=true to actually send)`);
    return;
  }

  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (error) {
    // Never throw — a failed email should not break the user flow
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, error);
  }
}

// ── EmailService ──────────────────────────────────────────────────

export class EmailService {

  // ── Welcome ───────────────────────────────────────────────────

  async sendWelcome(user: {
    email: string;
    name?: string | null;
    role: "TENANT" | "OWNER";
  }) {
    const { WelcomeEmail } = await import("@/emails/welcome");
    await send(
      user.email,
      "¡Bienvenido a Fiestalo!",
      React.createElement(WelcomeEmail, {
        name:   user.name ?? "Usuario",
        role:   user.role,
        appUrl: APP_URL,
      })
    );
  }

  // ── Booking confirmation (to tenant) ─────────────────────────

  async sendBookingConfirmation(booking: {
    tenant:       { email: string; name?: string | null };
    venue:        { title: string; address?: string; city?: string };
    date:         Date;
    startTime:    string;
    endTime:      string;
    durationHours: number;
    guestCount:   number;
    subtotal:     unknown;
    cleaningFee:  unknown;
    platformFee:  unknown;
    total:        unknown;
    bookingRef:   string;
    id:           string;
    payment?:     { receiptUrl?: string | null } | null;
  }) {
    const { BookingConfirmationEmail } = await import("@/emails/booking-confirmation");
    await send(
      booking.tenant.email,
      `✅ Reserva confirmada – ${booking.venue.title}`,
      React.createElement(BookingConfirmationEmail, {
        tenantName:    booking.tenant.name ?? "Cliente",
        venueTitle:    booking.venue.title,
        venueAddress:  booking.venue.address ?? "",
        venueCity:     booking.venue.city ?? "",
        date:          formatBookingDate(booking.date),
        startTime:     booking.startTime,
        endTime:       booking.endTime,
        durationHours: booking.durationHours,
        guestCount:    booking.guestCount,
        subtotal:      formatPrice(Number(booking.subtotal)),
        cleaningFee:   formatPrice(Number(booking.cleaningFee ?? 0)),
        platformFee:   formatPrice(Number(booking.platformFee)),
        total:         formatPrice(Number(booking.total)),
        bookingRef:    booking.bookingRef,
        receiptUrl:    booking.payment?.receiptUrl ?? undefined,
        appUrl:        APP_URL,
        bookingId:     booking.id,
      })
    );
  }

  // ── New booking request (to owner) ───────────────────────────

  async sendBookingRequest(booking: {
    owner:         { email: string; name?: string | null };
    tenant:        { name?: string | null; email: string };
    venue:         { title: string };
    date:          Date;
    startTime:     string;
    endTime:       string;
    durationHours: number;
    guestCount:    number;
    total:         unknown;
    specialRequests?: string | null;
    id:            string;
  }) {
    const { BookingRequestEmail } = await import("@/emails/booking-request");
    await send(
      booking.owner.email,
      `📩 Nueva solicitud de reserva – ${booking.venue.title}`,
      React.createElement(BookingRequestEmail, {
        ownerName:       booking.owner.name ?? "Propietario",
        tenantName:      booking.tenant.name ?? "Cliente",
        tenantEmail:     booking.tenant.email,
        venueTitle:      booking.venue.title,
        date:            formatBookingDate(booking.date),
        startTime:       booking.startTime,
        endTime:         booking.endTime,
        durationHours:   booking.durationHours,
        guestCount:      booking.guestCount,
        total:           formatPrice(Number(booking.total)),
        specialRequests: booking.specialRequests ?? undefined,
        bookingId:       booking.id,
        appUrl:          APP_URL,
      })
    );
  }

  // ── Booking cancellation ──────────────────────────────────────

  async sendBookingCancellation(params: {
    recipientEmail:     string;
    recipientName:      string;
    venue:              { title: string };
    date:               Date;
    startTime:          string;
    endTime:            string;
    cancelledBy:        "user" | "owner" | "system";
    cancellationReason?: string | null;
    refundAmount?:      number;
    refundIsFullAmount?: boolean;
  }) {
    const { BookingCancellationEmail } = await import("@/emails/booking-cancellation");
    await send(
      params.recipientEmail,
      `Reserva cancelada – ${params.venue.title}`,
      React.createElement(BookingCancellationEmail, {
        recipientName:      params.recipientName,
        venueTitle:         params.venue.title,
        date:               formatBookingDate(params.date),
        startTime:          params.startTime,
        endTime:            params.endTime,
        cancelledBy:        params.cancelledBy,
        cancellationReason: params.cancellationReason ?? undefined,
        refundAmount:       params.refundAmount ? formatPrice(params.refundAmount) : undefined,
        refundIsFullAmount: params.refundIsFullAmount,
        appUrl:             APP_URL,
      })
    );
  }

  // ── Booking reminder ─────────────────────────────────────────

  async sendBookingReminder(booking: {
    tenant:       { email: string; name?: string | null };
    venue:        { title: string; address?: string; city?: string };
    date:         Date;
    startTime:    string;
    endTime:      string;
    guestCount:   number;
    bookingRef:   string;
    id:           string;
    hoursUntil:   number;
  }) {
    const { BookingReminderEmail } = await import("@/emails/booking-reminder");
    const label = booking.hoursUntil >= 20 ? "mañana" : "en 2 horas";
    await send(
      booking.tenant.email,
      `⏰ Recordatorio: tu reserva en ${booking.venue.title} es ${label}`,
      React.createElement(BookingReminderEmail, {
        tenantName:   booking.tenant.name ?? "Cliente",
        venueTitle:   booking.venue.title,
        venueAddress: booking.venue.address ?? "",
        venueCity:    booking.venue.city ?? "",
        date:         formatBookingDate(booking.date),
        startTime:    booking.startTime,
        endTime:      booking.endTime,
        guestCount:   booking.guestCount,
        bookingRef:   booking.bookingRef,
        hoursUntil:   booking.hoursUntil,
        bookingId:    booking.id,
        appUrl:       APP_URL,
      })
    );
  }

  // ── Password reset ────────────────────────────────────────────

  async sendPasswordReset(params: {
    email:     string;
    name:      string;
    resetUrl:  string;
    expiresIn?: string;
  }) {
    const { PasswordResetEmail } = await import("@/emails/password-reset");
    await send(
      params.email,
      "Recuperar contraseña – Fiestalo",
      React.createElement(PasswordResetEmail, {
        name:      params.name,
        resetUrl:  params.resetUrl,
        expiresIn: params.expiresIn ?? "1 hora",
      })
    );
  }
}

export const emailService = new EmailService();
