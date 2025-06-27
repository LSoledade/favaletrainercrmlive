
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "full_name" text;

UPDATE "profiles" SET "full_name" = 'Default Name' WHERE "full_name" IS NULL;
