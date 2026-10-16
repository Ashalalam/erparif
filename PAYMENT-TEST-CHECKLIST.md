# Payment Gateway Testing Checklist

Use this checklist to verify your payment integration is working correctly.

---

## 🔧 Pre-Testing Setup

### [ ] Step 1: Apply Database Migration
- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Copy content from `migration-add-payment-fields.sql`
- [ ] Run the migration
- [ ] Verify success message appears

### [ ] Step 2: Install Dependencies
```bash
npm install crypto-js
```

### [ ] Step 3: Verify Environment
- [ ] `.env` file exists
- [ ] `VITE_RAZORPAY_KEY_ID` is set
- [ ] `VITE_RAZORPAY_KEY_SECRET` is set

### [ ] Step 4: Start Development Server
```bash
npm run dev
```

---

## 🧪 COD Payment Testing

### Test Case 1: Simple COD Order

**Steps:**
1. [ ] Login as customer
2. [ ] Browse to medicines catalog
3. [ ] Add 2-3 items to cart
4. [ ] Click "Proceed to Checkout"
5. [ ] Fill in delivery details:
   - Full Name: Test User
   - Email: test@example.com
   - Phone: 9876543210
   - Address: 123 Test Street
   - City: Mumbai
   - State: Maharashtra
   - Pincode: 400001
6. [ ] Select "Cash on Delivery"
7. [ ] Click "Place Order"

**Expected Results:**
- [ ] Success toast appears
- [ ] Redirected to order confirmation page
- [ ] Order details shown correctly
- [ ] Cart is empty
- [ ] Payment method shows "COD"

**Database Verification:**
- [ ] Order exists in `customer_orders` table
- [ ] `payment_method` = 'COD'
- [ ] `payment_status` = 'pending'
- [ ] `status` = 'pending'
- [ ] `razorpay_order_id` is NULL
- [ ] `razorpay_payment_id` is NULL

### Test Case 2: COD with Prescription

**Steps:**
1. [ ] Add prescription-required medicine to cart
2. [ ] Go to checkout
3. [ ] Upload prescription file
4. [ ] Select "Cash on Delivery"
5. [ ] Place order

**Expected Results:**
- [ ] Prescription upload successful
- [ ] Order placed with prescription URL
- [ ] Prescription visible in order details

---

## 💳 Online Payment Testing

### Test Case 3: Successful Online Payment

**Steps:**
1. [ ] Login as customer
2. [ ] Add items to cart (₹500+ recommended)
3. [ ] Go to checkout
4. [ ] Fill in delivery details
5. [ ] Select "Pay Online"
6. [ ] Click "Proceed to Payment"

**Razorpay Modal:**
7. [ ] Modal opens with correct details:
   - [ ] Company name: "BillSprout Smart ERP"
   - [ ] Correct order amount
   - [ ] Pre-filled customer details
8. [ ] Select "Card" payment method
9. [ ] Enter test card details:
   - Card: 4111 1111 1111 1111
   - CVV: 123
   - Expiry: 12/25
10. [ ] Click "Pay"

**Expected Results:**
- [ ] Payment processes successfully
- [ ] Modal closes automatically
- [ ] Success toast appears
- [ ] Redirected to order confirmation
- [ ] Order status: "approved" (auto-approved)
- [ ] Payment status: "completed"
- [ ] Cart is empty

**Database Verification:**
- [ ] Order exists in `customer_orders` table
- [ ] `payment_method` = 'Online'
- [ ] `payment_status` = 'completed'
- [ ] `status` = 'approved'
- [ ] `razorpay_order_id` is populated
- [ ] `razorpay_payment_id` is populated
- [ ] `razorpay_signature` is populated
- [ ] `paid_at` timestamp is set

### Test Case 4: Payment Cancellation

**Steps:**
1. [ ] Add items to cart
2. [ ] Go to checkout
3. [ ] Select "Pay Online"
4. [ ] Click "Proceed to Payment"
5. [ ] When Razorpay modal opens, click "X" (close)

**Expected Results:**
- [ ] Modal closes
- [ ] Error toast: "Payment cancelled by user"
- [ ] Order status: 'cancelled'
- [ ] Payment status: 'failed'
- [ ] User can place order again

### Test Case 5: Online Payment with Prescription

**Steps:**
1. [ ] Add Rx medicine to cart
2. [ ] Upload prescription
3. [ ] Select "Pay Online"
4. [ ] Complete payment

**Expected Results:**
- [ ] Payment succeeds
- [ ] Order auto-approved
- [ ] Prescription attached

---

## 🏢 Admin Panel Verification

### Test Case 6: View COD Orders

**Steps:**
1. [ ] Login as admin
2. [ ] Navigate to "Customer Orders"
3. [ ] Find recent COD order

**Expected Display:**
- [ ] Order appears in list
- [ ] Payment method: "COD"
- [ ] Payment status: "pending"
- [ ] Status: "pending"
- [ ] Admin can approve/reject

### Test Case 7: View Paid Orders

**Steps:**
1. [ ] Login as admin
2. [ ] Navigate to "Customer Orders"
3. [ ] Find recent online paid order

**Expected Display:**
- [ ] Order appears in list
- [ ] Payment method: "Online"
- [ ] Payment status: "completed"
- [ ] Status: "approved" (already approved)
- [ ] Razorpay payment ID visible
- [ ] Paid timestamp shown

---

## 🔍 Edge Cases Testing

### Test Case 8: Empty Cart
- [ ] Go to checkout with empty cart
- [ ] Should redirect to medicines page
- [ ] Error toast shown

### Test Case 9: Expired Stock
- [ ] Add expired batch to cart
- [ ] Try to place order
- [ ] Should show error: "Batch has expired"

### Test Case 10: Insufficient Stock
- [ ] Add quantity > available stock
- [ ] Try to place order
- [ ] Should show error: "Insufficient stock"

### Test Case 11: Invalid Form Data
- [ ] Try to place order with:
  - [ ] Empty name
  - [ ] Invalid email
  - [ ] Invalid phone (less than 10 digits)
  - [ ] Empty address
  - [ ] Invalid pincode
- [ ] Each should show appropriate validation error

---

## 📊 Database Queries for Verification

### Check Recent Orders
```sql
SELECT 
  order_number,
  status,
  payment_method,
  payment_status,
  total,
  razorpay_payment_id,
  paid_at,
  created_at
FROM customer_orders
ORDER BY created_at DESC
LIMIT 10;
```

### Check Payment Status Distribution
```sql
SELECT 
  payment_method,
  payment_status,
  COUNT(*) as count,
  SUM(total) as total_amount
FROM customer_orders
GROUP BY payment_method, payment_status
ORDER BY payment_method, payment_status;
```

### Check Failed Payments
```sql
SELECT 
  order_number,
  payment_method,
  payment_status,
  status,
  total,
  created_at
FROM customer_orders
WHERE payment_status = 'failed'
ORDER BY created_at DESC;
```

---

## 🐛 Common Issues & Solutions

### Issue: Migration Fails
**Solution:**
- Check RLS policies aren't blocking
- Verify you're connected to correct database
- Try running each ALTER TABLE separately

### Issue: Razorpay Modal Doesn't Open
**Check:**
- [ ] Browser console for errors
- [ ] Internet connection (for Razorpay SDK)
- [ ] Environment variables are set
- [ ] No ad blockers interfering

### Issue: Payment Succeeds but Order Not Updated
**Check:**
- [ ] Browser console for verification errors
- [ ] Database RLS policies on customer_orders
- [ ] User has permission to update orders

### Issue: crypto-js Error
**Solution:**
```bash
npm install crypto-js
npm run dev  # Restart server
```

---

## ✅ Final Verification

After all tests pass:

- [ ] COD orders work end-to-end
- [ ] Online payments work end-to-end
- [ ] Auto-approval works for paid orders
- [ ] Payment cancellation handled correctly
- [ ] Admin can view all payment details
- [ ] Stock reservations created properly
- [ ] Cart clears after successful order
- [ ] Error handling works correctly

---

## 🎉 Success Criteria

You're ready for production when:

1. ✅ All test cases pass
2. ✅ No console errors during checkout
3. ✅ Database records are correct
4. ✅ Admin panel shows payment info
5. ✅ Edge cases handled gracefully
6. ✅ User experience is smooth

---

## 📞 If Something Breaks

1. **Check Browser Console** - Most errors show here first
2. **Check Database Logs** - Supabase logs show query errors
3. **Verify RLS Policies** - Common cause of "permission denied"
4. **Check Network Tab** - See if API calls are failing
5. **Review Migration** - Ensure all columns exist

---

## 📝 Test Results Log

| Test Case | Status | Notes | Date |
|-----------|--------|-------|------|
| COD Order | ⬜ | | |
| COD with Rx | ⬜ | | |
| Online Payment | ⬜ | | |
| Payment Cancel | ⬜ | | |
| Online with Rx | ⬜ | | |
| Admin COD View | ⬜ | | |
| Admin Paid View | ⬜ | | |
| Empty Cart | ⬜ | | |
| Expired Stock | ⬜ | | |
| Low Stock | ⬜ | | |
| Form Validation | ⬜ | | |

Legend: ✅ Pass | ❌ Fail | ⬜ Not Tested

---

**Start testing now!** Follow the checklist in order. 🚀
