-- ============================================
-- CUSTOMER ORDERING SYSTEM - DATABASE MIGRATION
-- ============================================
-- This migration adds complete customer ordering functionality
-- to the BillSprout Smart ERP system
-- ============================================

-- ============================================
-- PART 1: MODIFY EXISTING CUSTOMERS TABLE
-- ============================================

-- Add fields to link customers to auth users and store delivery info
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) UNIQUE,
ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT,
ADD COLUMN IF NOT EXISTS landmark TEXT,
ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

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
-- PART 2: CREATE CUSTOMER ORDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS customer_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Order Financial Details
  subtotal DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  gst_amount DECIMAL(12,2) DEFAULT 0,
  delivery_charge DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  
  -- Delivery Information
  delivery_name TEXT NOT NULL,
  delivery_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_landmark TEXT,
  delivery_city TEXT,
  delivery_state TEXT,
  delivery_pincode TEXT,
  
  -- Prescription Management
  requires_prescription BOOLEAN DEFAULT false,
  prescription_uploaded BOOLEAN DEFAULT false,
  prescription_url TEXT,
  prescription_verified BOOLEAN DEFAULT false,
  
  -- Order Status Management
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'processing', 'dispatched', 'delivered', 'rejected', 'cancelled')),
  rejection_reason TEXT,
  cancellation_reason TEXT,
  admin_notes TEXT,
  
  -- Timestamps for Status Tracking
  approved_at TIMESTAMPTZ,
  processing_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Admin Management
  approved_by UUID REFERENCES profiles(id),
  processed_by UUID REFERENCES profiles(id),
  dispatched_by UUID REFERENCES profiles(id),
  
  -- Linked Sale (when order is fulfilled and invoiced)
  sale_id UUID REFERENCES sales(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer ON customer_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON customer_orders(status);
CREATE INDEX IF NOT EXISTS idx_customer_orders_created ON customer_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_orders_number ON customer_orders(order_number);

-- Update trigger
CREATE OR REPLACE FUNCTION update_customer_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_orders_updated_at ON customer_orders;
CREATE TRIGGER update_customer_orders_updated_at
    BEFORE UPDATE ON customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_orders_updated_at();

-- ============================================
-- PART 3: CREATE CUSTOMER ORDER ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS customer_order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id),
  batch_id UUID REFERENCES medicine_batches(id),
  
  -- Item Details
  medicine_name TEXT NOT NULL,
  batch_number TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  
  -- Pricing
  unit_price DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Tax
  gst_percentage DECIMAL(5,2) DEFAULT 0,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Calculated Total
  item_total DECIMAL(10,2) NOT NULL,
  
  -- Prescription Requirement
  requires_prescription BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order ON customer_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_medicine ON customer_order_items(medicine_id);
CREATE INDEX IF NOT EXISTS idx_order_items_batch ON customer_order_items(batch_id);

-- ============================================
-- PART 4: CREATE ORDER STATUS HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  
  old_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  
  changed_by UUID REFERENCES profiles(id),
  changed_by_name TEXT,
  changed_by_role TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_status_history_order ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created ON order_status_history(created_at DESC);

-- ============================================
-- PART 5: CREATE STOCK RESERVATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES medicine_batches(id),
  medicine_id UUID NOT NULL REFERENCES medicines(id),
  
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  
  status TEXT DEFAULT 'reserved' 
    CHECK (status IN ('reserved', 'released', 'fulfilled', 'expired')),
  
  -- Reservations expire after 48 hours by default
  expires_at TIMESTAMPTZ NOT NULL,
  
  released_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reservations_order ON stock_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_reservations_batch ON stock_reservations(batch_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires ON stock_reservations(expires_at);

-- Update trigger
CREATE OR REPLACE FUNCTION update_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reservations_updated_at ON stock_reservations;
CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON stock_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_reservations_updated_at();

-- ============================================
-- PART 6: DATABASE FUNCTIONS
-- ============================================

-- Function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the highest order number and increment
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) + 1
  INTO counter
  FROM customer_orders
  WHERE order_number LIKE 'ORD%';
  
  -- Format as ORD000001, ORD000002, etc.
  new_number := 'ORD' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to check available stock (excluding reservations)
CREATE OR REPLACE FUNCTION get_available_stock(p_batch_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_stock INTEGER;
  reserved_stock INTEGER;
  available_stock INTEGER;
BEGIN
  -- Get current stock from batch
  SELECT current_quantity INTO current_stock
  FROM medicine_batches
  WHERE id = p_batch_id;
  
  -- Get active reservations for this batch
  SELECT COALESCE(SUM(quantity), 0) INTO reserved_stock
  FROM stock_reservations
  WHERE batch_id = p_batch_id
    AND status = 'reserved'
    AND expires_at > NOW();
  
  -- Calculate available stock
  available_stock := COALESCE(current_stock, 0) - COALESCE(reserved_stock, 0);
  
  RETURN GREATEST(available_stock, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to create stock reservation
CREATE OR REPLACE FUNCTION create_stock_reservation(
  p_order_id UUID,
  p_batch_id UUID,
  p_medicine_id UUID,
  p_quantity INTEGER
)
RETURNS UUID AS $$
DECLARE
  reservation_id UUID;
  available INTEGER;
BEGIN
  -- Check available stock
  available := get_available_stock(p_batch_id);
  
  IF available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', available, p_quantity;
  END IF;
  
  -- Create reservation (expires in 48 hours)
  INSERT INTO stock_reservations (
    order_id, 
    batch_id, 
    medicine_id, 
    quantity, 
    status,
    expires_at
  )
  VALUES (
    p_order_id,
    p_batch_id,
    p_medicine_id,
    p_quantity,
    'reserved',
    NOW() + INTERVAL '48 hours'
  )
  RETURNING id INTO reservation_id;
  
  RETURN reservation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to release stock reservations
CREATE OR REPLACE FUNCTION release_stock_reservation(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE stock_reservations
  SET status = 'released',
      released_at = NOW()
  WHERE order_id = p_order_id
    AND status = 'reserved';
END;
$$ LANGUAGE plpgsql;

-- Function to fulfill stock reservations (deduct actual stock)
CREATE OR REPLACE FUNCTION fulfill_stock_reservation(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  reservation RECORD;
BEGIN
  FOR reservation IN 
    SELECT * FROM stock_reservations 
    WHERE order_id = p_order_id AND status = 'reserved'
  LOOP
    -- Deduct from batch
    UPDATE medicine_batches
    SET current_quantity = current_quantity - reservation.quantity
    WHERE id = reservation.batch_id;
    
    -- Mark reservation as fulfilled
    UPDATE stock_reservations
    SET status = 'fulfilled',
        fulfilled_at = NOW()
    WHERE id = reservation.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire old reservations (run via cron or manually)
CREATE OR REPLACE FUNCTION expire_old_reservations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE stock_reservations
  SET status = 'expired'
  WHERE status = 'reserved'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 7: ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CUSTOMER_ORDERS POLICIES
-- ============================================

-- Customers can view their own orders
DROP POLICY IF EXISTS "customer_orders_own_select" ON customer_orders;
CREATE POLICY "customer_orders_own_select" ON customer_orders
  FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can insert their own orders
DROP POLICY IF EXISTS "customer_orders_insert" ON customer_orders;
CREATE POLICY "customer_orders_insert" ON customer_orders
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers can cancel their own pending orders
DROP POLICY IF EXISTS "customer_orders_cancel" ON customer_orders;
CREATE POLICY "customer_orders_cancel" ON customer_orders
  FOR UPDATE
  USING (
    customer_id = auth.uid() 
    AND status = 'pending'
  )
  WITH CHECK (
    customer_id = auth.uid()
    AND status IN ('pending', 'cancelled')
  );

-- Admin/staff can view and manage all orders
DROP POLICY IF EXISTS "customer_orders_admin_all" ON customer_orders;
CREATE POLICY "customer_orders_admin_all" ON customer_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist', 'staff')
    )
  );

-- ============================================
-- CUSTOMER_ORDER_ITEMS POLICIES
-- ============================================

-- Customers can view items in their own orders
DROP POLICY IF EXISTS "order_items_own_select" ON customer_order_items;
CREATE POLICY "order_items_own_select" ON customer_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_orders 
      WHERE id = customer_order_items.order_id 
      AND customer_id = auth.uid()
    )
  );

-- Customers can insert items when creating orders
DROP POLICY IF EXISTS "order_items_insert" ON customer_order_items;
CREATE POLICY "order_items_insert" ON customer_order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_orders 
      WHERE id = customer_order_items.order_id 
      AND customer_id = auth.uid()
    )
  );

-- Admin/staff can manage all order items
DROP POLICY IF EXISTS "order_items_admin_all" ON customer_order_items;
CREATE POLICY "order_items_admin_all" ON customer_order_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist', 'staff')
    )
  );

-- ============================================
-- ORDER_STATUS_HISTORY POLICIES
-- ============================================

-- Customers can view history of their own orders
DROP POLICY IF EXISTS "status_history_own_select" ON order_status_history;
CREATE POLICY "status_history_own_select" ON order_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_orders 
      WHERE id = order_status_history.order_id 
      AND customer_id = auth.uid()
    )
  );

-- Admin/staff can view and create all history records
DROP POLICY IF EXISTS "status_history_admin_all" ON order_status_history;
CREATE POLICY "status_history_admin_all" ON order_status_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist', 'staff')
    )
  );

-- ============================================
-- STOCK_RESERVATIONS POLICIES
-- ============================================

-- Admin/staff only can view reservations
DROP POLICY IF EXISTS "reservations_admin_all" ON stock_reservations;
CREATE POLICY "reservations_admin_all" ON stock_reservations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'pharmacist', 'staff')
    )
  );

-- ============================================
-- PART 8: TRIGGERS FOR STATUS HISTORY
-- ============================================

-- Automatically log status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  changer_name TEXT;
  changer_role TEXT;
BEGIN
  -- Get the name and role of the person making the change
  SELECT full_name, role INTO changer_name, changer_role
  FROM profiles
  WHERE id = auth.uid();
  
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
    INSERT INTO order_status_history (
      order_id,
      old_status,
      new_status,
      notes,
      changed_by,
      changed_by_name,
      changed_by_role
    )
    VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      NEW.status,
      CASE 
        WHEN NEW.status = 'rejected' THEN NEW.rejection_reason
        WHEN NEW.status = 'cancelled' THEN NEW.cancellation_reason
        ELSE NEW.admin_notes
      END,
      auth.uid(),
      changer_name,
      changer_role
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_order_status_change ON customer_orders;
CREATE TRIGGER log_order_status_change
  AFTER INSERT OR UPDATE ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

-- ============================================
-- PART 9: VIEWS FOR REPORTING
-- ============================================

-- View for available medicines (for customer catalog)
CREATE OR REPLACE VIEW available_medicines_catalog AS
SELECT 
  m.id,
  m.name,
  m.generic_name,
  m.brand,
  m.manufacturer,
  m.category,
  m.composition,
  m.dosage_form,
  m.strength,
  m.hsn_code,
  m.gst_percentage,
  m.prescription_required,
  m.description,
  MIN(mb.selling_price) as min_price,
  MAX(mb.selling_price) as max_price,
  SUM(mb.current_quantity) as total_stock,
  COUNT(mb.id) as batch_count,
  CASE 
    WHEN SUM(mb.current_quantity) > 0 THEN true 
    ELSE false 
  END as in_stock,
  m.created_at,
  m.updated_at
FROM medicines m
LEFT JOIN medicine_batches mb ON m.id = mb.medicine_id
  AND mb.current_quantity > 0
  AND mb.expiry_date > CURRENT_DATE
WHERE m.status = 'active'
GROUP BY m.id;

-- View for order summary (for admin dashboard)
CREATE OR REPLACE VIEW order_summary_view AS
SELECT 
  co.id,
  co.order_number,
  co.status,
  co.total,
  co.created_at,
  co.customer_id,
  p.full_name as customer_name,
  p.email as customer_email,
  COUNT(coi.id) as item_count,
  co.requires_prescription,
  co.prescription_uploaded,
  co.delivery_city,
  co.delivery_state
FROM customer_orders co
JOIN profiles p ON co.customer_id = p.id
LEFT JOIN customer_order_items coi ON co.id = coi.order_id
GROUP BY co.id, p.full_name, p.email;

-- ============================================
-- PART 10: GRANT PERMISSIONS
-- ============================================

-- Grant access to authenticated users
GRANT ALL ON customer_orders TO authenticated;
GRANT ALL ON customer_order_items TO authenticated;
GRANT ALL ON order_status_history TO authenticated;
GRANT ALL ON stock_reservations TO authenticated;

-- Grant usage on functions
GRANT EXECUTE ON FUNCTION generate_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_stock_reservation(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION release_stock_reservation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fulfill_stock_reservation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_reservations() TO authenticated;

-- Grant access to views
GRANT SELECT ON available_medicines_catalog TO authenticated;
GRANT SELECT ON order_summary_view TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Customer Ordering System database migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables Created:';
  RAISE NOTICE '  - customer_orders';
  RAISE NOTICE '  - customer_order_items';
  RAISE NOTICE '  - order_status_history';
  RAISE NOTICE '  - stock_reservations';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Functions Created:';
  RAISE NOTICE '  - generate_order_number()';
  RAISE NOTICE '  - get_available_stock()';
  RAISE NOTICE '  - create_stock_reservation()';
  RAISE NOTICE '  - release_stock_reservation()';
  RAISE NOTICE '  - fulfill_stock_reservation()';
  RAISE NOTICE '  - expire_old_reservations()';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 RLS Policies: Enabled with customer/admin separation';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Views Created:';
  RAISE NOTICE '  - available_medicines_catalog';
  RAISE NOTICE '  - order_summary_view';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready to implement customer ordering features!';
END $$;
