/**
 * MessagingService
 *
 * Handles all conversation and message operations.
 *
 * Design principles:
 * - Conversations are always participant-scoped: you only see convos you're in
 * - Admins bypass participant checks via userRole param
 * - Messages are soft-deleted (isDeleted flag) to preserve conversation history
 * - System messages are injected automatically on booking lifecycle events
 * - Unread counts are denormalized on ConversationParticipant for performance
 */

import { db } from "@/lib/db";
import { notificationService } from "@/services/notification.service";
import type { ConversationType, MessageType, Role } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreateConversationInput {
  type:       ConversationType;
  venueId?:   string;
  bookingId?: string;
  subject?:   string;
  initiatorId: string;
  recipientId: string;
  firstMessage?: string;
}

interface SendMessageInput {
  conversationId: string;
  senderId:        string;
  senderRole:      Role;
  content:         string;
  type?:           MessageType;
}

interface GetConversationsInput {
  userId:    string;
  userRole:  Role;
  venueId?:  string;
  bookingId?:string;
  archived?: boolean;
  page?:     number;
  limit?:    number;
}

interface GetMessagesInput {
  conversationId: string;
  userId:         string;
  userRole:       Role;
  page?:          number;
  limit?:         number;
}

// ── MessagingService ──────────────────────────────────────────────────────────

export class MessagingService {

  // ── Create or get existing conversation ──────────────────────────────────

  async getOrCreateConversation(input: CreateConversationInput) {
    const { type, venueId, bookingId, subject, initiatorId, recipientId, firstMessage } = input;

    // For booking conversations: one per booking
    if (bookingId) {
      const existing = await db.conversation.findUnique({
        where:   { bookingId },
        include: { participants: true },
      });
      if (existing) {
        // Ensure both participants are in it (e.g. admin joins later)
        const participantIds = existing.participants.map((p) => p.userId);
        const toAdd = [initiatorId, recipientId].filter((id) => !participantIds.includes(id));
        if (toAdd.length > 0) {
          await db.conversationParticipant.createMany({
            data: toAdd.map((userId) => ({ conversationId: existing.id, userId })),
            skipDuplicates: true,
          });
        }
        return existing;
      }
    }

    // For venue inquiries: check if a conversation between same pair already exists
    if (type === "VENUE_INQUIRY" && venueId) {
      const existing = await db.conversation.findFirst({
        where: {
          venueId,
          type: "VENUE_INQUIRY",
          participants: {
            every: { userId: { in: [initiatorId, recipientId] } },
          },
        },
        include: { participants: true },
      });
      if (existing && existing.participants.length === 2) return existing;
    }

    // Create new conversation with both participants
    const convo = await db.conversation.create({
      data: {
        type,
        venueId,
        bookingId,
        subject: subject ?? this._autoSubject(type, venueId, bookingId),
        lastMessageAt: new Date(),
        participants: {
          create: [
            { userId: initiatorId },
            { userId: recipientId },
          ],
        },
      },
      include: { participants: true },
    });

    // Send the first message if provided
    if (firstMessage?.trim()) {
      await this.sendMessage({
        conversationId: convo.id,
        senderId:        initiatorId,
        senderRole:      "TENANT", // doesn't matter for creation
        content:         firstMessage.trim(),
        type:            "TEXT",
      });
    }

    return convo;
  }

  // ── Send a message ────────────────────────────────────────────────────────

  async sendMessage(input: SendMessageInput) {
    const { conversationId, senderId, senderRole, content, type = "TEXT" } = input;

    // Verify sender is a participant (admins bypass)
    if (senderRole !== "ADMIN") {
      const participant = await db.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: senderId } },
      });
      if (!participant) throw new Error("No eres participante de esta conversación");
    }

    // Validate content
    const trimmed = content.trim();
    if (!trimmed) throw new Error("El mensaje no puede estar vacío");
    if (trimmed.length > 5000) throw new Error("Mensaje demasiado largo (máx. 5000 caracteres)");

    // Create message + update conversation denormalized fields atomically
    const [message] = await db.$transaction([
      db.message.create({
        data: {
          conversationId,
          senderId,
          content: trimmed,
          type,
        },
        include: {
          sender: { select: { id: true, name: true, image: true } },
        },
      }),
      db.conversation.update({
        where: { id: conversationId },
        data:  {
          lastMessageAt:   new Date(),
          lastMessageBody: trimmed.slice(0, 200),
          updatedAt:       new Date(),
        },
      }),
    ]);

    // Increment unread count for all OTHER participants
    await db.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId: { not: senderId },
      },
      data: { unreadCount: { increment: 1 } },
    });

    // Notify other participants
    const otherParticipants = await db.conversationParticipant.findMany({
      where:  { conversationId, userId: { not: senderId } },
      select: { userId: true },
    });

    for (const { userId } of otherParticipants) {
      if (type === "TEXT") {
        await notificationService.notify({
          type: "MESSAGE_NEW",
          message: {
            id:             message.id,
            recipientId:    userId,
            senderName:     message.sender.name,
            preview:        trimmed.slice(0, 100),
            conversationId,
          },
        });
      }
    }

    return message;
  }

  // ── Inject system message (booking events) ────────────────────────────────

  async sendSystemMessage(conversationId: string, content: string) {
    return db.message.create({
      data: {
        conversationId,
        senderId:      await this._getSystemUserId(),
        content,
        type:          "SYSTEM",
      },
    });
  }

  // ── Attach a conversation to a booking (when booking is created) ──────────

  async attachToBooking(conversationId: string, bookingId: string) {
    return db.conversation.update({
      where: { id: conversationId },
      data:  { bookingId, type: "BOOKING_SUPPORT" },
    });
  }

  // ── Get conversations list ────────────────────────────────────────────────

  async getConversations(input: GetConversationsInput) {
    const { userId, userRole, venueId, bookingId, archived = false, page = 1, limit = 20 } = input;

    const isAdmin = userRole === "ADMIN";

    const where: any = { isArchived: archived };

    if (!isAdmin) {
      // Regular users only see conversations they're in
      where.participants = { some: { userId } };
    }

    if (venueId)   where.venueId   = venueId;
    if (bookingId) where.bookingId = bookingId;

    const [total, conversations] = await db.$transaction([
      db.conversation.count({ where }),
      db.conversation.findMany({
        where,
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
          },
          venue:   { select: { id: true, title: true, slug: true, images: { where: { isCover: true }, take: 1 } } },
          booking: { select: { id: true, bookingRef: true, date: true, startTime: true, endTime: true, status: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take:    1,
            include: { sender: { select: { id: true, name: true } } },
          },
        },
        orderBy: { lastMessageAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
    ]);

    // Attach per-user unread count
    const withUnread = conversations.map((convo) => {
      const myParticipant = convo.participants.find((p) => p.userId === userId);
      return {
        ...convo,
        myUnreadCount: myParticipant?.unreadCount ?? 0,
      };
    });

    return { conversations: withUnread, total };
  }

  // ── Get messages in a conversation ────────────────────────────────────────

  async getMessages(input: GetMessagesInput) {
    const { conversationId, userId, userRole, page = 1, limit = 50 } = input;
    const isAdmin = userRole === "ADMIN";

    // Verify access
    if (!isAdmin) {
      const participant = await db.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      });
      if (!participant) throw new Error("Sin acceso a esta conversación");
    }

    const [total, messages] = await db.$transaction([
      db.message.count({ where: { conversationId, isDeleted: false } }),
      db.message.findMany({
        where:   { conversationId, isDeleted: false },
        include: {
          sender: { select: { id: true, name: true, image: true, role: true } },
          readBy: { select: { userId: true, readAt: true } },
        },
        orderBy: { createdAt: "asc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
    ]);

    // Mark unread messages as read and reset unread counter
    const unreadIds = messages
      .filter((m) => m.senderId !== userId && !m.readBy.some((r) => r.userId === userId))
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await db.$transaction([
        db.messageRead.createMany({
          data: unreadIds.map((messageId) => ({ messageId, userId })),
          skipDuplicates: true,
        }),
        db.conversationParticipant.updateMany({
          where: { conversationId, userId },
          data:  { unreadCount: 0, lastReadAt: new Date() },
        }),
      ]);
    }

    return { messages, total, hasMore: page * limit < total };
  }

  // ── Delete a message (soft) ───────────────────────────────────────────────

  async deleteMessage(messageId: string, userId: string, userRole: Role) {
    const message = await db.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new Error("Mensaje no encontrado");
    if (message.senderId !== userId && userRole !== "ADMIN") {
      throw new Error("Solo puedes eliminar tus propios mensajes");
    }

    return db.message.update({
      where: { id: messageId },
      data:  { isDeleted: true, content: "[Mensaje eliminado]" },
    });
  }

  // ── Archive a conversation ────────────────────────────────────────────────

  async archiveConversation(conversationId: string, userId: string, archived: boolean) {
    // Archive per-participant (not globally)
    return db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data:  { isArchived: archived },
    });
  }

  // ── Get total unread count for a user ─────────────────────────────────────

  async getTotalUnread(userId: string) {
    const result = await db.conversationParticipant.aggregate({
      where:  { userId, unreadCount: { gt: 0 } },
      _sum:   { unreadCount: true },
    });
    return result._sum.unreadCount ?? 0;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _autoSubject(type: ConversationType, venueId?: string, bookingId?: string): string {
    switch (type) {
      case "BOOKING_SUPPORT": return bookingId ? `Consulta sobre reserva` : "Soporte de reserva";
      case "VENUE_INQUIRY":   return "Consulta sobre el espacio";
      default:                return "Conversación";
    }
  }

  private async _getSystemUserId(): Promise<string> {
    // Use the first admin as system message sender, fallback to any user
    const admin = await db.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (!admin) throw new Error("No admin user found for system messages");
    return admin.id;
  }
}

export const messagingService = new MessagingService();
