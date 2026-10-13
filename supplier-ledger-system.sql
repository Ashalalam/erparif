-- ============================================
-- SUPPLIER/WHOLESALER LEDGER SYSTEM
-- ============================================
-- Track payables to suppliers and payments made

-- 1. Create supplier_ledger table
CREATE TABLE IF NOT EXISTS supplier_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES wholesalers(id) ON DELETE CASCADE NOT NULL,
  transaction_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  debit_amount DECIMAL(12, 2) DEFAULT 0,  -- Payments made to supplier
  credit_amount DECIMAL(12, 2) DEFAULT 0, -- Purchases (what you owe)
  balance DECIMAL(12, 2) NOT NULL,
  description TEXT,
  payment_method VARCHAR(50),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supplier ON supplier_ledger(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_date ON supplier_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_type ON supplier_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_reference ON supplier_ledger(reference_type, reference_id);

-- Add check constraint for transaction_type
ALTER TABLE supplier_ledger DROP CONSTRAINT IF EXISTS supplier_ledger_transaction_type_check;
ALTER TABLE supplier_ledger ADD CONSTRAINT supplier_ledger_transaction_type_check 
  CHECK (transaction_type IN ('PURCHASE', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'OPENING_BALANCE', 'ADJUSTMENT'));

COMMENT ON TABLE supplier_ledger IS 'Supplier account ledger for tracking purchases and payments';

-- 2. Add ledger balance fields to wholesalers table
ALTER TABLE wholesalers 
ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN wholesalers.opening_balance IS 'Opening balance for the supplier account';
COMMENT ON COLUMN wholesalers.current_balance IS 'Current outstanding payable to supplier';

-- 3. Create function to update supplier balance
CREATE OR REPLACE FUNCTION update_supplier_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update supplier current balance based on ledger entry
  UPDATE wholesalers 
  SET current_balance = (
    SELECT COALESCE(SUM(credit_amount - debit_amount), 0) + opening_balance
    FROM supplier_ledger 
    WHERE supplier_id = NEW.supplier_id
  )
  WHERE id = NEW.supplier_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for supplier balance update
DROP TRIGGER IF EXISTS trigger_update_supplier_balance ON supplier_ledger;
CREATE TRIGGER trigger_update_supplier_balance
  AFTER INSERT OR UPDATE ON supplier_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_balance();

-- 4. Create function to create ledger entry on purchase
CREATE OR REPLACE FUNCTION create_purchase_ledger_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create ledger entry if supplier exists and payment is not full
  IF NEW.supplier_id IS NOT NULL AND NEW.due_amount > 0 THEN
    INSERT INTO supplier_ledger (
      supplier_id,
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
      NEW.supplier_id,
      NEW.created_at,
      'PURCHASE',
      'PURCHASE',
      NEW.id,
      NEW.paid_amount,
      NEW.total,
      (SELECT current_balance FROM wholesalers WHERE id = NEW.supplier_id) + NEW.due_amount,
      'Purchase Invoice: ' || NEW.invoice_number,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for purchase ledger entry
DROP TRIGGER IF EXISTS trigger_create_purchase_ledger ON purchases;
CREATE TRIGGER trigger_create_purchase_ledger
  AFTER INSERT ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION create_purchase_ledger_entry();

-- 5. Enable RLS on supplier_ledger table
ALTER TABLE supplier_ledger ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read supplier ledger" ON supplier_ledger;
CREATE POLICY "Allow authenticated users to read supplier ledger"
  ON supplier_ledger FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert supplier ledger" ON supplier_ledger;
CREATE POLICY "Allow authenticated users to insert supplier ledger"
  ON supplier_ledger FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update supplier ledger" ON supplier_ledger;
CREATE POLICY "Allow authenticated users to update supplier ledger"
  ON supplier_ledger FOR UPDATE
  TO authenticated
  USING (true);

-- 6. Grant API access
GRANT SELECT, INSERT, UPDATE, DELETE ON supplier_ledger TO authenticated;

-- 7. Reload schema
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Supplier Ledger System Installed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Features added:';
  RAISE NOTICE '✓ Supplier ledger table created';
  RAISE NOTICE '✓ Auto-link purchases to supplier ledger';
  RAISE NOTICE '✓ Track payables to suppliers';
  RAISE NOTICE '✓ Payment tracking for suppliers';
  RAISE NOTICE '✓ Opening balance support';
  RAISE NOTICE '✓ Manual adjustment support';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'IMPORTANT: Restart Supabase project to activate!';
  RAISE NOTICE '========================================';
END $$;
