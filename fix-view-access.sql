-- Fix: Enable API access to views for Supabase PostgREST
-- Views need RLS policies to be accessible via Supabase API

-- Enable RLS on views (required for PostgREST access)
ALTER VIEW customer_outstanding_summary SET (security_invoker = on);
ALTER VIEW narcotic_sales_report SET (security_invoker = on);

-- Alternative: Create RLS policies for views by making them materialized
-- This is more reliable for Supabase API access

-- Drop existing views
DROP VIEW IF EXISTS customer_outstanding_summary;
DROP VIEW IF EXISTS narcotic_sales_report;

-- Recreate as MATERIALIZED VIEWS (these support RLS)
CREATE MATERIALIZED VIEW customer_outstanding_summary AS
SELECT 
  c.id,
  c.name,
  c.business_name,
  c.phone,
  c.customer_type,
  c.opening_balance,
  c.current_balance,
  c.credit_limit,
  c.credit_days,
  COALESCE(SUM(CASE WHEN cl.transaction_type = 'SALE' THEN cl.debit_amount ELSE 0 END), 0) as total_sales,
  COALESCE(SUM(CASE WHEN cl.transaction_type = 'PAYMENT' THEN cl.credit_amount ELSE 0 END), 0) as total_payments,
  c.current_balance as outstanding_amount,
  CASE 
    WHEN c.current_balance > c.credit_limit THEN 'EXCEEDED'
    WHEN c.current_balance > c.credit_limit * 0.8 THEN 'WARNING'
    ELSE 'NORMAL'
  END as credit_status
FROM customers c
LEFT JOIN customer_ledger cl ON c.id = cl.customer_id
WHERE c.status = 'active'
GROUP BY c.id, c.name, c.business_name, c.phone, c.customer_type, 
         c.opening_balance, c.current_balance, c.credit_limit, c.credit_days;

CREATE MATERIALIZED VIEW narcotic_sales_report AS
SELECT 
  nsl.id,
  nsl.sale_date,
  s.invoice_number,
  m.name as medicine_name,
  m.generic_name,
  nsl.drug_schedule,
  nsl.quantity,
  mb.batch_number,
  mb.expiry_date,
  nsl.customer_name,
  nsl.customer_phone,
  nsl.doctor_name,
  nsl.doctor_registration,
  p.prescription_number,
  p.prescription_date,
  u.email as dispensed_by_email
FROM narcotic_sales_log nsl
LEFT JOIN sales s ON nsl.sale_id = s.id
LEFT JOIN medicines m ON nsl.medicine_id = m.id
LEFT JOIN medicine_batches mb ON nsl.batch_id = mb.id
LEFT JOIN prescriptions p ON nsl.prescription_id = p.id
LEFT JOIN auth.users u ON nsl.dispensed_by = u.id
ORDER BY nsl.sale_date DESC;

-- Enable RLS on materialized views
ALTER MATERIALIZED VIEW customer_outstanding_summary ENABLE ROW LEVEL SECURITY;
ALTER MATERIALIZED VIEW narcotic_sales_report ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for materialized views
CREATE POLICY "Allow authenticated users to read customer_outstanding_summary"
  ON customer_outstanding_summary FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read narcotic_sales_report"
  ON narcotic_sales_report FOR SELECT
  TO authenticated
  USING (true);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_ledger_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW customer_outstanding_summary;
  REFRESH MATERIALIZED VIEW narcotic_sales_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to refresh views when data changes
CREATE OR REPLACE FUNCTION trigger_refresh_views()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_ledger_views();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to refresh views on data changes
DROP TRIGGER IF EXISTS refresh_views_on_ledger ON customer_ledger;
CREATE TRIGGER refresh_views_on_ledger
  AFTER INSERT OR UPDATE OR DELETE ON customer_ledger
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_views();

DROP TRIGGER IF EXISTS refresh_views_on_narcotic ON narcotic_sales_log;
CREATE TRIGGER refresh_views_on_narcotic
  AFTER INSERT OR UPDATE OR DELETE ON narcotic_sales_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_views();

-- Initial refresh
SELECT refresh_ledger_views();

-- Reload schema
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Views fixed and schema reloaded!';
  RAISE NOTICE 'The views are now accessible through Supabase API';
END $$;
