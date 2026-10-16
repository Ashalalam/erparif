-- ============================================
-- ADD PAYMENT FIELDS TO CUSTOMER ORDERS
-- ============================================
-- Purpose: Enable payment method selection and online payment tracking

-- Add payment-related columns to customer_orders table
ALTER TABLE customer_orders
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'COD' 
  CHECK (payment_method IN ('COD', 'Online', 'UPI', 'Card', 'Wallet')),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' 
  CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Add index for payment tracking
CREATE INDEX IF NOT EXISTS idx_customer_orders_payment_status 
  ON customer_orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_customer_orders_razorpay_order_id 
  ON customer_orders(razorpay_order_id);

-- Add comment for documentation
COMMENT ON COLUMN customer_orders.payment_method IS 'Payment method chosen by customer';
COMMENT ON COLUMN customer_orders.payment_status IS 'Current status of payment';
COMMENT ON COLUMN customer_orders.razorpay_order_id IS 'Razorpay order ID for tracking';
COMMENT ON COLUMN customer_orders.razorpay_payment_id IS 'Razorpay payment ID after successful payment';
COMMENT ON COLUMN customer_orders.razorpay_signature IS 'Razorpay signature for verification';

-- Update existing orders to have payment_method = 'COD' and payment_status = 'pending'
UPDATE customer_orders 
SET payment_method = 'COD', 
    payment_status = 'pending'
WHERE payment_method IS NULL;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Payment fields added to customer_orders table';
  RAISE NOTICE '📋 New columns:';
  RAISE NOTICE '  - payment_method (COD, Online, UPI, Card, Wallet)';
  RAISE NOTICE '  - payment_status (pending, processing, completed, failed, refunded)';
  RAISE NOTICE '  - razorpay_order_id';
  RAISE NOTICE '  - razorpay_payment_id';
  RAISE NOTICE '  - razorpay_signature';
  RAISE NOTICE '  - paid_at';
  RAISE NOTICE '  - payment_reference';
  RAISE NOTICE '  - customer_notes';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Default: COD with pending status';
  RAISE NOTICE '💳 Ready for Razorpay integration!';
END $$;
