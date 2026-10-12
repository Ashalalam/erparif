-- Verify that all required tables exist
-- Run this in Supabase SQL Editor to check

SELECT 'Checking tables...' as status;

-- Check if tables exist
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'prescriptions',
    'customer_ledger',
    'narcotic_sales_log'
  )
ORDER BY table_name;

-- If any tables are missing, they weren't created
-- You need to run complete-database-setup.sql again

-- Also check views
SELECT 
  'VIEW: ' || table_name as name,
  '✓ EXISTS' as status
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN (
    'customer_outstanding_summary',
    'narcotic_sales_report'
  );

-- Count rows in each table (to verify they're accessible)
SELECT 'prescriptions' as table_name, COUNT(*) as row_count FROM prescriptions
UNION ALL
SELECT 'customer_ledger', COUNT(*) FROM customer_ledger
UNION ALL
SELECT 'narcotic_sales_log', COUNT(*) FROM narcotic_sales_log;
