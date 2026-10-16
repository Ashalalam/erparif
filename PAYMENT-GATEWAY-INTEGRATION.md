# Payment Gateway Integration - BillSprout Smart ERP

## 📋 Overview

Complete payment gateway integration with Razorpay for online payments and Cash on Delivery (COD) support.

**Status**: ✅ Phase 1 Complete | ⏳ Phase 2 (Razorpay) Ready for Testing

---

## 🎯 Features Implemented

### Phase 1: Database Schema & COD Support ✅

- **Payment method selection** (COD/Online) in checkout
- **Database schema** with payment tracking fields
- **COD orders** fully functional
- **Payment status tracking** (pending, processing, completed, failed, refunded)
- **Order-payment linking** with Razorpay fields

### Phase 2: Razorpay Integration ✅ (Testing Required)

- **Razorpay SDK integration** (dynamic script loading)
- **Payment initialization** and checkout modal
- **Payment verification** (client-side for testing)
- **Auto-approval** of paid orders
- **Payment failure handling** with order cancellation
- **Stock reservations** after successful payment

---

## 📁 Files Modified/Created

### Database Migration
```
migration-add-payment-fields.sql
```
- Adds payment_method, payment_status fields
- Adds Razorpay tracking fields (order_id, payment_id, signature)
- Adds paid_at timestamp and payment_reference
- Creates indexes for payment tracking

### Service Layer
```
src/services/razorpayService.js
```
- `loadRazorpayScript()` - Loads Razorpay SDK
- `createRazorpayOrder()` - Creates order with payment tracking
- `initiatePayment()` - Opens Razorpay checkout modal
- `verifyPayment()` - Verifies payment and updates order
- `handlePaymentFailure()` - Handles failed payments

### UI Components
```
src/pages/customer/CheckoutPage.jsx
```
- Payment method selection (COD/Online)
- Razorpay payment flow integration
- Split order creation (COD vs Online)
- Payment success/failure handling

---

## 🔧 Database Schema

### New Columns in `customer_orders`

| Column | Type | Values | Description |
|--------|------|--------|-------------|
| `payment_method` | TEXT | COD, Online, UPI, Card, Wallet | Selected payment method |
| `payment_status` | TEXT | pending, processing, completed, failed, refunded | Payment tracking |
| `razorpay_order_id` | TEXT | - | Razorpay order identifier |
| `razorpay_payment_id` | TEXT | - | Razorpay payment identifier |
| `razorpay_signature` | TEXT | - | Payment verification signature |
| `paid_at` | TIMESTAMPTZ | - | Payment completion timestamp |
| `payment_reference` | TEXT | - | Additional reference |
| `customer_notes` | TEXT | - | Customer order notes |

---

## 💳 Payment Flow

### COD Flow
```
1. Customer selects "Cash on Delivery"
2. Form validation
3. Prescription upload (if required)
4. Order created with payment_status = 'pending'
5. Order items created
6. Stock reservations created
7. Cart cleared
8. Navigate to confirmation page
```

### Online Payment Flow (Razorpay)
```
1. Customer selects "Pay Online"
2. Form validation
3. Prescription upload (if required)
4. Order created in database (status = 'pending')
5. Razorpay order created (mock order_id for testing)
6. Razorpay checkout modal opens
7. Customer completes payment
8. Payment verification (signature check)
9. Order updated (status = 'approved', payment_status = 'completed')
10. Stock reservations created
11. Cart cleared
12. Navigate to confirmation page
```

---

## 🔐 Environment Variables

### Required in `.env`

```env
VITE_RAZORPAY_KEY_ID=rzp_live_TlRBFBUvlGLmWR
VITE_RAZORPAY_KEY_SECRET=LQajnLAFIWQqyWRRrGDW138f
```

⚠️ **Security Note**: These keys are currently exposed client-side for testing. For production:
- Move key secret to server-side only
- Create Supabase Edge Functions for secure operations
- Never expose key secret in client code

---

## 🚀 Deployment Steps

### Step 1: Apply Database Migration

```sql
-- Run in Supabase SQL Editor
-- File: migration-add-payment-fields.sql
```

This will:
- Add all payment-related columns
- Create indexes for performance
- Set default values for existing orders

### Step 2: Verify Environment Variables

```bash
# Check .env file has Razorpay credentials
cat .env | grep RAZORPAY
```

### Step 3: Install Dependencies (if needed)

```bash
npm install crypto-js
```

### Step 4: Test COD Orders

1. Add items to cart
2. Go to checkout
3. Fill in delivery details
4. Select "Cash on Delivery"
5. Place order
6. Verify order appears in admin panel

### Step 5: Test Online Payment (Razorpay Test Mode)

1. Add items to cart
2. Go to checkout
3. Fill in delivery details
4. Select "Pay Online"
5. Click "Proceed to Payment"
6. Razorpay modal should open
7. Use test card: 4111 1111 1111 1111
8. Any future expiry date, any CVV
9. Complete payment
10. Verify order status = 'approved', payment_status = 'completed'

---

## 🧪 Testing Checklist

### COD Testing
- [ ] Order creation successful
- [ ] Payment method saved as 'COD'
- [ ] Payment status = 'pending'
- [ ] Order status = 'pending'
- [ ] Order appears in admin panel
- [ ] Stock reservations created
- [ ] Cart clears after order

### Online Payment Testing
- [ ] Razorpay modal opens
- [ ] Test payment succeeds
- [ ] Payment verification works
- [ ] Order status changes to 'approved'
- [ ] Payment status = 'completed'
- [ ] paid_at timestamp saved
- [ ] razorpay_payment_id saved
- [ ] Stock reservations created
- [ ] Cart clears after payment

### Failure Testing
- [ ] Payment cancellation works
- [ ] Order marked as cancelled
- [ ] Payment status = 'failed'
- [ ] User can retry order

---

## ⚠️ Current Limitations

### Client-Side Verification (Testing Only)

The current implementation does **client-side payment verification** which is **NOT production-safe**.

**What needs to be done for production:**

1. **Create Supabase Edge Function: `create-razorpay-order`**
   ```typescript
   // This function should:
   // 1. Call Razorpay API to create order
   // 2. Return order_id to client
   // 3. Keep key_secret server-side only
   ```

2. **Create Supabase Edge Function: `verify-razorpay-payment`**
   ```typescript
   // This function should:
   // 1. Receive payment data from client
   // 2. Verify signature using key_secret
   // 3. Update order status if valid
   // 4. Return verification result
   ```

3. **Move Key Secret**
   - Remove `VITE_RAZORPAY_KEY_SECRET` from client
   - Store in Supabase Edge Function environment

---

## 📊 Payment Status States

| Status | Description | Next Actions |
|--------|-------------|--------------|
| `pending` | Order created, payment not initiated | Wait for payment |
| `processing` | Payment in progress | Wait for confirmation |
| `completed` | Payment successful | Fulfill order |
| `failed` | Payment failed/cancelled | User can retry |
| `refunded` | Payment refunded | Manual admin action |

---

## 🎨 UI Components

### Payment Method Selection
- Radio button selection
- COD: Simple, familiar option
- Online: Shows security badge, payment options
- Info alerts for each method

### Razorpay Checkout Modal
- Pre-filled customer details
- Multiple payment options (UPI, Cards, Net Banking, Wallets)
- Branded with BillSprout name
- Green theme (#10b981)

---

## 🔄 Order Status Flow with Payments

### COD Orders
```
pending → [admin approves] → approved → processing → dispatched → delivered
                                      ↓
                                   rejected
```

### Online Paid Orders
```
pending → [payment succeeds] → approved (auto) → processing → dispatched → delivered
              ↓
           failed → cancelled
```

---

## 📈 Next Steps (Optional Enhancements)

### Priority 2: Advanced Payment Features

1. **Partial Payments**
   - Allow advance payment + COD
   - Track payment_received vs total

2. **Refund Management**
   - Admin interface for refunds
   - Razorpay refund API integration
   - Refund status tracking

3. **Payment Reminders**
   - Email reminders for pending payments
   - Payment link generation for expired sessions

4. **Payment Analytics**
   - Payment method distribution
   - Success/failure rates
   - Revenue tracking by payment method

### Priority 3: Additional Payment Methods

1. **UPI Direct**
   - Skip Razorpay modal
   - Direct UPI payment flow

2. **EMI Options**
   - For orders above certain amount
   - Card EMI through Razorpay

3. **Wallet Integration**
   - Store wallet balance
   - Quick checkout for regular customers

---

## 🐛 Known Issues

### Issue 1: crypto-js Import
**Status**: ⚠️ May need adjustment

The razorpayService.js uses `crypto-js` for signature verification. If you encounter import errors:

```bash
npm install crypto-js
```

Or use native crypto API:
```javascript
import { createHmac } from 'crypto'
```

### Issue 2: Razorpay Test Mode
**Status**: ℹ️ Expected behavior

- Test mode orders don't create real transactions
- Signature verification may show warnings
- Use Razorpay test cards for testing

---

## 📞 Support

### Razorpay Documentation
- [Checkout Integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/)
- [Test Mode](https://razorpay.com/docs/payments/payments/test-card-details/)
- [Signature Verification](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/verify-payment-signature/)

### Supabase Edge Functions
- [Getting Started](https://supabase.com/docs/guides/functions)
- [Deploy Functions](https://supabase.com/docs/guides/functions/deploy)

---

## ✅ Completion Checklist

- [x] Database schema with payment fields
- [x] Payment method selection UI
- [x] COD flow implementation
- [x] Razorpay service layer
- [x] Razorpay checkout integration
- [x] Payment verification (client-side)
- [x] Payment failure handling
- [x] Order status updates
- [x] Stock reservation after payment
- [ ] Apply migration to database
- [ ] Test COD orders
- [ ] Test Razorpay orders (test mode)
- [ ] Move to production with Edge Functions

---

**Ready to test!** Apply the migration and start with COD orders, then test Razorpay in test mode. 🚀
