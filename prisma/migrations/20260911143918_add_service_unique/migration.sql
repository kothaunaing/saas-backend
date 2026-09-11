-- AddUniqueConstraint
ALTER TABLE "Service" ADD CONSTRAINT "Service_tenantId_name_key" UNIQUE ("tenantId", name);
