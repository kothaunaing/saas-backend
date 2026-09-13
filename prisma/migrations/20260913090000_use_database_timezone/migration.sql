-- Appointment timestamps use the database's UTC clock. Per-tenant and
-- per-location timezone configuration is intentionally removed.
ALTER TABLE "Tenant" DROP COLUMN "timezone";
ALTER TABLE "Location" DROP COLUMN "timezone";
