-- ============================================
-- LEDGER AND COMPLIANCE FEATURES
-- ============================================

-- 1. Add schedule and prescription fields to medicines table
ALTER TABLE medicines 
ADD COLUMN IF NOT EXISTS drug_schedule VARCHAR(10) DEFAULT 'GENERAL',
ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_narcotic BOOLEAN DEFAULT false;

-- Add check constraint for drug_schedule
ALTER TABLE medicines DROP CONSTRAINT IF EXISTS medicines_drug_schedule_check;
ALTER TABLE medicines ADD CONSTRAINT medicines_drug_schedule_check 
  CHECK (drug_schedule IN ('GENERAL', 'H', 'H1', 'X', 'NARCOTIC'));

COMMENT ON COLUMN medicines.drug_schedule IS 'Drug schedule classification: GENERAL, H, H1, X, NARCOTIC';
COMMENT ON COLUMN medicines.requires_prescription IS 'Whether this medicine requires prescription';
COMMENT ON COLUMN medicines.is_narcotic IS 'Whether this is a narcotic/controlled substance';

-- 2. Create prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_number VARCHAR(100) UNIQUE NOT NULL,
  prescription_date DATE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  doctor_name VARCHAR(255) NOT NULL,
  doctor_registration_number VARCHAR(100),
  doctor_specialty VARCHAR(100),
  doctor_phone VARCHAR(20),
  prescription_file_url TEXT,
  notes TEXT,
  valid_until DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_customer ON prescriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_number ON prescriptions(prescription_number);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(prescription_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);

COMMENT ON TABLE prescriptions IS 'Doctor prescriptions for controlled substances';

-- 3. Add prescription reference to sales
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS doctor_registration VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_sales_prescription ON sales(prescription_id);

-- 4. Create narcotic_sales_log table for regulatory compliance
CREATE TABLE IF NOT EXISTS narcotic_sales_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL NOT NULL,
  batch_id UUID REFERENCES medicine_batches(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  drug_schedule VARCHAR(10) NOT NULL,
  doctor_name VARCHAR(255),
  doctor_registration VARCHAR(100),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_address TEXT,
  sale_date TIMESTAMPTZ NOT NULL,
  dispensed_by UUID REFERENCES auth.users(id),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_narcotic_log_sale ON narcotic_sales_log(sale_id);
CREATE INDEX IF NOT EXISTS idx_narcotic_log_medicine ON narcotic_sales_log(medicine_id);
CREATE INDEX IF NOT EXISTS idx_narcotic_log_schedule ON narcotic_sales_log(drug_schedule);
CREATE INDEX IF NOT EXISTS idx_narcotic_log_date ON narcotic_sales_log(sale_date);

COMMENT ON TABLE narcotic_sales_log IS 'Regulatory log for Schedule H/H1/Narcotic drug sales';

-- 5. Create customer_ledger table for payment tracking
CREATE TABLE IF NOT EXISTS customer_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  transaction_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  debit_amount DECIMAL(12, 2) DEFAULT 0,
  credit_amount DECIMAL(12, 2) DEFAULT 0,
  balance DECIMAL(12, 2) NOT NULL,
  description TEXT,
  payment_method VARCHAR(50),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_customer ON customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON customer_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON customer_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON customer_ledger(reference_type, reference_id);

-- Add check constraint for transaction_type
ALTER TABLE customer_ledger DROP CONSTRAINT IF EXISTS customer_ledger_transaction_type_check;
ALTER TABLE customer_ledger ADD CONSTRAINT customer_ledger_transaction_type_check 
  CHECK (transaction_type IN ('SALE', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'OPENING_BALANCE', 'ADJUSTMENT'));

COMMENT ON TABLE customer_ledger IS 'Customer account ledger for tracking payments and outstanding balances';

-- 6. Add ledger fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_days INTEGER DEFAULT 0;

COMMENT ON COLUMN customers.opening_balance IS 'Opening balance for the customer';
COMMENT ON COLUMN customers.current_balance IS 'Current outstanding balance';
COMMENT ON COLUMN customers.credit_limit IS 'Maximum credit limit allowed';
COMMENT ON COLUMN customers.credit_days IS 'Credit period in days';

-- 7. Create function to update customer balance
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer current balance based on ledger entry
  UPDATE customers 
  SET current_balance = (
    SELECT COALESCE(SUM(debit_amount - credit_amount), 0) + opening_balance
    FROM customer_ledger 
    WHERE customer_id = NEW.customer_id
  )
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for customer balance update
DROP TRIGGER IF EXISTS trigger_update_customer_balance ON customer_ledger;
CREATE TRIGGER trigger_update_customer_balance
  AFTER INSERT OR UPDATE ON customer_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_balance();

-- 8. Create function to log narcotic sales
CREATE OR REPLACE FUNCTION log_narcotic_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_medicine RECORD;
  v_customer RECORD;
  v_sale RECORD;
BEGIN
  -- Get medicine details
  SELECT * INTO v_medicine FROM medicines WHERE id = NEW.medicine_id;
  
  -- Only log if it's a scheduled drug
  IF v_medicine.drug_schedule IN ('H', 'H1', 'X', 'NARCOTIC') OR v_medicine.is_narcotic THEN
    -- Get sale details
    SELECT * INTO v_sale FROM sales WHERE id = NEW.sale_id;
    
    -- Get customer details
    IF v_sale.customer_id IS NOT NULL THEN
      SELECT * INTO v_customer FROM customers WHERE id = v_sale.customer_id;
    END IF;
    
    -- Insert into narcotic log
    INSERT INTO narcotic_sales_log (
      sale_id,
      medicine_id,
      batch_id,
      prescription_id,
      customer_id,
      quantity,
      drug_schedule,
      doctor_name,
      doctor_registration,
      customer_name,
      customer_phone,
      customer_address,
      sale_date,
      dispensed_by
    ) VALUES (
      NEW.sale_id,
      NEW.medicine_id,
      NEW.batch_id,
      v_sale.prescription_id,
      v_sale.customer_id,
      NEW.quantity,
      v_medicine.drug_schedule,
      v_sale.doctor_name,
      v_sale.doctor_registration,
      v_customer.name,
      v_customer.phone,
      v_customer.address,
      v_sale.created_at,
      v_sale.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for narcotic logging
DROP TRIGGER IF EXISTS trigger_log_narcotic_sale ON sale_items;
CREATE TRIGGER trigger_log_narcotic_sale
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION log_narcotic_sale();

-- 9. Create function to create ledger entry on sale
CREATE OR REPLACE FUNCTION create_sale_ledger_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create ledger entry if customer exists and payment is not full
  IF NEW.customer_id IS NOT NULL AND NEW.due_amount > 0 THEN
    INSERT INTO customer_ledger (
      customer_id,
      transaction_date,
      transaction_type,
      reference_type,
      reference_id,
      debit_amount,
      credit_amount,
      balance,
      description,
      created_by
    ) VALUES (
      NEW.customer_id,
      NEW.created_at,
      'SALE',
      'SALE',
      NEW.id,
      NEW.total,
      NEW.paid_amount,
      (SELECT current_balance FROM customers WHERE id = NEW.customer_id) + NEW.due_amount,
      'Sale Invoice: ' || NEW.invoice_number,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sale ledger entry
DROP TRIGGER IF EXISTS trigger_create_sale_ledger ON sales;
CREATE TRIGGER trigger_create_sale_ledger
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION create_sale_ledger_entry();

-- 10. Enable RLS on new tables
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE narcotic_sales_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert prescriptions"
  ON prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update prescriptions"
  ON prescriptions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read narcotic log"
  ON narcotic_sales_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read ledger"
  ON customer_ledger FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert ledger"
  ON customer_ledger FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 11. Create views for reporting
CREATE OR REPLACE VIEW customer_outstanding_summary AS
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

COMMENT ON VIEW customer_outstanding_summary IS 'Summary of customer outstanding balances and credit status';

-- 12. Create view for narcotic sales report
CREATE OR REPLACE VIEW narcotic_sales_report AS
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

COMMENT ON VIEW narcotic_sales_report IS 'Detailed report of all narcotic and scheduled drug sales';

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Ledger and compliance features installed successfully!';
  RAISE NOTICE 'Features added:';
  RAISE NOTICE '1. Drug scheduling (H/H1/Narcotic) with prescription requirements';
  RAISE NOTICE '2. Prescription management system';
  RAISE NOTICE '3. Narcotic sales logging for regulatory compliance';
  RAISE NOTICE '4. Customer ledger for payment tracking';
  RAISE NOTICE '5. Outstanding balance management';
  RAISE NOTICE '6. Credit limit monitoring';
END $$;
