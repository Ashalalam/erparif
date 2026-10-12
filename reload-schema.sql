-- Reload Supabase API Schema Cache
-- Run this in Supabase SQL Editor after creating new tables/views

NOTIFY pgrst, 'reload schema';

-- Also verify the views exist
SELECT 'customer_outstanding_summary exists' as check_result 
FROM information_schema.views 
WHERE table_name = 'customer_outstanding_summary';

SELECT 'narcotic_sales_report exists' as check_result 
FROM information_schema.views 
WHERE table_name = 'narcotic_sales_report';

SELECT 'prescriptions exists' as check_result 
FROM information_schema.tables 
WHERE table_name = 'prescriptions';
