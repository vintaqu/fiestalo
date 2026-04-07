-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_REFUNDED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_RESPONSE';
ALTER TYPE "NotificationType" ADD VALUE 'VENUE_PAUSED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_NEW';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE 'ADMIN_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'ADMIN_DISPUTE';
