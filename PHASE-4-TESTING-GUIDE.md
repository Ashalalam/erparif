# Phase 4: Shopping Cart & Checkout - Testing Guide

## 🚀 Quick Start

**Application is running on**: http://localhost:5173/

---

## ⚠️ IMPORTANT: Run This SQL First!

Before testing prescription upload, run this in Supabase SQL Editor:

**File**: `create-prescriptions-storage.sql`

**Steps**:
1. Open Supabase Dashboard (https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Paste the contents of `create-prescriptions-storage.sql`
5. Click **Run**
6. Verify you see: ✅ Prescriptions storage bucket created successfully!

---

## 🧪 Complete Test Flow

### Step 1: Login as Customer
```
URL: http://localhost:5173/login
Email: ashalalam2005@gmail.com (your registered customer account)
OR register a new customer at /register
```

### Step 2: Browse Medicines
```
URL: http://localhost:5173/customer/medicines
Action: Browse available medicines
Expected: See all medicines with stock status
```

### Step 3: Add Medicines to Cart
```
Action: 
1. Find an in-stock medicine
2. Adjust quantity (try +/- buttons)
3. Click "Add to Cart"
4. Check cart icon (should show item count)
5. Add 2-3 different medicines
```

### Step 4: View Cart
```
URL: http://localhost:5173/customer/cart
Action: Review cart contents
Expected:
- See all added medicines
- Medicine details (name, manufacturer, batch, expiry)
- Quantity controls working
- Remove item button working
- Subtotal, GST, Total calculations correct
- If Rx medicines: Orange prescription notice
```

**Test Scenarios**:
- ✅ Increase quantity (ensure doesn't exceed stock)
- ✅ Decrease quantity (ensure minimum is 1)
- ✅ Type quantity directly
- ✅ Remove individual items
- ✅ Clear entire cart

### Step 5: Proceed to Checkout
```
URL: http://localhost:5173/customer/checkout
Action: Click "Proceed to Checkout" from cart
Expected:
- Customer details form (pre-filled with profile data)
- Delivery address form
- Order summary sidebar
- If Rx medicines: Prescription upload section
```

**Test Form Validation**:
- ❌ Submit with empty fields → Should show errors
- ❌ Invalid email format → Should show error
- ❌ Invalid phone (not 10 digits) → Should show error
- ❌ Invalid pincode (not 6 digits) → Should show error
- ✅ Fill all fields correctly → Errors clear

### Step 6: Upload Prescription (If Required)
```
Action (only if cart has Rx medicines):
1. Look for orange notice listing Rx medicines
2. Click "Select Files" in prescription upload section
3. Choose a JPG, PNG, or PDF file (< 5MB)
4. See file preview/indicator
5. Can remove and re-select if needed
```

**Test Scenarios**:
- ✅ Upload JPG/PNG image → See preview
- ✅ Upload PDF → See PDF indicator
- ❌ Upload > 5MB file → Should show error
- ❌ Upload .doc file → Should show error
- ✅ Upload multiple files → All should list

### Step 7: Place Order
```
Action: Click "Place Order" button
Expected:
1. Button shows "Placing Order..." with spinner
2. Button disables (prevent double-click)
3. Stock validation happens
4. Prescription uploads (if any)
5. Order created in database
6. Redirect to confirmation page
```

**Test Scenarios**:
- ❌ Missing required fields → Error message
- ❌ Rx medicine without prescription → Error message
- ❌ Insufficient stock (reduce stock via admin first) → Error message
- ❌ Expired batch → Error message
- ✅ Valid order → Success, redirect to confirmation

### Step 8: Order Confirmation
```
URL: http://localhost:5173/customer/order-confirmation/:orderId
Expected:
- Green checkmark with success message
- Order number displayed prominently
- Order status badge (Pending Review)
- Full item list with quantities and prices
- Total breakdown (subtotal, GST, total)
- Delivery address
- Contact information
- "What happens next" guide
```

**Verify**:
- ✅ Order number is shown
- ✅ Status is "Pending Review"
- ✅ All items listed correctly
- ✅ Prices match cart
- ✅ Delivery address correct
- ✅ If Rx: "Prescription Uploaded" confirmation shown

---

## 🗄️ Database Verification

After placing an order, verify in Supabase:

### Check customer_orders table
```sql
SELECT * FROM customer_orders 
WHERE customer_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Verify**:
- ✅ Order number generated
- ✅ Status = 'pending'
- ✅ Subtotal, tax, total correct
- ✅ requires_prescription = true/false (based on cart)
- ✅ prescription_uploaded = true/false
- ✅ prescription_urls array (if uploaded)
- ✅ Delivery address saved
- ✅ Customer phone and email saved

### Check customer_order_items table
```sql
SELECT * FROM customer_order_items 
WHERE order_id = 'YOUR_ORDER_ID';
```

**Verify**:
- ✅ One row per cart item
- ✅ medicine_id and batch_id correct
- ✅ Quantity matches cart
- ✅ unit_price matches batch price
- ✅ Subtotal and total calculated correctly

### Check stock_reservations table
```sql
SELECT * FROM stock_reservations 
WHERE order_id = 'YOUR_ORDER_ID';
```

**Verify**:
- ✅ One reservation per order item
- ✅ Quantity reserved = quantity ordered
- ✅ Status = 'reserved'
- ✅ expires_at set to +48 hours

### Check order_status_history table
```sql
SELECT * FROM order_status_history 
WHERE order_id = 'YOUR_ORDER_ID' 
ORDER BY created_at;
```

**Verify**:
- ✅ Initial entry with status = 'pending'
- ✅ Notes = 'Order placed by customer'

### Check prescriptions storage (if uploaded)
1. Go to Supabase Dashboard → Storage
2. Click `prescriptions` bucket
3. Look for `prescription_TIMESTAMP_RANDOM.jpg/png/pdf`
4. File should be there and accessible

---

## 🐛 Edge Case Testing

### Test 1: Empty Cart Checkout
```
1. Clear cart (if items exist)
2. Navigate to /customer/checkout
Expected: Redirect to /customer/medicines with "Cart is empty" error
```

### Test 2: Stock Becomes Zero During Checkout
```
1. Add item to cart
2. Open admin panel in another tab
3. Reduce stock to 0 via inventory
4. Return to checkout, place order
Expected: "Insufficient stock" error, cart preserved
```

### Test 3: Expired Batch in Cart
```
1. Admin: Find batch with expiry_date < today
2. Customer: Add that medicine to cart
3. Attempt checkout
Expected: "Batch has expired" error
```

### Test 4: Missing Prescription Upload
```
1. Add Rx medicine to cart
2. Proceed to checkout
3. Fill form but DON'T upload prescription
4. Click "Place Order"
Expected: "Please upload your prescription" error
```

### Test 5: Rapid Double-Click
```
1. Fill valid checkout form
2. Click "Place Order" rapidly 5 times
Expected: Only ONE order created (button disables immediately)
```

### Test 6: Network Failure Simulation
```
1. Open DevTools → Network tab
2. Throttle to "Offline"
3. Attempt to place order
Expected: Error message, cart data preserved, can retry
```

### Test 7: Unauthorized Order Access
```
1. Place order as Customer A
2. Copy order confirmation URL
3. Logout, login as Customer B
4. Paste order URL
Expected: "Order Not Found" or redirect (security check)
```

---

## ✅ Success Criteria

Phase 4 is successful if:

- [ ] Can add medicines to cart from catalog
- [ ] Cart shows correct items, quantities, and totals
- [ ] Can update quantities within stock limits
- [ ] Can remove items and clear cart
- [ ] Checkout form validates all fields
- [ ] Prescription upload works for Rx medicines
- [ ] Stock validation prevents overselling
- [ ] Order placement creates all database records
- [ ] Order confirmation page displays correctly
- [ ] Database has correct order, items, and reservations
- [ ] Cart clears after successful order
- [ ] No duplicate orders on rapid clicks
- [ ] Edge cases handled gracefully
- [ ] No breaking changes to existing features

---

## 🔍 Visual Inspection Checklist

### Cart Page
- [ ] Medicine cards have proper spacing
- [ ] Quantity controls are intuitive
- [ ] Prices display correctly (₹ symbol)
- [ ] GST calculation shown
- [ ] "OUT OF STOCK" badge visible (if zero stock)
- [ ] Prescription notice prominent (orange)
- [ ] Empty cart state looks good
- [ ] Mobile responsive

### Checkout Page
- [ ] Two-column layout (form + summary)
- [ ] Form fields clearly labeled
- [ ] Error messages visible in red
- [ ] Prescription upload section clear
- [ ] Order summary sticky on scroll
- [ ] "Place Order" button prominent
- [ ] Loading state (spinner) shows
- [ ] Mobile responsive

### Confirmation Page
- [ ] Success checkmark prominent
- [ ] Order number large and readable
- [ ] Status badge color-coded
- [ ] Item list well-formatted
- [ ] Delivery details organized
- [ ] "What happens next" helpful
- [ ] Action buttons clear
- [ ] Mobile responsive

---

## 🚨 Common Issues & Solutions

### Issue 1: Prescription upload fails
**Solution**: 
1. Check if `create-prescriptions-storage.sql` was run
2. Verify storage bucket exists in Supabase Dashboard
3. Check browser console for errors

### Issue 2: Order placement shows "Failed to create order"
**Solution**:
1. Check Supabase RLS policies
2. Verify user is authenticated
3. Check browser console and network tab
4. Ensure `customer_orders` table has correct permissions

### Issue 3: Stock validation not working
**Solution**:
1. Verify `medicine_batches` table has current_quantity > 0
2. Check expiry_date is in future
3. Ensure batch is linked to medicine correctly

### Issue 4: Cart icon not updating
**Solution**:
1. Check if cartStore is imported correctly
2. Verify `getItemsCount()` function works
3. Check React DevTools for state changes

### Issue 5: Prescription notice not showing
**Solution**:
1. Verify medicine has `prescription_required = true`
2. Check cart items have medicine data loaded
3. Ensure prescription detection logic runs

---

## 📞 Support

If you encounter issues:

1. **Check browser console** (F12 → Console tab)
2. **Check network tab** (F12 → Network tab)
3. **Check Supabase logs** (Dashboard → Logs)
4. **Verify database records** (Dashboard → Table Editor)

Common error patterns:
- `RLS policy violation` → Check permissions
- `404 Not Found` → Check routing
- `Failed to fetch` → Check Supabase connection
- `Validation error` → Check form fields

---

## 🎯 Next Steps After Testing

Once Phase 4 testing is complete:

1. ✅ Mark all checklist items
2. ✅ Document any issues found
3. ✅ Fix critical bugs
4. ✅ Commit code with message: "Phase 4: Shopping Cart & Checkout - Complete"
5. ✅ Push to repository
6. 🚀 **Ready for Phase 5: Admin Order Management**

---

**Happy Testing!** 🧪✨
