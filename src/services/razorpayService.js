/**
 * Razorpay Payment Service for Customer Orders
 * Uses same Razorpay configuration as POS billing
 */

import { supabase } from '../lib/supabase'

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID

/**
 * Initialize Razorpay SDK
 * Loads the Razorpay checkout script dynamically
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Create order in database for online payment
 * Simplified version - no server-side Razorpay order creation
 */
export const createRazorpayOrder = async (orderData) => {
  try {
    // Create order items
    const orderItems = orderData.items.map(item => ({
      order_id: null, // Will be set after order creation
      medicine_id: item.medicine_id,
      batch_id: item.batch_id,
      medicine_name: item.medicine_name,
      batch_number: item.batch_number,
      quantity: item.quantity,
      unit_price: item.unit_price,
      mrp: item.mrp,
      discount_percent: item.discount_percent,
      discount_amount: item.discount_amount,
      gst_percentage: item.gst_percentage,
      gst_amount: item.gst_amount,
      item_total: item.item_total,
      requires_prescription: item.requires_prescription
    }))

    // Parse address components
    const addressParts = orderData.delivery_address.split(',').map(s => s.trim())
    const pincode = addressParts[addressParts.length - 1]?.match(/\d{6}/)?.[0] || 'N/A'
    const state = addressParts[addressParts.length - 2] || 'N/A'
    const city = addressParts[addressParts.length - 3] || 'N/A'
    const address = addressParts.slice(0, -3).join(', ') || orderData.delivery_address

    // Prepare order data with payment fields
    const orderDataToInsert = {
      customer_id: orderData.customer_id,
      order_number: orderData.order_number,
      status: 'pending',
      subtotal: orderData.subtotal,
      discount: orderData.discount || 0,
      gst_amount: orderData.gst_amount,
      delivery_charge: orderData.delivery_charge || 0,
      total: orderData.grand_total,
      delivery_name: orderData.customer_email.split('@')[0],
      delivery_phone: orderData.customer_phone,
      delivery_address: address,
      delivery_city: city,
      delivery_state: state,
      delivery_pincode: pincode,
      requires_prescription: orderData.prescription_url ? true : false,
      prescription_uploaded: orderData.prescription_url ? true : false,
      prescription_url: orderData.prescription_url,
      prescription_verified: false,
      admin_notes: orderData.notes,
      customer_notes: orderData.notes,
      payment_method: 'Online',
      payment_status: 'pending'
    }

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('customer_orders')
      .insert([orderDataToInsert])
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      throw orderError
    }

    // Update order items with order_id
    const itemsWithOrderId = orderItems.map(item => ({ ...item, order_id: order.id }))
    
    const { error: itemsError } = await supabase
      .from('customer_order_items')
      .insert(itemsWithOrderId)

    if (itemsError) {
      // Rollback: delete order
      await supabase.from('customer_orders').delete().eq('id', order.id)
      throw itemsError
    }

    return {
      order_id: order.id,
      order_number: orderData.order_number,
      amount: Math.round(orderData.grand_total * 100), // Convert to paise
      currency: 'INR'
    }
  } catch (error) {
    console.error('Error creating order:', error)
    throw error
  }
}

/**
 * Initialize Razorpay payment
 * Opens Razorpay checkout modal (same as POS)
 */
export const initiatePayment = async (orderDetails, customerData, onSuccess, onFailure) => {
  try {
    // Load Razorpay script
    const loaded = await loadRazorpayScript()
    if (!loaded) {
      throw new Error('Failed to load Razorpay SDK')
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: orderDetails.amount,
      currency: orderDetails.currency,
      name: 'BillSprout Smart ERP',
      description: `Order #${orderDetails.order_number}`,
      prefill: {
        name: customerData.name,
        email: customerData.email,
        contact: customerData.phone
      },
      theme: {
        color: '#1e3a8a' // Same blue as POS
      },
      handler: async function (response) {
        // Payment successful
        try {
          await handlePaymentSuccess({
            order_id: orderDetails.order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          })
          onSuccess(response)
        } catch (error) {
          console.error('Payment success handler failed:', error)
          onFailure(error)
        }
      },
      modal: {
        ondismiss: function () {
          onFailure(new Error('Payment cancelled by user'))
        }
      }
    }

    const razorpay = new window.Razorpay(options)
    
    razorpay.on('payment.failed', function (response) {
      console.error('Payment failed:', response.error)
      onFailure(new Error(response.error.description || 'Payment failed'))
    })
    
    razorpay.open()
  } catch (error) {
    console.error('Error initiating payment:', error)
    onFailure(error)
  }
}

/**
 * Handle successful payment
 * Updates order status after payment
 */
export const handlePaymentSuccess = async (paymentData) => {
  try {
    console.log('✅ Payment successful, updating order:', paymentData)

    // Update order with payment details
    const { error: updateError } = await supabase
      .from('customer_orders')
      .update({
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_signature: paymentData.razorpay_signature,
        payment_status: 'completed',
        paid_at: new Date().toISOString(),
        status: 'approved' // Auto-approve online paid orders
      })
      .eq('id', paymentData.order_id)

    if (updateError) throw updateError

    console.log('✅ Order updated successfully')

    return { success: true }
  } catch (error) {
    console.error('Error handling payment success:', error)
    
    // Mark payment as failed
    await supabase
      .from('customer_orders')
      .update({ payment_status: 'failed' })
      .eq('id', paymentData.order_id)
    
    throw error
  }
}

/**
 * Handle payment failure
 * Updates order status when payment fails
 */
export const handlePaymentFailure = async (orderId) => {
  try {
    const { error } = await supabase
      .from('customer_orders')
      .update({ 
        payment_status: 'failed',
        status: 'cancelled'
      })
      .eq('id', orderId)

    if (error) throw error
  } catch (error) {
    console.error('Error handling payment failure:', error)
    throw error
  }
}
