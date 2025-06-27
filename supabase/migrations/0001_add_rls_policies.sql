-- Enable RLS on profiles table
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own profile
CREATE POLICY "Users can read own profile" ON "profiles"
  FOR SELECT USING (auth.uid() = id);

-- Policy to allow users to update their own profile  
CREATE POLICY "Users can update own profile" ON "profiles"
  FOR UPDATE USING (auth.uid() = id);

-- Policy to allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile" ON "profiles"
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy to allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" ON "profiles"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "profiles" 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Policy to allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" ON "profiles"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "profiles" 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
