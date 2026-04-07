-- DropIndex
DROP INDEX "BlockedDate_date_idx";

-- DropIndex
DROP INDEX "BlockedDate_venueId_idx";

-- DropIndex
DROP INDEX "Booking_date_idx";

-- DropIndex
DROP INDEX "Booking_tenantId_idx";

-- DropIndex
DROP INDEX "Booking_venueId_idx";

-- CreateIndex
CREATE INDEX "BlockedDate_venueId_date_idx" ON "BlockedDate"("venueId", "date");

-- CreateIndex
CREATE INDEX "Booking_venueId_date_status_idx" ON "Booking"("venueId", "date", "status");

-- CreateIndex
CREATE INDEX "Booking_venueId_date_idx" ON "Booking"("venueId", "date");

-- CreateIndex
CREATE INDEX "Booking_tenantId_status_idx" ON "Booking"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Booking_tenantId_date_idx" ON "Booking"("tenantId", "date");
