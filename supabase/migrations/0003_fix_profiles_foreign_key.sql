-- Fix profiles table to work with Supabase Auth users
-- Instead of changing the foreign key, we'll create a trigger to automatically 
-- create entries in public.users when a profile is created

-- Create a function to handle user creation in public.users
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users if the user doesn't exist
  INSERT INTO public.users (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create user entries
CREATE TRIGGER on_profile_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_profile();
