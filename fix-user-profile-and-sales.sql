-- Fix User Profile and Sales RLS Policies
-- This creates/updates your profile and fixes the sales policies

-- =====================================================
-- STEP 1: Check all existing profiles
-- =====================================================
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- =====================================================
-- STEP 2: Find your user ID from auth.users
-- =====================================================
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- STEP 3: Create/Update your profile
-- Replace 'YOUR_EMAIL_HERE' with your actual login email
-- =====================================================

-- Option A: If you know your email, run this:
-- INSERT INTO profiles (id, email, full_name, role)
-- SELECT 
--   id, 
--   email, 
--   COALESCE(raw_user_meta_data->>'full_name', email), 
--   'admin'
-- FROM auth.users 
-- WHERE email = 'YOUR_EMAIL_HERE'
-- ON CONFLICT (id) 
-- DO UPDATE SET 
--   role = 'admin',
--   updated_at = NOW();

-- Option B: Set ALL users as admin (if single user system):
INSERT INTO profiles (id, email, full_name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', email), 
  'admin'
FROM auth.users
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'admin',
  updated_at = NOW();

-- =====================================================
-- STEP 4: Verify profiles were created/updated
-- =====================================================
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- =====================================================
-- STEP 5: Fix Sales RLS Policies (Simplified)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "sales_select_own_or_staff" ON sales;
DROP POLICY IF EXISTS "sales_select_staff_or_own" ON sales;
DROP POLICY IF EXISTS "sales_insert_staff" ON sales;
DROP POLICY IF EXISTS "sales_update_staff" ON sales;
DROP POLICY IF EXISTS "sales_delete_admin" ON sales;
DROP POLICY IF EXISTS "sales_select_policy" ON sales;
DROP POLICY IF EXISTS "sales_insert_policy" ON sales;
DROP POLICY IF EXISTS "sales_update_policy" ON sales;
DROP POLICY IF EXISTS "sales_delete_policy" ON sales;

DROP POLICY IF EXISTS "sale_items_select_via_sales" ON sale_items;
DROP POLICY IF EXISTS "sale_items_insert_staff" ON sale_items;
DROP POLICY IF EXISTS "sale_items_update_staff" ON sale_items;
DROP POLICY IF EXISTS "sale_items_delete_staff" ON sale_items;
DROP POLICY IF EXISTS "sale_items_select_policy" ON sale_items;
DROP POLICY IF EXISTS "sale_items_insert_policy" ON sale_items;
DROP POLICY IF EXISTS "sale_items_update_policy" ON sale_items;
DROP POLICY IF EXISTS "sale_items_delete_policy" ON sale_items;

-- =====================================================
-- Sales Policies (Simplified - checks profiles table)
-- =====================================================

-- SELECT: Allow staff to see all sales, others see their own
CREATE POLICY "sales_select" ON sales
  FOR SELECT 
  USING (
    created_by = auth.uid() 
    OR 
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('admin', 'pharmacist', 'staff')
    )
  );

-- INSERT: Only allow staff to create sales
CREATE POLICY "sales_insert" ON sales
  FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('admin', 'pharmacist', 'staff')
    )
  );

-- UPDATE: Only allow admin/pharmacist to update
CREATE POLICY "sales_update" ON sales
  FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('admin', 'pharmacist')
    )
  );

-- DELETE: Only admin can delete
CREATE POLICY "sales_delete" ON sales
  FOR DELETE 
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role = 'admin'
    )
  );

-- =====================================================
-- Sale Items Policies (Simplified)
-- =====================================================

-- SELECT: Allow if user can see the parent sale
CREATE POLICY "sale_items_select" ON sale_items
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM sales 
      WHERE sales.id = sale_items.sale_id
      AND (
        sales.created_by = auth.uid() 
        OR 
        auth.uid() IN (
          SELECT id FROM profiles 
          WHERE role IN ('admin', 'pharmacist', 'staff')
        )
      )
    )
  );

-- INSERT: Only staff can create sale items
CREATE POLICY "sale_items_insert" ON sale_items
  FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('admin', 'pharmacist', 'staff')
    )
  );

-- UPDATE: Only admin/pharmacist can update
CREATE POLICY "sale_items_update" ON sale_items
  FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('admin', 'pharmacist')
    )
  );

-- DELETE: Only admin can delete
CREATE POLICY "sale_items_delete" ON sale_items
  FOR DELETE 
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role = 'admin'
    )
  );

-- =====================================================
-- STEP 6: Grant permissions
-- =====================================================
GRANT SELECT, INSERT, UPDATE ON sales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sale_items TO authenticated;

-- =====================================================
-- STEP 7: Verify everything is set up
-- =====================================================

-- Check profiles
SELECT 
  'PROFILES' as check_type,
  COUNT(*) as count,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
  COUNT(CASE WHEN role IN ('admin', 'pharmacist', 'staff') THEN 1 END) as staff_count
FROM profiles;

-- Check policies
SELECT 
  'POLICIES' as check_type,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('sales', 'sale_items')
GROUP BY tablename;

-- List all policies
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename IN ('sales', 'sale_items')
ORDER BY tablename, cmd, policyname;
