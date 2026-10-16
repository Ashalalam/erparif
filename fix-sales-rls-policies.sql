-- Fix Sales RLS Policies for POS
-- This fixes the 400 error when creating sales from POS

-- Drop existing policies
DROP POLICY IF EXISTS "sales_select_own_or_staff" ON sales;
DROP POLICY IF EXISTS "sales_insert_staff" ON sales;
DROP POLICY IF EXISTS "sales_update_staff" ON sales;
DROP POLICY IF EXISTS "sales_delete_admin" ON sales;

DROP POLICY IF EXISTS "sale_items_select_via_sales" ON sale_items;
DROP POLICY IF EXISTS "sale_items_insert_staff" ON sale_items;
DROP POLICY IF EXISTS "sale_items_update_staff" ON sale_items;
DROP POLICY IF EXISTS "sale_items_delete_staff" ON sale_items;

-- Sales: SELECT policy
-- Allow users to see sales they created OR if they are staff/admin
CREATE POLICY "sales_select_policy" ON sales
  FOR SELECT 
  USING (
    created_by = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pharmacist', 'staff')
    )
  );

-- Sales: INSERT policy
-- Only admin, pharmacist, and staff can create sales
CREATE POLICY "sales_insert_policy" ON sales
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pharmacist', 'staff')
    )
  );

-- Sales: UPDATE policy
-- Only admin and pharmacist can update sales
CREATE POLICY "sales_update_policy" ON sales
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pharmacist')
    )
  );

-- Sales: DELETE policy
-- Only admin can delete sales
CREATE POLICY "sales_delete_policy" ON sales
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Sale Items: SELECT policy
-- Allow users to see sale items for sales they can access
CREATE POLICY "sale_items_select_policy" ON sale_items
  FOR SELECT 
  USING (
    sale_id IN (
      SELECT id FROM sales WHERE 
        created_by = auth.uid() 
        OR 
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('admin', 'pharmacist', 'staff')
        )
    )
  );

-- Sale Items: INSERT policy
-- Only admin, pharmacist, and staff can create sale items
CREATE POLICY "sale_items_insert_policy" ON sale_items
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pharmacist', 'staff')
    )
  );

-- Sale Items: UPDATE policy
-- Only admin and pharmacist can update sale items
CREATE POLICY "sale_items_update_policy" ON sale_items
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pharmacist')
    )
  );

-- Sale Items: DELETE policy
-- Only admin can delete sale items
CREATE POLICY "sale_items_delete_policy" ON sale_items
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON sales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sale_items TO authenticated;

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('sales', 'sale_items')
ORDER BY tablename, policyname;
