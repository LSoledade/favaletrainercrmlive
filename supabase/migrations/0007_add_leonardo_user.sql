-- Add Leonardo user to auth.users and public.profiles

-- Step 1: Insert the user into the authentication schema.
-- Note: This creates a user without a password. They will need to use the "Forgot Password" flow to set one.
-- You can also set a temporary password here if needed, but that requires encrypting it first.
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'b751ba13-494e-409a-9b2f-72c2b204e6ea', 'authenticated', 'authenticated', 'leonardo@favale.com', crypt('password123', gen_salt('bf')), now(), '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{"username": "Leonardo", "full_name": "Leonardo"}', now(), now(), '', '', NULL);

-- Step 2: Insert the corresponding profile into the public schema.
-- This links the user's public profile to their authentication record.
INSERT INTO public.profiles (id, username, full_name, role)
VALUES
  ('b751ba13-494e-409a-9b2f-72c2b204e6ea', 'Leonardo', 'Leonardo', 'trainer');
