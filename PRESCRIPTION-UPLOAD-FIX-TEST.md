# Prescription Upload Bug Fix - Testing Guide

## ✅ Bug Fixed

**Root Cause**: Validation checked for uploaded URLs before triggering the upload.

**Solution**: 
1. Track selected files in component state
2. Validate that files are selected (not just uploaded)
3. Upload files BEFORE final validation
4. Better error handling and logging

---

## 🧪 Test the Fix

### Test 1: Place Order WITH Prescription (Happy Path)

**Steps**:
1. Go to `http://localhost:5173/customer/medicines`
2. Add **Amoxicillin 500mg** (or any Rx medicine) to cart
3. Go to cart → Click "Proceed to Checkout"
4. Fill all delivery details
5. **Upload a prescription file** (PNG, JPG, or PDF < 5MB)
6. Verify file appears under "Selected Files"
7. Click **"Place Order"**

**Expected Result**:
- ✅ Button shows "Placing Order..." with spinner
- ✅ Console logs show: "⬆️ Uploading prescription files..."
- ✅ Console logs show: "✅ Upload successful, URLs: [...]"
- ✅ Order placed successfully
- ✅ Redirected to order confirmation page
- ✅ Order has `prescription_uploaded: true` in database

**Console Logs to Verify**:
```
🛒 Place Order clicked
💊 Requires prescription: true
📁 Selected files: 1
🔗 Prescription URLs: 0
⬆️ Uploading prescription files...
✅ Upload successful, URLs: ["https://..."]
```

---

### Test 2: Place Order WITHOUT Prescription (Should Fail)

**Steps**:
1. Have Rx medicine in cart
2. Go to checkout
3. Fill delivery details
4. **DO NOT upload prescription**
5. Click "Place Order"

**Expected Result**:
- ❌ Error toast: "Please select your prescription file(s) before placing the order"
- ❌ Order NOT placed
- ✅ Cart preserved
- ✅ Form data preserved

**Console Logs**:
```
🛒 Place Order clicked
💊 Requires prescription: true
📁 Selected files: 0
🔗 Prescription URLs: 0
```

---

### Test 3: Remove File After Selection

**Steps**:
1. Go to checkout with Rx medicine
2. Upload prescription file
3. See file in "Selected Files" list
4. Click **X (remove)** button
5. Click "Place Order"

**Expected Result**:
- ✅ File removed from list
- ❌ Error: "Please select your prescription file(s)..."
- ✅ Can re-select file

---

### Test 4: Multiple Files

**Steps**:
1. Go to checkout with Rx medicine
2. Select **2 prescription files** at once
3. Both should appear in "Selected Files"
4. Click "Place Order"

**Expected Result**:
- ✅ Both files uploaded
- ✅ Both URLs saved in database
- ✅ Order placed successfully

---

### Test 5: Invalid File Type

**Steps**:
1. Try to upload a `.docx` or `.txt` file

**Expected Result**:
- ❌ Error toast: "File type must be JPG, PNG, WEBP, or PDF"
- ❌ File NOT added to list

---

### Test 6: File Too Large

**Steps**:
1. Try to upload a file > 5MB

**Expected Result**:
- ❌ Error toast: "File size must be less than 5MB"
- ❌ File NOT added to list

---

### Test 7: Non-Rx Medicine (Should Skip Prescription)

**Steps**:
1. Add ONLY non-Rx medicines to cart
2. Go to checkout
3. **NO prescription upload section should appear**
4. Fill delivery details
5. Click "Place Order"

**Expected Result**:
- ✅ Order placed successfully WITHOUT prescription
- ✅ `requires_prescription: false` in database
- ✅ `prescription_uploaded: false` in database

---

## 🔍 Verify in Database

After successful order with prescription:

### Check customer_orders table
```sql
SELECT 
  order_number,
  requires_prescription,
  prescription_uploaded,
  prescription_urls
FROM customer_orders
WHERE customer_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**:
- `requires_prescription`: `true`
- `prescription_uploaded`: `true`
- `prescription_urls`: `["https://kkcugqqohxfegdjipllo.supabase.co/storage/v1/object/public/prescriptions/prescription_..."]`

### Check Supabase Storage
1. Open Supabase Dashboard
2. Go to **Storage** → **prescriptions** bucket
3. Look for uploaded file: `prescription_TIMESTAMP_RANDOM.png/jpg/pdf`
4. File should be there

---

## 🐛 If Issues Persist

### Check Browser Console

Look for these logs:
- `🛒 Place Order clicked`
- `💊 Requires prescription: true/false`
- `📁 Selected files: X`
- `🔗 Prescription URLs: X`
- `⬆️ Uploading prescription files...`
- `✅ Upload successful, URLs: [...]`

### Check Network Tab

1. Open DevTools → Network tab
2. Look for requests to `/storage/v1/object/prescriptions/...`
3. Should return 200 OK
4. Response should contain upload confirmation

### Common Issues

**Issue**: "Upload handler not found"
- **Solution**: Refresh the page, component might not have mounted properly

**Issue**: "Failed to upload prescription"
- **Solution**: Check Supabase storage bucket exists and RLS policies are correct
- Run: `SELECT * FROM storage.buckets WHERE id = 'prescriptions';`

**Issue**: Upload slow or hangs
- **Solution**: Check file size, ensure < 5MB
- Check network connection

---

## ✅ Files Modified

1. **`src/pages/customer/CheckoutPage.jsx`**
   - Added `selectedFiles` state to track selected files
   - Added `handleFilesSelected` callback
   - Modified `handlePlaceOrder` to check selected files
   - Upload happens BEFORE validation now
   - Better error handling and logging
   - Uses `uploadedUrls` variable for order data

2. **`src/components/PrescriptionUpload.jsx`**
   - Added `onFilesSelected` prop
   - Calls `onFilesSelected` when files added/removed
   - Parent component now knows file selection state

---

## 🎯 Key Changes

### Before (Broken)
```javascript
// Validation checked prescriptionUrls (always empty)
if (requiresRx && prescriptionUrls.length === 0) {
  toast.error('Please upload...')  // ❌ Always triggers!
  return
}

// Upload happened AFTER validation
if (requiresRx && prescriptionUploadRef.current) {
  const urls = await uploadFiles()  // Too late!
  setPrescriptionUrls(urls)
}
```

### After (Fixed)
```javascript
// Validation checks selectedFiles (updated when files picked)
if (requiresRx && selectedFiles.length === 0) {
  toast.error('Please select...')  // ✅ Only if no files
  return
}

// Upload happens FIRST
if (requiresRx && selectedFiles.length > 0) {
  const urls = await uploadFiles()  // ✅ Upload before proceeding
  uploadedUrls = urls
}

// Then use uploadedUrls in order data
prescription_urls: uploadedUrls  // ✅ Correct URLs
```

---

## 📊 Test Results Template

```
✅ Test 1: Order with prescription - PASS
✅ Test 2: Order without prescription - PASS (blocked)
✅ Test 3: Remove file after selection - PASS
✅ Test 4: Multiple files - PASS
✅ Test 5: Invalid file type - PASS (blocked)
✅ Test 6: File too large - PASS (blocked)
✅ Test 7: Non-Rx medicine - PASS

Database verification: ✅ PASS
Storage verification: ✅ PASS
```

---

**The bug is now fixed!** Test and verify all scenarios above. ✨
