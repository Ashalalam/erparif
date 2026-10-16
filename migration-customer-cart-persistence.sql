-- ============================================
-- CUSTOMER CART PERSISTENCE
-- ============================================
-- Purpose: Enable persistent cart storage per customer

-- Create customer_cart_items table
CREATE TABLE IF NOT EXISTS customer_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES medicine_batches(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  free_quantity INTEGER DEFAULT 0 CHECK (free_quantity >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, medicine_id, batch_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_cart_items_customer_id 
  ON customer_cart_items(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_cart_items_medicine_id 
  ON customer_cart_items(medicine_id);

-- Enable RLS
ALTER TABLE customer_cart_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Customers can only see/modify their own cart
CREATE POLICY "Users can view their own cart items"
  ON customer_cart_items FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Users can insert their own cart items"
  ON customer_cart_items FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their own cart items"
  ON customer_cart_items FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can delete their own cart items"
  ON customer_cart_items FOR DELETE
  USING (auth.uid() = customer_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_cart_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_customer_cart_items_timestamp_trigger ON customer_cart_items;
CREATE TRIGGER update_customer_cart_items_timestamp_trigger
  BEFORE UPDATE ON customer_cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_cart_items_timestamp();

-- Function to clean up expired cart items (optional, run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_cart_items(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM customer_cart_items
  WHERE updated_at < NOW() - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE customer_cart_items IS 'Persistent cart storage for customers';
COMMENT ON COLUMN customer_cart_items.customer_id IS 'Customer who owns this cart item';
COMMENT ON COLUMN customer_cart_items.medicine_id IS 'Medicine in cart';
COMMENT ON COLUMN customer_cart_items.batch_id IS 'Specific batch selected';
COMMENT ON COLUMN customer_cart_items.quantity IS 'Quantity to purchase';
COMMENT ON COLUMN customer_cart_items.free_quantity IS 'Free quantity (promotional)';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Customer cart persistence table created';
  RAISE NOTICE '📋 Table: customer_cart_items';
  RAISE NOTICE '🔒 RLS policies enabled (customer-specific access)';
  RAISE NOTICE '⚡ Indexes created for performance';
  RAISE NOTICE '🔄 Auto-timestamp update trigger enabled';
  RAISE NOTICE '';
  RAISE NOTICE '💾 Cart items now persist across sessions!';
END $$;
