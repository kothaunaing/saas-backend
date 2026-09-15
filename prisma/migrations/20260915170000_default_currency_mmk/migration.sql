ALTER TABLE "Tenant" ALTER COLUMN "currency" SET DEFAULT 'MMK';

UPDATE "Tenant"
SET "currency" = 'MMK'
WHERE "currency" = 'USD';

UPDATE "Reward"
SET "name" = 'Ks 10 service credit'
WHERE "name" = '$10 service credit';

UPDATE "Reward"
SET "name" = 'Ks 5 beauty credit'
WHERE "name" = '$5 beauty credit';
