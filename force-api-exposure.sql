-- Force Supabase API to expose the new tables
-- This grants explicit API access permissions

-- Grant usage on schema to PostgREST
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on all tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant select on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure RLS is enabled on new tables
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE narcotic_sales_log ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies with explicit grants
DROP POLICY IF EXISTS "authenticated_select_prescriptions" ON prescriptions;
CREATE POLICY "authenticated_select_prescriptions" ON prescriptions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_all_prescriptions" ON prescriptions;
CREATE POLICY "authenticated_all_prescriptions" ON prescriptions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_select_ledger" ON customer_ledger;
CREATE POLICY "authenticated_select_ledger" ON customer_ledger
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_all_ledger" ON customer_ledger;
CREATE POLICY "authenticated_all_ledger" ON customer_ledger
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_select_narcotic" ON narcotic_sales_log;
CREATE POLICY "authenticated_select_narcotic" ON narcotic_sales_log
  FOR SELECT TO authenticated USING (true);

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Verify tables are accessible
SELECT 
  schemaname,
  tablename,
  tableowner,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('prescriptions', 'customer_ledger', 'narcotic_sales_log');

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '========================================';
  RAISE NOTICE 'API exposure forced!';
  RAISE NOTICE 'Now restart your Supabase project:';
  RAISE NOTICE '1. Settings → General → Pause Project';
  RAISE NOTICE '2. Wait 10 seconds';
  RAISE NOTICE '3. Resume Project';
  RAISE NOTICE '========================================';
END $$;
