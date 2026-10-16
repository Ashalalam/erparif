/**
 * Hook to automatically send notifications when order status changes
 */

import { useEffect, useRef } from 'react'
import { sendOrderNotification } from '../services/notificationService'

// Map order status to notification event types
const statusToEventMap = {
  'confirmed': 'order_confirmed',
  'processing': 'order_processing',
  'ready': 'order_ready',
  'delivered': 'order_delivered',
  'cancelled': 'order_cancelled'
}

/**
 * Hook to handle order status change notifications
 * Usage: useOrderNotifications(order)
 */
export const useOrderNotifications = (order) => {
  const previousStatusRef = useRef(null)
  
  useEffect(() => {
    // Only send notification if status actually changed
    if (!order || !order.id || !order.status) return
    
    const previousStatus = previousStatusRef.current
    const currentStatus = order.status
    
    // Skip if this is the first render or status hasn't changed
    if (previousStatus === currentStatus) return
    
    // Update ref for next comparison
    previousStatusRef.current = currentStatus
    
    // Skip if no previous status (initial load)
    if (previousStatus === null) return
    
    // Get the event type for this status
    const eventType = statusToEventMap[currentStatus]
    if (!eventType) {
      console.log('No notification event mapped for status:', currentStatus)
      return
    }
    
    console.log(`📧 Triggering notification for status change: ${previousStatus} -> ${currentStatus}`)
    
    // Prepare order data for template placeholders
    const orderData = {
      order_id: order.id,
      order_number: order.order_number || order.id.slice(0, 8).toUpperCase(),
      customer_name: order.customer_name || 'Customer',
      total_amount: order.total_amount?.toFixed(2) || '0.00',
      payment_method: order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment',
      order_date: new Date(order.created_at).toLocaleDateString('en-IN'),
      order_tracking_url: `${window.location.origin}/customer/orders/${order.id}`,
      pharmacy_address: import.meta.env.VITE_PHARMACY_ADDRESS || 'Visit our pharmacy',
      estimated_delivery: order.estimated_delivery || 'Soon',
      delivered_date: order.delivered_at ? new Date(order.delivered_at).toLocaleDateString('en-IN') : '',
      cancellation_reason: order.cancellation_reason || 'As per your request',
      refund_amount: order.refund_amount?.toFixed(2) || order.total_amount?.toFixed(2) || '0.00',
      delivery_or_pickup_info: order.delivery_type === 'delivery' 
        ? `Your order will be delivered to ${order.delivery_address || 'your address'}.`
        : 'Ready for pickup at our pharmacy.',
      refund_info: order.payment_method === 'online' && order.refund_amount 
        ? `Refund of ₹${order.refund_amount.toFixed(2)} will be processed.`
        : '',
      // Conditional flags for template
      if_delivery: order.delivery_type === 'delivery',
      if_refund: order.payment_method === 'online' && order.refund_amount > 0
    }
    
    // Send notification asynchronously
    sendOrderNotification({
      customerId: order.customer_id,
      orderId: order.id,
      eventType,
      orderData
    }).then(result => {
      if (result.success) {
        console.log('✅ Order notification sent:', eventType)
      } else {
        console.error('❌ Failed to send order notification:', result.error)
      }
    }).catch(error => {
      console.error('❌ Error sending order notification:', error)
    })
    
  }, [order?.status, order?.id])
}

export default useOrderNotifications
