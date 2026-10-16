-- ============================================
-- FIX PAYMENT COLUMNS - RUN THIS NOW
-- ============================================
-- This removes any partial migration and reapplies it correctly

-- First, drop columns if they exist (will fail silently if they don't)
ALTER TABLE customer_orders DROP COLUMN IF EXISTS payment_method CASCADE;
ALTER TABLE customer_orders DROP COLUMN IF EXISTS payment_status CASCADE;
ALTER TABLE customer_orders DROP COLUMN IF EXISTS razorpay_order_id CASCADE;
ALTER TABLE customer_orders DROP COLUMN IF EXISTS razorpay_payment_id CASCADE;
ALTER TABLE customer_orders DROP COLUMN IF EXISTS razorpay_signature CASCADE;
ALTER TABLE customer_orders DROP COLUMN IF EXISTS paid_at CASCADE;
ALTER TABLE customer_orders DROP COLUMN IF EXISTS payment_reference CASCADE;

-- Now add them properly
ALTER TABLE customer_orders
ADD COLUMN payment_method TEXT DEFAULT 'COD' 
  CHECK (payment_method IN ('COD', 'Online', 'UPI', 'Card', 'Wallet'));

ALTER TABLE customer_orders
ADD COLUMN payment_status TEXT DEFAULT 'pending' 
  CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded'));

ALTER TABLE customer_orders
ADD COLUMN razorpay_order_id TEXT;

ALTER TABLE customer_orders
ADD COLUMN razorpay_payment_id TEXT;

ALTER TABLE customer_orders
ADD COLUMN razorpay_signature TEXT;

ALTER TABLE customer_orders
ADD COLUMN paid_at TIMESTAMPTZ;

ALTER TABLE customer_orders
ADD COLUMN payment_reference TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_customer_orders_payment_status 
  ON customer_orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_customer_orders_razorpay_order_id 
  ON customer_orders(razorpay_order_id);

-- Update existing orders
UPDATE customer_orders 
SET payment_method = 'COD', 
    payment_status = 'pending'
WHERE payment_method IS NULL;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Payment columns fixed and ready!';
  RAISE NOTICE '💳 COD and Online payment both enabled!';
END $$;
