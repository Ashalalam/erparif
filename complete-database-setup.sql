-- ============================================
-- BILLSPROUT ERP - COMPLETE DATABASE SETUP
-- ============================================
-- This file combines:
-- 1. Base schema (all core tables)
-- 2. Settings table migration
-- 3. Bank details migration
-- 4. Customer business fields migration
-- 5. FSSAI and balance fields migration
-- 6. Ledger and compliance features migration
-- 
-- Run this ONCE in Supabase SQL Editor to set up everything
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PART 1: BASE SCHEMA
-- ============================================

-- Create profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'pharmacist', 'staff', 'patient', 'retailer', 'wholesaler')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create medicines table
CREATE TABLE IF NOT EXISTS medicines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  generic_name TEXT,
  brand TEXT,
  manufacturer TEXT,
  category TEXT,
  composition TEXT,
  dosage_form TEXT,
  strength TEXT,
  hsn_code TEXT,
  gst_percentage DECIMAL(5,2) DEFAULT 0,
  prescription_required BOOLEAN DEFAULT false,
  description TEXT,
  low_stock_threshold INTEGER DEFAULT 10,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create wholesalers table
CREATE TABLE IF NOT EXISTS wholesalers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  gstin TEXT,
  drug_license_number TEXT NOT NULL,
  drug_license_expiry DATE NOT NULL,
  pan TEXT,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create retailers table
CREATE TABLE IF NOT EXISTS retailers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  state TEXT,
  gstin TEXT,
  drug_license_number TEXT,
  drug_license_expiry DATE,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  patient_id TEXT,
  customer_type TEXT DEFAULT 'individual' CHECK (customer_type IN ('individual', 'retailer', 'wholesaler')),
  emergency_contact TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create medicine_batches table
CREATE TABLE IF NOT EXISTS medicine_batches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  supplier_purchase_price DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  wholesale_price DECIMAL(10,2) NOT NULL,
  gst_percentage DECIMAL(5,2) DEFAULT 0,
  initial_quantity INTEGER NOT NULL,
  current_quantity INTEGER NOT NULL,
  free_quantity INTEGER DEFAULT 0,
  rack_location TEXT,
  supplier_id UUID REFERENCES wholesalers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(medicine_id, batch_number)
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES wholesalers(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  gst_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  due_amount DECIMAL(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchase_items table
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id),
  batch_id UUID REFERENCES medicine_batches(id),
  quantity INTEGER NOT NULL,
  free_quantity INTEGER DEFAULT 0,
  purchase_price DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  gst_percentage DECIMAL(5,2) DEFAULT 0,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  retailer_id UUID REFERENCES retailers(id),
  wholesaler_id UUID REFERENCES wholesalers(id),
  subtotal DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  gst_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  due_amount DECIMAL(12,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'credit')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  sale_type TEXT DEFAULT 'retail' CHECK (sale_type IN ('retail', 'wholesale')),
  prescription_reference TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id),
  batch_id UUID REFERENCES medicine_batches(id),
  quantity INTEGER NOT NULL,
  free_quantity INTEGER DEFAULT 0,
  selling_price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  gst_percentage DECIMAL(5,2) DEFAULT 0,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  medicine_id UUID REFERENCES medicines(id),
  batch_id UUID REFERENCES medicine_batches(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'return', 'adjustment', 'damage', 'expiry', 'free', 'transfer')),
  quantity INTEGER NOT NULL,
  free_quantity INTEGER DEFAULT 0,
  reference_type TEXT CHECK (reference_type IN ('purchase', 'sale', 'return', 'adjustment')),
  reference_id UUID,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id),
  customer_id UUID REFERENCES customers(id),
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'credit')),
  reference_number TEXT,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id),
  return_number TEXT UNIQUE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  reason TEXT,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create return_items table
CREATE TABLE IF NOT EXISTS return_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  return_id UUID REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES sale_items(id),
  medicine_id UUID REFERENCES medicines(id),
  batch_id UUID REFERENCES medicine_batches(id),
  quantity INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_generic_name ON medicines(generic_name);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_expiry ON medicine_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_medicine_id ON medicine_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_medicine_id ON stock_movements(medicine_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_id ON stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- Create functions for automatic invoice number generation
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  new_invoice_number TEXT;
BEGIN
  -- Get the next invoice number
  SELECT COALESCE(MAX(CAST(SUBSTRING(s.invoice_number FROM 'INV-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM sales s
  WHERE s.invoice_number ~ '^INV-\d{4}-\d+$'
    AND EXTRACT(YEAR FROM s.created_at) = EXTRACT(YEAR FROM NOW());
  
  -- Format the invoice number
  new_invoice_number := 'INV-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(next_number::TEXT, 8, '0');
  
  RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update stock after sale
CREATE OR REPLACE FUNCTION update_stock_after_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Update batch quantity
  UPDATE medicine_batches
  SET current_quantity = current_quantity - (NEW.quantity + NEW.free_quantity),
      updated_at = NOW()
  WHERE id = NEW.batch_id;
  
  -- Create stock movement record
  INSERT INTO stock_movements (
    medicine_id, batch_id, movement_type, quantity, free_quantity,
    reference_type, reference_id, created_by
  ) VALUES (
    NEW.medicine_id, NEW.batch_id, 'sale', NEW.quantity, NEW.free_quantity,
    'sale', NEW.sale_id, 
    (SELECT created_by FROM sales WHERE id = NEW.sale_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to restore stock after return
CREATE OR REPLACE FUNCTION restore_stock_after_return()
RETURNS TRIGGER AS $$
BEGIN
  -- Update batch quantity
  UPDATE medicine_batches
  SET current_quantity = current_quantity + NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.batch_id;
  
  -- Create stock movement record
  INSERT INTO stock_movements (
    medicine_id, batch_id, movement_type, quantity,
    reference_type, reference_id, created_by
  ) VALUES (
    NEW.medicine_id, NEW.batch_id, 'return', NEW.quantity,
    'return', NEW.return_id,
    (SELECT processed_by FROM returns WHERE id = NEW.return_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update stock after purchase
CREATE OR REPLACE FUNCTION update_stock_after_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Update batch quantity
  UPDATE medicine_batches
  SET current_quantity = current_quantity + (NEW.quantity + NEW.free_quantity),
      updated_at = NOW()
  WHERE id = NEW.batch_id;
  
  -- Create stock movement record
  INSERT INTO stock_movements (
    medicine_id, batch_id, movement_type, quantity, free_quantity,
    reference_type, reference_id, created_by
  ) VALUES (
    NEW.medicine_id, NEW.batch_id, 'purchase', NEW.quantity, NEW.free_quantity,
    'purchase', NEW.purchase_id,
    (SELECT created_by FROM purchases WHERE id = NEW.purchase_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_stock_after_sale ON sale_items;
CREATE TRIGGER trigger_update_stock_after_sale
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_after_sale();

DROP TRIGGER IF EXISTS trigger_restore_stock_after_return ON return_items;
CREATE TRIGGER trigger_restore_stock_after_return
  AFTER INSERT ON return_items
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_after_return();

DROP TRIGGER IF EXISTS trigger_update_stock_after_purchase ON purchase_items;
CREATE TRIGGER trigger_update_stock_after_purchase
  AFTER INSERT ON purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_after_purchase();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesalers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE id IN (
        SELECT p.id FROM profiles p WHERE p.role = 'admin' AND p.id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE id IN (
        SELECT p.id FROM profiles p WHERE p.role = 'admin' AND p.id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE id IN (
        SELECT p.id FROM profiles p WHERE p.role = 'admin' AND p.id = auth.uid()
      )
    )
  );

-- Simplified policy for all authenticated users
DROP POLICY IF EXISTS "medicines_select_authenticated" ON medicines;
CREATE POLICY "medicines_select_authenticated" ON medicines
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "medicines_modify_staff" ON medicines;
CREATE POLICY "medicines_modify_staff" ON medicines
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'pharmacist') AND id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "medicine_batches_select_authenticated" ON medicine_batches;
CREATE POLICY "medicine_batches_select_authenticated" ON medicine_batches
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "medicine_batches_modify_staff" ON medicine_batches;
CREATE POLICY "medicine_batches_modify_staff" ON medicine_batches
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'pharmacist') AND id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sales_select_own_or_staff" ON sales;
CREATE POLICY "sales_select_own_or_staff" ON sales
  FOR SELECT USING (
    created_by = auth.uid() OR
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'pharmacist', 'staff') AND id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sales_insert_staff" ON sales;
CREATE POLICY "sales_insert_staff" ON sales
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'pharmacist', 'staff') AND id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sale_items_select_via_sales" ON sale_items;
CREATE POLICY "sale_items_select_via_sales" ON sale_items
  FOR SELECT USING (
    sale_id IN (
      SELECT id FROM sales WHERE 
      created_by = auth.uid() OR
      auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('admin', 'pharmacist', 'staff') AND id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "sale_items_insert_staff" ON sale_items;
CREATE POLICY "sale_items_insert_staff" ON sale_items
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'pharmacist', 'staff') AND id = auth.uid()
    )
  );

-- Allow all authenticated users
DROP POLICY IF EXISTS "customers_all_authenticated" ON customers;
CREATE POLICY "customers_all_authenticated" ON customers FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "retailers_all_authenticated" ON retailers;
CREATE POLICY "retailers_all_authenticated" ON retailers FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "wholesalers_all_authenticated" ON wholesalers;
CREATE POLICY "wholesalers_all_authenticated" ON wholesalers FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "purchases_all_authenticated" ON purchases;
CREATE POLICY "purchases_all_authenticated" ON purchases FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "purchase_items_all_authenticated" ON purchase_items;
CREATE POLICY "purchase_items_all_authenticated" ON purchase_items FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "stock_movements_all_authenticated" ON stock_movements;
CREATE POLICY "stock_movements_all_authenticated" ON stock_movements FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "payments_all_authenticated" ON payments;
CREATE POLICY "payments_all_authenticated" ON payments FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "returns_all_authenticated" ON returns;
CREATE POLICY "returns_all_authenticated" ON returns FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "return_items_all_authenticated" ON return_items;
CREATE POLICY "return_items_all_authenticated" ON return_items FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "audit_logs_all_authenticated" ON audit_logs;
CREATE POLICY "audit_logs_all_authenticated" ON audit_logs FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- PART 2: SETTINGS TABLE
-- ============================================

-- Drop existing settings table if it exists
DROP TABLE IF EXISTS settings CASCADE;

-- Create settings table with all required columns
CREATE TABLE settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_name TEXT NOT NULL DEFAULT 'My Pharmacy',
  phone TEXT,
  address TEXT,
  email TEXT,
  website TEXT,
  gstin TEXT,
  drug_license_number TEXT,
  fssai_number TEXT,
  state TEXT,
  cgst_rate DECIMAL(5,2) DEFAULT 9.00,
  sgst_rate DECIMAL(5,2) DEFAULT 9.00,
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_footer TEXT DEFAULT 'Thank you for your business!',
  auto_print_invoice BOOLEAN DEFAULT true,
  logo_url TEXT,
  low_stock_threshold INTEGER DEFAULT 10,
  expiry_alert_days INTEGER DEFAULT 30,
  block_expired_sales BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (pharmacy_name, cgst_rate, sgst_rate, invoice_prefix, invoice_footer, auto_print_invoice, low_stock_threshold, expiry_alert_days, block_expired_sales)
VALUES ('My Pharmacy', 9.00, 9.00, 'INV', 'Thank you for your business!', true, 10, 30, true);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow authenticated users to read settings" ON settings;
CREATE POLICY "Allow authenticated users to read settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update settings" ON settings;
CREATE POLICY "Allow authenticated users to update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert settings" ON settings;
CREATE POLICY "Allow authenticated users to insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- PART 3: ADD BANK DETAILS TO SETTINGS
-- ============================================

ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_branch TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;

COMMENT ON COLUMN settings.bank_name IS 'Bank name for payment details';
COMMENT ON COLUMN settings.bank_branch IS 'Bank branch name';
COMMENT ON COLUMN settings.bank_account IS 'Bank account number';
COMMENT ON COLUMN settings.bank_ifsc IS 'Bank IFSC code';

-- ============================================
-- PART 4: ADD BUSINESS FIELDS TO CUSTOMERS
-- ============================================

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS gstin TEXT,
ADD COLUMN IF NOT EXISTS drug_license_number TEXT,
ADD COLUMN IF NOT EXISTS fssai_number TEXT,
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN customers.business_name IS 'Business name for retailer/wholesaler customers';
COMMENT ON COLUMN customers.gstin IS 'GST identification number for business customers';
COMMENT ON COLUMN customers.drug_license_number IS 'Drug license number for business customers';
COMMENT ON COLUMN customers.fssai_number IS 'Food Safety and Standards Authority of India license number';
COMMENT ON COLUMN customers.credit_limit IS 'Credit limit for business customers';
COMMENT ON COLUMN customers.opening_balance IS 'Opening balance amount for the customer account';
COMMENT ON COLUMN customers.current_balance IS 'Current outstanding balance for the customer';

-- Update trigger for customers
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- ============================================
-- PART 5: ADD FSSAI AND BALANCE FIELDS
-- ============================================

ALTER TABLE wholesalers 
ADD COLUMN IF NOT EXISTS fssai_number TEXT,
ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(12,2) DEFAULT 0;

ALTER TABLE retailers 
ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN wholesalers.fssai_number IS 'Food Safety and Standards Authority of India license number';
COMMENT ON COLUMN wholesalers.opening_balance IS 'Opening balance amount for the wholesaler account';
COMMENT ON COLUMN wholesalers.current_balance IS 'Current outstanding balance for the wholesaler';
COMMENT ON COLUMN retailers.opening_balance IS 'Opening balance amount for the retailer account';
COMMENT ON COLUMN retailers.current_balance IS 'Current outstanding balance for the retailer';

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_wholesalers_updated_at ON wholesalers;
CREATE TRIGGER update_wholesalers_updated_at
    BEFORE UPDATE ON wholesalers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_retailers_updated_at ON retailers;
CREATE TRIGGER update_retailers_updated_at
    BEFORE UPDATE ON retailers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 6: LEDGER AND COMPLIANCE FEATURES
-- ============================================

-- Add schedule and prescription fields to medicines table
ALTER TABLE medicines 
ADD COLUMN IF NOT EXISTS drug_schedule VARCHAR(10) DEFAULT 'GENERAL',
ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_narcotic BOOLEAN DEFAULT false;

ALTER TABLE medicines DROP CONSTRAINT IF EXISTS medicines_drug_schedule_check;
ALTER TABLE medicines ADD CONSTRAINT medicines_drug_schedule_check 
  CHECK (drug_schedule IN ('GENERAL', 'H', 'H1', 'X', 'NARCOTIC'));

COMMENT ON COLUMN medicines.drug_schedule IS 'Drug schedule classification: GENERAL, H, H1, X, NARCOTIC';
COMMENT ON COLUMN medicines.requires_prescription IS 'Whether this medicine requires prescription';
COMMENT ON COLUMN medicines.is_narcotic IS 'Whether this is a narcotic/controlled substance';

-- Create prescriptions table
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

-- Add prescription reference to sales
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS doctor_registration VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_sales_prescription ON sales(prescription_id);

-- Create narcotic_sales_log table
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

-- Create customer_ledger table
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

ALTER TABLE customer_ledger DROP CONSTRAINT IF EXISTS customer_ledger_transaction_type_check;
ALTER TABLE customer_ledger ADD CONSTRAINT customer_ledger_transaction_type_check 
  CHECK (transaction_type IN ('SALE', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'OPENING_BALANCE', 'ADJUSTMENT'));

COMMENT ON TABLE customer_ledger IS 'Customer account ledger for tracking payments and outstanding balances';

-- Note: opening_balance, current_balance, credit_limit already added to customers table in PART 4
-- Add credit_days if not exists
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS credit_days INTEGER DEFAULT 0;

COMMENT ON COLUMN customers.credit_days IS 'Credit period in days';

-- Function to update customer balance
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trigger_update_customer_balance ON customer_ledger;
CREATE TRIGGER trigger_update_customer_balance
  AFTER INSERT OR UPDATE ON customer_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_balance();

-- Function to log narcotic sales
CREATE OR REPLACE FUNCTION log_narcotic_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_medicine RECORD;
  v_customer RECORD;
  v_sale RECORD;
BEGIN
  SELECT * INTO v_medicine FROM medicines WHERE id = NEW.medicine_id;
  
  IF v_medicine.drug_schedule IN ('H', 'H1', 'X', 'NARCOTIC') OR v_medicine.is_narcotic THEN
    SELECT * INTO v_sale FROM sales WHERE id = NEW.sale_id;
    
    IF v_sale.customer_id IS NOT NULL THEN
      SELECT * INTO v_customer FROM customers WHERE id = v_sale.customer_id;
    END IF;
    
    INSERT INTO narcotic_sales_log (
      sale_id, medicine_id, batch_id, prescription_id, customer_id, quantity,
      drug_schedule, doctor_name, doctor_registration, customer_name,
      customer_phone, customer_address, sale_date, dispensed_by
    ) VALUES (
      NEW.sale_id, NEW.medicine_id, NEW.batch_id, v_sale.prescription_id,
      v_sale.customer_id, NEW.quantity, v_medicine.drug_schedule,
      v_sale.doctor_name, v_sale.doctor_registration, v_customer.name,
      v_customer.phone, v_customer.address, v_sale.created_at, v_sale.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_narcotic_sale ON sale_items;
CREATE TRIGGER trigger_log_narcotic_sale
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION log_narcotic_sale();

-- Function to create ledger entry on sale
CREATE OR REPLACE FUNCTION create_sale_ledger_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.due_amount > 0 THEN
    INSERT INTO customer_ledger (
      customer_id, transaction_date, transaction_type, reference_type,
      reference_id, debit_amount, credit_amount, balance, description, created_by
    ) VALUES (
      NEW.customer_id, NEW.created_at, 'SALE', 'SALE', NEW.id,
      NEW.total, NEW.paid_amount,
      (SELECT current_balance FROM customers WHERE id = NEW.customer_id) + NEW.due_amount,
      'Sale Invoice: ' || NEW.invoice_number, NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_sale_ledger ON sales;
CREATE TRIGGER trigger_create_sale_ledger
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION create_sale_ledger_entry();

-- Enable RLS on new tables
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE narcotic_sales_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies for new tables
DROP POLICY IF EXISTS "Allow authenticated users to read prescriptions" ON prescriptions;
CREATE POLICY "Allow authenticated users to read prescriptions"
  ON prescriptions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert prescriptions" ON prescriptions;
CREATE POLICY "Allow authenticated users to insert prescriptions"
  ON prescriptions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update prescriptions" ON prescriptions;
CREATE POLICY "Allow authenticated users to update prescriptions"
  ON prescriptions FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read narcotic log" ON narcotic_sales_log;
CREATE POLICY "Allow authenticated users to read narcotic log"
  ON narcotic_sales_log FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read ledger" ON customer_ledger;
CREATE POLICY "Allow authenticated users to read ledger"
  ON customer_ledger FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert ledger" ON customer_ledger;
CREATE POLICY "Allow authenticated users to insert ledger"
  ON customer_ledger FOR INSERT TO authenticated WITH CHECK (true);

-- Create views for reporting
CREATE OR REPLACE VIEW customer_outstanding_summary AS
SELECT 
  c.id, c.name, c.business_name, c.phone, c.customer_type,
  c.opening_balance, c.current_balance, c.credit_limit, c.credit_days,
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

CREATE OR REPLACE VIEW narcotic_sales_report AS
SELECT 
  nsl.id, nsl.sale_date, s.invoice_number, m.name as medicine_name,
  m.generic_name, nsl.drug_schedule, nsl.quantity, mb.batch_number,
  mb.expiry_date, nsl.customer_name, nsl.customer_phone, nsl.doctor_name,
  nsl.doctor_registration, p.prescription_number, p.prescription_date,
  u.email as dispensed_by_email
FROM narcotic_sales_log nsl
LEFT JOIN sales s ON nsl.sale_id = s.id
LEFT JOIN medicines m ON nsl.medicine_id = m.id
LEFT JOIN medicine_batches mb ON nsl.batch_id = mb.id
LEFT JOIN prescriptions p ON nsl.prescription_id = p.id
LEFT JOIN auth.users u ON nsl.dispensed_by = u.id
ORDER BY nsl.sale_date DESC;

COMMENT ON VIEW narcotic_sales_report IS 'Detailed report of all narcotic and scheduled drug sales';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BillSprout ERP Database Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Features installed:';
  RAISE NOTICE '✓ Base schema (all core tables)';
  RAISE NOTICE '✓ Settings management';
  RAISE NOTICE '✓ Bank details integration';
  RAISE NOTICE '✓ Customer business fields';
  RAISE NOTICE '✓ FSSAI and balance tracking';
  RAISE NOTICE '✓ Drug scheduling (H/H1/Narcotic)';
  RAISE NOTICE '✓ Prescription management';
  RAISE NOTICE '✓ Narcotic sales logging';
  RAISE NOTICE '✓ Customer ledger & payments';
  RAISE NOTICE '✓ Outstanding balance management';
  RAISE NOTICE '✓ Credit limit monitoring';
  RAISE NOTICE '========================================';
END $$;
