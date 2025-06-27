-- Clean up functions and triggers from migration 0003 that reference the old users table
DROP TRIGGER IF EXISTS on_profile_insert ON profiles;
DROP FUNCTION IF EXISTS handle_new_profile();

-- Create initial admin user profile
-- Note: You still need to create the actual auth user first via Supabase Dashboard
-- INSERT INTO profiles (id, username, full_name, role) 
-- VALUES (
--   '1bf6f9af-33e7-4d05-908e-97dc041d8777', -- Replace with actual UUID from auth.users
--   'admin',
--   'Administrador do Sistema',
--   'admin'
-- ) ON CONFLICT (id) DO UPDATE SET 
--   username = EXCLUDED.username,
--   full_name = EXCLUDED.full_name,
--   role = EXCLUDED.role;

-- Note: To create the complete admin user:
-- 1. First create auth user via Supabase Dashboard -> Authentication -> Users -> Create User
--    Use email: admin@example.com, password: admin123 (change as needed)
-- 2. Copy the generated UUID and replace the one above
-- 3. Run this migration or insert the profile manually
