# 🚨 Fixing the 500 Error

## What's Happening

The app is showing a **500 Internal Server Error** because:

1. ❌ Database migration **NOT applied yet**
2. ❌ Code tries to use `payment_method` column that doesn't exist
3. ❌ Supabase returns error when inserting order

## ✅ Quick Fix (3 Steps)

### Step 1: Apply the Migration FIRST

**CRITICAL:** You must apply the migration BEFORE testing the app!

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Click your project: `kkcugqqohxfegdjipllo`
3. Click **SQL Editor** (in left sidebar)
4. Click **New Query**
5. Open file: `migration-add-payment-fields.sql`
6. Copy ALL content
7. Paste in SQL editor
8. Click **RUN** (or Ctrl+Enter)

**Wait for success message:**
```
✅ Payment fields added to customer_orders table
📋 New columns: payment_method, payment_status...
💳 Ready for Razorpay integration!
```

### Step 2: Verify Migration Worked

Run this query in Supabase SQL Editor:

```sql
-- Check if columns exist
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'customer_orders'
  AND column_name IN ('payment_method', 'payment_status');
```

Should return 2 rows:
- payment_method
- payment_status

### Step 3: Refresh Your App

1. Refresh browser (F5 or Ctrl+R)
2. 500 error should be gone
3. App should load normally

---

## 🧪 After Migration: Test COD

Once migration is applied:

1. Login as customer
2. Add items to cart
3. Go to checkout
4. Fill in details
5. Select **"Cash on Delivery"**
6. Place order

**Should work immediately!** ✅

---

## 📦 To Enable Online Payment Later

Once COD works:

```bash
# Install crypto-js
npm install crypto-js

# Then edit CheckoutPage.jsx:
# 1. Uncomment the razorpayService import (line 13)
# 2. Comment out the "temporarily disabled" section
# 3. Uncomment the Razorpay code block
```

I've temporarily disabled online payment to prevent errors. COD will work once migration is applied.

---

## 🔍 How to Check What's Wrong

### Check Browser Console (F12)

Look for errors like:
- `column "payment_method" does not exist`
- `relation "customer_orders" does not have column`

**These mean:** Migration not applied yet!

### Check Network Tab (F12 → Network)

1. Try to place order
2. Look for failed request (red text)
3. Click on it
4. Look at "Response" tab
5. Error message tells you what's missing

---

## ⚠️ Common Mistakes

### Mistake 1: Testing Before Migration
❌ Don't test the app before applying migration  
✅ Apply migration FIRST, then test

### Mistake 2: Partial Migration
❌ Don't copy part of the SQL file  
✅ Copy the ENTIRE file content

### Mistake 3: Wrong Database
❌ Don't apply to wrong project  
✅ Verify project name in Supabase dashboard

---

## 📊 What the Migration Does

Adds these columns to `customer_orders`:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| payment_method | TEXT | 'COD' | COD/Online/UPI/Card |
| payment_status | TEXT | 'pending' | Payment tracking |
| razorpay_order_id | TEXT | NULL | Razorpay reference |
| razorpay_payment_id | TEXT | NULL | Payment ID |
| razorpay_signature | TEXT | NULL | Verification |
| paid_at | TIMESTAMPTZ | NULL | Payment time |
| payment_reference | TEXT | NULL | Extra reference |
| customer_notes | TEXT | NULL | Customer notes |

---

## ✅ Success Checklist

- [ ] Migration file open in Supabase SQL Editor
- [ ] Entire file copied and pasted
- [ ] Clicked "Run" button
- [ ] Success message appeared
- [ ] Verification query shows 2 columns
- [ ] Browser refreshed
- [ ] 500 error gone
- [ ] App loads normally
- [ ] Checkout page shows payment options

---

## 🆘 Still Getting 500 Error?

### After applying migration:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+Shift+R)
3. **Restart dev server**:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

4. **Check database user permissions**:
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM customer_orders LIMIT 1;
   ```
   If this works, permissions are fine.

5. **Check RLS policies**:
   ```sql
   -- Verify policy allows INSERT
   SELECT * FROM pg_policies 
   WHERE tablename = 'customer_orders';
   ```

---

## 🎯 Expected Behavior

### Before Migration:
- ❌ 500 error on checkout
- ❌ "Column not found" errors
- ❌ Orders fail to create

### After Migration:
- ✅ Checkout page loads
- ✅ Payment options visible
- ✅ COD orders work
- ✅ Orders appear in admin panel

---

## 📞 Quick Debug Commands

### Check if migration applied:
```sql
SELECT COUNT(*) FROM information_schema.columns
WHERE table_name = 'customer_orders'
  AND column_name = 'payment_method';
```
Should return: `1`

### Check existing orders:
```sql
SELECT order_number, payment_method, payment_status
FROM customer_orders
ORDER BY created_at DESC
LIMIT 5;
```

### Test insert (will fail if migration not applied):
```sql
INSERT INTO customer_orders (
  order_number, customer_id, payment_method, payment_status
) VALUES (
  'TEST-001', 
  (SELECT id FROM auth.users LIMIT 1),
  'COD',
  'pending'
);
-- Then delete: DELETE FROM customer_orders WHERE order_number = 'TEST-001';
```

---

## 🎉 Next Steps After Fix

Once the 500 error is fixed:

1. ✅ Test COD orders
2. ✅ Verify in admin panel
3. ✅ Check payment fields are saved
4. 📦 Install crypto-js for Razorpay
5. 💳 Enable online payment
6. 🧪 Test with test cards

---

**Bottom line:** Apply the migration first, everything else will work! 🚀
