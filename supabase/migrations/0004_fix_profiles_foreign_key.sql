-- Remove the foreign key constraint from profiles to users table
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_id_users_id_fk";

-- Drop the users table since we're using Supabase auth.users directly
DROP TABLE IF EXISTS "users";

-- Add comment to clarify that profiles.id references auth.users.id
COMMENT ON COLUMN "profiles"."id" IS 'References auth.users.id from Supabase Auth';
