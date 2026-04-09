/**
 * NotificationService
 *
 * Centralized notification system. All business events flow through `notify(event)`
 * which determines who gets what notification based on the event type.
 * This ensures consistency — no scattered notificationService.create() calls
 * with ad-hoc titles/bodies spread across the codebase.
 *
 * Usage:
 *   await notificationService.notify({ type: "BOOKING_CONFIRMED", booking })
 *   await notificationService.notify({ type: "REVIEW_NEW", review, venue, author })
 *
 * Each event type is a discriminated union so TypeScript enforces
 * that all required data is provided.
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { NotificationType } from "@prisma/client";

// ── Primitive create — internal use only ─────────────────────────

interface NotificationInput {
  userId: string;
  type:   NotificationType;
  title:  string;
  body:   string;
  link?:  string;
  meta?:  Prisma.InputJsonValue;
}

async function createOne(input: NotificationInput) {
  return db.notification.create({
    data: {
      userId: input.userId,
      type:   input.type,
      title:  input.title,
      body:   input.body,
      link:   input.link,
      meta: (input.meta ?? {}) as Prisma.InputJsonValue,
    },
  });
}

async function createMany(inputs: NotificationInput[]) {
  if (inputs.length === 0) return;
  return db.notification.createMany({
    data: inputs.map((i) => ({
      ...i,
      meta: (i.meta ?? {}) as Prisma.InputJsonValue,
    })),
  });
}

// ── Event payload types ───────────────────────────────────────────

type BookingEvent = {
  type: "BOOKING_NEW" | "BOOKING_REQUEST" | "BOOKING_CONFIRMED" |
        "BOOKING_ACCEPTED" | "BOOKING_REJECTED" | "BOOKING_CANCELLED" |
        "BOOKING_COMPLETED" | "BOOKING_REMINDER";
  booking: {
    id:           string;
    bookingRef:   string;
    date:         Date;
    startTime:    string;
    endTime:      string;
    tenantId:     string;
    tenantName?:  string | null;
    venueId:      string;
    venueTitle:   string;
    ownerId:      string;
    ownerName?:   string | null;
    cancelledBy?: string | null;
    hoursUntil?:  number; // for reminders
  };
};

type PaymentEvent = {
  type:    "PAYMENT_RECEIVED" | "PAYMENT_FAILED" | "PAYMENT_REFUNDED";
  booking: {
    id:         string;
    bookingRef: string;
    venueTitle: string;
    tenantId:   string;
    ownerId:    string;
    total:      number;
    refundAmount?: number;
  };
};

type ReviewEvent = {
  type:   "REVIEW_NEW" | "REVIEW_RESPONSE";
  review: {
    id:         string;
    venueId:    string;
    venueTitle: string;
    ownerId:    string;
    tenantId:   string;
    tenantName?: string | null;
    rating:     number;
  };
};

type MessageEvent = {
  type:    "MESSAGE_NEW";
  message: {
    id:            string;
    recipientId:   string;
    senderName?:   string | null;
    preview:       string;
    conversationId?: string;
  };
};

type VenueEvent = {
  type:  "VENUE_APPROVED" | "VENUE_REJECTED" | "VENUE_SUSPENDED" | "VENUE_PAUSED";
  venue: {
    id:      string;
    title:   string;
    slug:    string;
    ownerId: string;
    reason?: string;
  };
};

type TicketEvent = {
  type:   "TICKET_NEW" | "TICKET_REPLY" | "TICKET_RESOLVED";
  ticket: {
    id:        string;
    subject:   string;
    creatorId: string;
    adminIds?: string[];
    replierName?: string | null;
  };
};

type AdminEvent = {
  type:    "ADMIN_ALERT" | "ADMIN_DISPUTE";
  title:   string;
  body:    string;
  link?:   string;
  meta?:   Record<string, unknown>;
};

type SystemEvent = {
  type:   "SYSTEM";
  userId: string;
  title:  string;
  body:   string;
  link?:  string;
};

type NotificationEvent =
  | BookingEvent
  | PaymentEvent
  | ReviewEvent
  | MessageEvent
  | VenueEvent
  | TicketEvent
  | AdminEvent
  | SystemEvent;

// ── NotificationService ───────────────────────────────────────────

export class NotificationService {

  // ── Main dispatch ─────────────────────────────────────────────

  async notify(event: NotificationEvent): Promise<void> {
    try {
      switch (event.type) {

        // ── Booking events ──────────────────────────────────────

        case "BOOKING_NEW":
          // Owner receives: "Nueva reserva de [tenant]"
          await createOne({
            userId: event.booking.ownerId,
            type:   "BOOKING_NEW",
            title:  "Nueva reserva recibida",
            body:   `${event.booking.tenantName ?? "Un cliente"} ha reservado ${event.booking.venueTitle} para el ${this._fmtDate(event.booking.date)} a las ${event.booking.startTime}.`,
            link:   `/owner/bookings/${event.booking.id}`,
            meta:   { bookingId: event.booking.id, bookingRef: event.booking.bookingRef },
          });
          break;

        case "BOOKING_REQUEST":
          // Owner receives: needs to approve REQUEST type booking
          await createOne({
            userId: event.booking.ownerId,
            type:   "BOOKING_REQUEST",
            title:  "Solicitud de reserva pendiente",
            body:   `${event.booking.tenantName ?? "Un cliente"} solicita reservar ${event.booking.venueTitle} el ${this._fmtDate(event.booking.date)}. Necesita tu aprobación.`,
            link:   `/owner/bookings/${event.booking.id}`,
            meta:   { bookingId: event.booking.id, bookingRef: event.booking.bookingRef, urgent: true },
          });
          break;

        case "BOOKING_ACCEPTED":
          // Tenant receives: owner accepted their request
          await createOne({
            userId: event.booking.tenantId,
            type:   "BOOKING_ACCEPTED",
            title:  "¡Tu solicitud ha sido aceptada!",
            body:   `${event.booking.ownerName ?? "El propietario"} ha aceptado tu reserva en ${event.booking.venueTitle}. Completa el pago para confirmar.`,
            link:   `/checkout/${event.booking.id}`,
            meta:   { bookingId: event.booking.id, bookingRef: event.booking.bookingRef, urgent: true },
          });
          break;

        case "BOOKING_REJECTED":
          // Tenant receives: owner rejected their request
          await createOne({
            userId: event.booking.tenantId,
            type:   "BOOKING_REJECTED",
            title:  "Solicitud no aceptada",
            body:   `${event.booking.ownerName ?? "El propietario"} no ha podido aceptar tu solicitud para ${event.booking.venueTitle}.`,
            link:   `/tenant/bookings`,
            meta:   { bookingId: event.booking.id },
          });
          break;

        case "BOOKING_CONFIRMED":
          // Tenant receives: payment succeeded, booking confirmed
          await createOne({
            userId: event.booking.tenantId,
            type:   "BOOKING_CONFIRMED",
            title:  "¡Reserva confirmada!",
            body:   `Tu reserva en ${event.booking.venueTitle} para el ${this._fmtDate(event.booking.date)} a las ${event.booking.startTime} está confirmada.`,
            link:   `/tenant/bookings/${event.booking.id}`,
            meta:   { bookingId: event.booking.id, bookingRef: event.booking.bookingRef },
          });
          break;

        case "BOOKING_CANCELLED": {
          // Both parties receive notifications
          const cancelledByOwner = event.booking.cancelledBy === event.booking.ownerId;
          const notifications: NotificationInput[] = [];

          // Notify tenant (unless they cancelled themselves)
          if (event.booking.cancelledBy !== event.booking.tenantId) {
            notifications.push({
              userId: event.booking.tenantId,
              type:   "BOOKING_CANCELLED",
              title:  "Reserva cancelada",
              body:   cancelledByOwner
                ? `${event.booking.ownerName ?? "El propietario"} ha cancelado tu reserva en ${event.booking.venueTitle}.`
                : `Tu reserva en ${event.booking.venueTitle} ha sido cancelada.`,
              link:   `/tenant/bookings/${event.booking.id}`,
              meta:   { bookingId: event.booking.id },
            });
          }

          // Notify owner (unless they cancelled themselves)
          if (event.booking.cancelledBy !== event.booking.ownerId) {
            notifications.push({
              userId: event.booking.ownerId,
              type:   "BOOKING_CANCELLED",
              title:  "Reserva cancelada",
              body:   `${event.booking.tenantName ?? "Un cliente"} ha cancelado la reserva en ${event.booking.venueTitle} del ${this._fmtDate(event.booking.date)}.`,
              link:   `/owner/bookings/${event.booking.id}`,
              meta:   { bookingId: event.booking.id },
            });
          }

          await createMany(notifications);
          break;
        }

        case "BOOKING_COMPLETED":
          // Tenant receives: can now write a review
          await createOne({
            userId: event.booking.tenantId,
            type:   "BOOKING_COMPLETED",
            title:  "¿Cómo fue tu experiencia?",
            body:   `Tu reserva en ${event.booking.venueTitle} ha finalizado. ¡Comparte tu opinión con una reseña!`,
            link:   `/tenant/bookings/${event.booking.id}/review`,
            meta:   { bookingId: event.booking.id },
          });
          break;

        case "BOOKING_REMINDER":
          // Tenant receives: reminder before booking
          await createOne({
            userId: event.booking.tenantId,
            type:   "BOOKING_REMINDER",
            title:  event.booking.hoursUntil && event.booking.hoursUntil <= 3
              ? "Tu reserva empieza en 2 horas 🚀"
              : "Recuerda: tienes una reserva mañana ⏰",
            body:   `${event.booking.venueTitle} — ${this._fmtDate(event.booking.date)} a las ${event.booking.startTime}.`,
            link:   `/tenant/bookings/${event.booking.id}`,
            meta:   { bookingId: event.booking.id },
          });
          break;

        // ── Payment events ──────────────────────────────────────

        case "PAYMENT_RECEIVED":
          // Owner receives: payment for their venue
          await createOne({
            userId: event.booking.ownerId,
            type:   "PAYMENT_RECEIVED",
            title:  "Pago recibido",
            body:   `Has recibido un pago de ${event.booking.total.toFixed(2)}€ por la reserva en ${event.booking.venueTitle}.`,
            link:   `/owner/bookings/${event.booking.id}`,
            meta:   { bookingId: event.booking.id, amount: event.booking.total },
          });
          break;

        case "PAYMENT_FAILED":
          await createOne({
            userId: event.booking.tenantId,
            type:   "PAYMENT_FAILED",
            title:  "Error en el pago",
            body:   `No se ha podido procesar tu pago para ${event.booking.venueTitle}. Por favor, inténtalo de nuevo.`,
            link:   `/checkout/${event.booking.id}`,
            meta:   { bookingId: event.booking.id, urgent: true },
          });
          break;

        case "PAYMENT_REFUNDED":
          await createOne({
            userId: event.booking.tenantId,
            type:   "PAYMENT_REFUNDED",
            title:  "Reembolso procesado",
            body:   `Se ha procesado un reembolso de ${event.booking.refundAmount?.toFixed(2) ?? ""}€ por tu reserva en ${event.booking.venueTitle}.`,
            link:   `/tenant/bookings/${event.booking.id}`,
            meta:   { bookingId: event.booking.id, amount: event.booking.refundAmount },
          });
          break;

        // ── Review events ───────────────────────────────────────

        case "REVIEW_NEW":
          // Owner receives: someone reviewed their venue
          await createOne({
            userId: event.review.ownerId,
            type:   "REVIEW_NEW",
            title:  `Nueva reseña en ${event.review.venueTitle}`,
            body:   `${event.review.tenantName ?? "Un cliente"} ha dejado una valoración de ${event.review.rating} estrellas.`,
            link:   `/venues/${event.review.venueId}#reviews`,
            meta:   { reviewId: event.review.id, rating: event.review.rating },
          });
          break;

        case "REVIEW_RESPONSE":
          // Tenant receives: owner responded to their review
          await createOne({
            userId: event.review.tenantId,
            type:   "REVIEW_RESPONSE",
            title:  "El propietario respondió a tu reseña",
            body:   `El propietario de ${event.review.venueTitle} ha respondido a tu valoración.`,
            link:   `/venues/${event.review.venueId}#reviews`,
            meta:   { reviewId: event.review.id },
          });
          break;

        // ── Message events ──────────────────────────────────────

        case "MESSAGE_NEW":
          await createOne({
            userId: event.message.recipientId,
            type:   "MESSAGE_NEW",
            title:  `Nuevo mensaje de ${event.message.senderName ?? "un usuario"}`,
            body:   event.message.preview.slice(0, 120),
            link:   event.message.conversationId
              ? `messaging:${event.message.conversationId}`
              : `messaging:`,
            meta:   { messageId: event.message.id },
          });
          break;

        // ── Venue moderation events ─────────────────────────────

        case "VENUE_APPROVED":
          await createOne({
            userId: event.venue.ownerId,
            type:   "VENUE_APPROVED",
            title:  "¡Espacio aprobado!",
            body:   `Tu espacio "${event.venue.title}" ha sido aprobado y ya está visible en el marketplace.`,
            link:   `/venues/${event.venue.slug}`,
            meta:   { venueId: event.venue.id },
          });
          break;

        case "VENUE_REJECTED":
          await createOne({
            userId: event.venue.ownerId,
            type:   "VENUE_REJECTED",
            title:  "Espacio no aprobado",
            body:   `Tu espacio "${event.venue.title}" no ha sido aprobado.${event.venue.reason ? ` Motivo: ${event.venue.reason}` : " Contacta con soporte para más información."}`,
            link:   `/owner/spaces`,
            meta:   { venueId: event.venue.id, reason: event.venue.reason },
          });
          break;

        case "VENUE_SUSPENDED":
          await createOne({
            userId: event.venue.ownerId,
            type:   "VENUE_SUSPENDED",
            title:  "Espacio suspendido",
            body:   `Tu espacio "${event.venue.title}" ha sido suspendido temporalmente.${event.venue.reason ? ` Motivo: ${event.venue.reason}` : ""}`,
            link:   `/owner/spaces`,
            meta:   { venueId: event.venue.id, urgent: true },
          });
          break;

        case "VENUE_PAUSED":
          await createOne({
            userId: event.venue.ownerId,
            type:   "VENUE_PAUSED",
            title:  "Espacio pausado",
            body:   `Tu espacio "${event.venue.title}" ha sido pausado automáticamente.`,
            link:   `/owner/spaces/${event.venue.id}/edit`,
            meta:   { venueId: event.venue.id },
          });
          break;

        // ── Ticket events ───────────────────────────────────────

        case "TICKET_NEW": {
          // Notify all admins
          const admins = event.ticket.adminIds
            ? event.ticket.adminIds.map((adminId) => ({
                userId: adminId,
                type:   "TICKET_NEW" as NotificationType,
                title:  "Nuevo ticket de soporte",
                body:   `Asunto: ${event.ticket.subject}`,
                link:   `/admin/tickets/${event.ticket.id}`,
                meta:   { ticketId: event.ticket.id, urgent: true },
              }))
            : [];
          // Auto-fetch admin IDs if not provided
          if (admins.length === 0) {
            const adminUsers = await db.user.findMany({
              where:  { role: "ADMIN", isActive: true, isBanned: false },
              select: { id: true },
            });
            await createMany(
              adminUsers.map((a) => ({
                userId: a.id,
                type:   "TICKET_NEW" as NotificationType,
                title:  "Nuevo ticket de soporte",
                body:   `Asunto: ${event.ticket.subject}`,
                link:   `/admin/tickets/${event.ticket.id}`,
                meta:   { ticketId: event.ticket.id, urgent: true },
              }))
            );
          } else {
            await createMany(admins);
          }
          break;
        }

        case "TICKET_REPLY":
          await createOne({
            userId: event.ticket.creatorId,
            type:   "TICKET_REPLY",
            title:  "Respuesta a tu ticket",
            body:   `${event.ticket.replierName ?? "El equipo de Fiestalo"} ha respondido a tu ticket: "${event.ticket.subject}".`,
            link:   `/support/tickets/${event.ticket.id}`,
            meta:   { ticketId: event.ticket.id },
          });
          break;

        case "TICKET_RESOLVED":
          await createOne({
            userId: event.ticket.creatorId,
            type:   "TICKET_RESOLVED",
            title:  "Ticket resuelto",
            body:   `Tu ticket "${event.ticket.subject}" ha sido marcado como resuelto.`,
            link:   `/support/tickets/${event.ticket.id}`,
            meta:   { ticketId: event.ticket.id },
          });
          break;

        // ── Admin alerts ────────────────────────────────────────

        case "ADMIN_ALERT":
        case "ADMIN_DISPUTE": {
          // Notify all active admins
          const adminUsers = await db.user.findMany({
            where:  { role: "ADMIN", isActive: true, isBanned: false },
            select: { id: true },
          });
          await createMany(
            adminUsers.map((a) => ({
              userId: a.id,
              type:   event.type as NotificationType,
              title:  event.title,
              body:   event.body,
              link:   event.link,
              meta:   { ...event.meta, urgent: true },
            }))
          );
          break;
        }

        // ── System / generic ────────────────────────────────────

        case "SYSTEM":
          await createOne({
            userId: event.userId,
            type:   "SYSTEM",
            title:  event.title,
            body:   event.body,
            link:   event.link,
          });
          break;
      }
    } catch (err) {
      // Notifications must never crash the main flow
      console.error("[NotificationService] Failed to create notification:", err);
    }
  }

  // ── Legacy create (kept for compatibility) ────────────────────

  async create(input: {
    userId: string;
    type:   NotificationType;
    title:  string;
    body:   string;
    link?:  string;
    meta?:  Prisma.InputJsonValue;
  }) {
    return createOne(input);
  }

  // ── Read operations ───────────────────────────────────────────

  async markRead(notificationId: string, userId: string) {
    return db.notification.updateMany({
      where: { id: notificationId, userId },
      data:  { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return db.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const [total, notifications] = await db.$transaction([
      db.notification.count({ where: { userId } }),
      db.notification.findMany({
        where:   { userId },
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
    ]);
    return { notifications, total };
  }

  async getUnreadCount(userId: string) {
    return db.notification.count({ where: { userId, isRead: false } });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private _fmtDate(date: Date): string {
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric", month: "long", year: "numeric",
    }).format(new Date(date));
  }
}

export const notificationService = new NotificationService();
