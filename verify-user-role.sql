-- Verify User Role for POS Access
-- Run this to check if your current user has the proper role

-- Check current user's profile
SELECT 
  id,
  full_name,
  email,
  role,
  created_at
FROM profiles
WHERE id = auth.uid();

-- If you need to update your role to admin:
-- UPDATE profiles SET role = 'admin' WHERE id = auth.uid();

-- Check all users and their roles
SELECT 
  id,
  full_name,
  email,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- Check if sales table has RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('sales', 'sale_items');

-- Check existing policies on sales table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('sales', 'sale_items')
ORDER BY tablename, policyname;
