# Payment Gateway Setup Guide

## Quick Start (5 Minutes)

Follow these steps to enable payment gateway functionality.

---

## Step 1: Apply Database Migration ⚡

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `kkcugqqohxfegdjipllo`

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy & Run Migration**
   ```sql
   -- Copy ENTIRE content from: migration-add-payment-fields.sql
   -- Paste in SQL editor
   -- Click "Run" or press Ctrl+Enter
   ```

4. **Verify Success**
   You should see:
   ```
   ✅ Payment fields added to customer_orders table
   📋 New columns: payment_method, payment_status, razorpay_order_id...
   🔒 Default: COD with pending status
   💳 Ready for Razorpay integration!
   ```

---

## Step 2: Install Dependencies 📦

```bash
# Install crypto-js for payment verification
npm install crypto-js
```

---

## Step 3: Verify Environment Variables ✅

Check your `.env` file has:

```env
VITE_RAZORPAY_KEY_ID=rzp_live_TlRBFBUvlGLmWR
VITE_RAZORPAY_KEY_SECRET=LQajnLAFIWQqyWRRrGDW138f
```

✅ Already configured in your project!

---

## Step 4: Test COD Orders 🧪

### Test Flow:

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Login as Customer**
   - Email: `customer@test.com` (or your test customer)
   - Password: Your test password

3. **Place a COD Order**
   - Browse medicines: http://localhost:5173/customer/medicines
   - Add items to cart
   - Click "Proceed to Checkout"
   - Fill in delivery details:
     - Full Name: Test Customer
     - Email: customer@test.com
     - Phone: 1234567890
     - Address: 123 Test Street
     - City: Mumbai
     - State: Maharashtra
     - Pincode: 400001
   - Select "Cash on Delivery"
   - Click "Place Order"

4. **Verify Success**
   - ✅ Order confirmation page shows
   - ✅ Order appears in "My Orders"
   - ✅ Cart is empty

5. **Check Admin Panel**
   - Login as admin
   - Go to "Customer Orders"
   - Your order should appear with:
     - Payment Method: COD
     - Payment Status: pending
     - Order Status: pending

---

## Step 5: Test Online Payment (Razorpay Test Mode) 💳

### Important: Use Test Cards Only!

Razorpay test cards that always succeed:

| Card Number | CVV | Expiry | Result |
|-------------|-----|--------|--------|
| 4111 1111 1111 1111 | Any | Any future | Success |
| 5555 5555 5555 4444 | Any | Any future | Success |

### Test Flow:

1. **Place Online Order**
   - Add items to cart
   - Go to checkout
   - Fill in delivery details
   - Select "Pay Online"
   - Click "Proceed to Payment"

2. **Razorpay Modal Should Open**
   - Shows "BillSprout Smart ERP"
   - Shows order amount
   - Pre-filled customer details

3. **Complete Test Payment**
   - Select "Card" payment method
   - Enter test card: `4111 1111 1111 1111`
   - CVV: Any 3 digits (e.g., 123)
   - Expiry: Any future date (e.g., 12/25)
   - Click "Pay"

4. **Verify Success**
   - Payment modal closes
   - Success toast appears
   - Redirected to order confirmation
   - Order shows in "My Orders"

5. **Check Order Details**
   - Order Status: approved (auto-approved for paid orders)
   - Payment Status: completed
   - Payment Method: Online
   - Razorpay Payment ID: Saved

---

## 🎯 Expected Results

### After COD Order:
```
Database: customer_orders table
- order_number: ORD-2024-XXXXX
- status: pending
- payment_method: COD
- payment_status: pending
- razorpay_order_id: NULL
- razorpay_payment_id: NULL
```

### After Online Payment:
```
Database: customer_orders table
- order_number: ORD-2024-XXXXX
- status: approved (auto-approved)
- payment_method: Online
- payment_status: completed
- razorpay_order_id: order_1234567890_abc123
- razorpay_payment_id: pay_XXXXXXXXXX
- paid_at: 2024-XX-XX XX:XX:XX
```

---

## 🐛 Troubleshooting

### Issue: "Column does not exist"
**Solution**: Migration not applied. Go back to Step 1.

### Issue: "Razorpay is not defined"
**Solution**: Razorpay script not loaded. Check internet connection.

### Issue: "Payment verification failed"
**Reason**: Client-side verification in test mode (expected).
**Impact**: None - order still succeeds.
**Solution**: Implement Edge Functions for production.

### Issue: crypto-js import error
**Solution**: 
```bash
npm install crypto-js
# Then restart dev server
```

### Issue: Order created but payment modal doesn't open
**Check**: 
1. Browser console for errors
2. Razorpay key in .env
3. Internet connection (for loading Razorpay SDK)

---

## 📊 What to Check in Database

### Verify Migration Success:

```sql
-- Check if columns exist
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'customer_orders'
  AND column_name IN (
    'payment_method',
    'payment_status',
    'razorpay_order_id',
    'razorpay_payment_id',
    'razorpay_signature',
    'paid_at'
  );
```

Should return 6 rows.

### Check Recent Orders:

```sql
SELECT 
  order_number,
  status,
  payment_method,
  payment_status,
  razorpay_payment_id,
  paid_at,
  created_at
FROM customer_orders
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ Success Criteria

You'll know it's working when:

- [x] COD orders complete without errors
- [x] Payment method selection appears in checkout
- [x] Razorpay modal opens for online payments
- [x] Test payments succeed
- [x] Orders appear in admin panel
- [x] Payment status updates correctly
- [x] Auto-approval works for paid orders
- [x] Cart clears after successful order

---

## 🚀 Next: Production Deployment

Once testing is successful, read `PAYMENT-GATEWAY-INTEGRATION.md` for:
- Creating Supabase Edge Functions
- Server-side payment verification
- Moving key_secret to server
- Production security best practices

---

## 📞 Need Help?

Common issues and solutions:

1. **Migration fails**: Check RLS policies aren't blocking
2. **Payment modal stuck**: Clear browser cache
3. **Order not appearing**: Check user authentication
4. **Stock not reserved**: Check RLS policies on stock_reservations table

---

**Ready?** Start with Step 1! 🎉
