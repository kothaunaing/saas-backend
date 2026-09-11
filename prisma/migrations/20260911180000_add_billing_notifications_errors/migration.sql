CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');
CREATE TYPE "NotificationKind" AS ENUM ('BOOKING_CONFIRMATION', 'APPOINTMENT_REMINDER');
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');
CREATE TYPE "ErrorStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "PaymentMethod" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "last4" TEXT NOT NULL,
  "expMonth" INTEGER NOT NULL,
  "expYear" INTEGER NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "kind" "NotificationKind" NOT NULL,
  "recipient" TEXT NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SystemError" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "status" "ErrorStatus" NOT NULL DEFAULT 'OPEN',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "SystemError_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentMethod_tenantId_isDefault_idx" ON "PaymentMethod"("tenantId", "isDefault");
CREATE UNIQUE INDEX "Notification_appointmentId_channel_kind_key" ON "Notification"("appointmentId", "channel", "kind");
CREATE INDEX "Notification_tenantId_status_scheduledFor_idx" ON "Notification"("tenantId", "status", "scheduledFor");
CREATE INDEX "SystemError_status_occurredAt_idx" ON "SystemError"("status", "occurredAt");
CREATE INDEX "SystemError_tenantId_occurredAt_idx" ON "SystemError"("tenantId", "occurredAt");

ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemError" ADD CONSTRAINT "SystemError_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
