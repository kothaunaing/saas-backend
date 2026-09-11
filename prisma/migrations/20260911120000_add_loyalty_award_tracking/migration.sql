ALTER TABLE "Appointment"
ADD COLUMN "loyaltyPointsAwarded" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_loyaltyPointsAwarded_nonnegative"
CHECK ("loyaltyPointsAwarded" >= 0);
