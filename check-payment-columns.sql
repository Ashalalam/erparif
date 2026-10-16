-- Check if payment columns exist in customer_orders table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customer_orders'
  AND column_name IN (
    'payment_method',
    'payment_status',
    'razorpay_order_id',
    'razorpay_payment_id',
    'razorpay_signature',
    'paid_at',
    'payment_reference',
    'customer_notes'
  )
ORDER BY column_name;

-- This should return 8 rows if migration was applied
-- If it returns 0 rows, migration needs to be applied
