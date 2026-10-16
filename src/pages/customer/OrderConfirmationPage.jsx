import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  CheckCircle, Package, MapPin, Phone, Mail, FileText, 
  Calendar, Clock, ArrowRight, Home, AlertCircle 
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const OrderConfirmationPage = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [order, setOrder] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orderId) {
      navigate('/customer')
      return
    }
    
    fetchOrderDetails()
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)

      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from('customer_orders')
        .select('*')
        .eq('id', orderId)
        .eq('customer_id', user.id) // Ensure user can only see their own orders
        .single()

      if (orderError) {
        console.error('Order fetch error:', orderError)
        throw new Error('Order not found')
      }

      if (!orderData) {
        throw new Error('Order not found')
      }

      setOrder(orderData)

      // Fetch order items with medicine details
      const { data: itemsData, error: itemsError } = await supabase
        .from('customer_order_items')
        .select(`
          *,
          medicine:medicines(*),
          batch:medicine_batches(*)
        `)
        .eq('order_id', orderId)

      if (itemsError) {
        console.error('Order items fetch error:', itemsError)
        throw new Error('Failed to load order items')
      }

      setOrderItems(itemsData || [])

    } catch (err) {
      console.error('Error fetching order:', err)
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      ready: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pending Review',
      confirmed: 'Confirmed',
      processing: 'Processing',
      ready: 'Ready for Pickup',
      completed: 'Completed',
      cancelled: 'Cancelled',
      rejected: 'Rejected'
    }
    return texts[status] || status
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || 'The order you are looking for does not exist or you do not have permission to view it.'}
          </p>
          <Link
            to="/customer"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Order Placed Successfully!
        </h1>
        
        <p className="text-lg text-gray-600 mb-4">
          Thank you for your order. We'll review it and get back to you shortly.
        </p>

        <div className="inline-flex items-center px-4 py-2 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600 mr-2">Order Number:</span>
          <span className="text-lg font-bold text-gray-900">{order.order_number}</span>
        </div>
      </div>

      {/* Order Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Order Status</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
              {getStatusText(order.status)}
            </span>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-600">Order Date</p>
            <p className="font-medium text-gray-900">
              {new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
            <p className="text-sm text-gray-600">
              {new Date(order.created_at).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {order.status === 'pending' && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">Order Under Review</p>
                <p className="text-sm text-blue-800 mt-1">
                  Our pharmacist is reviewing your order. 
                  {order.requires_prescription && ' Prescription verification is in progress.'}
                  {' '}You'll receive a notification once the order is confirmed.
                </p>
              </div>
            </div>
          </div>
        )}

        {order.requires_prescription && order.prescription_uploaded && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Prescription Uploaded</p>
                <p className="text-sm text-green-800 mt-1">
                  Your prescription has been successfully uploaded and will be verified by our pharmacist.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Package className="w-5 h-5 mr-2" />
          Order Items ({orderItems.length})
        </h2>

        <div className="space-y-4">
          {orderItems.map((item) => (
            <div key={item.id} className="flex items-start space-x-4 pb-4 border-b last:border-b-0">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">
                  {item.medicine?.name || 'Medicine'}
                </h3>
                {item.medicine?.generic_name && (
                  <p className="text-sm text-gray-600 mt-1">
                    {item.medicine.generic_name}
                  </p>
                )}
                
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                  <span>Qty: {item.quantity}</span>
                  <span>•</span>
                  <span>₹{item.unit_price.toFixed(2)} per unit</span>
                </div>

                {item.medicine?.prescription_required && (
                  <div className="mt-2">
                    <span className="inline-flex items-center space-x-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      <FileText className="w-3 h-3" />
                      <span>Prescription Required</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right">
                <p className="font-bold text-gray-900">
                  ₹{item.total.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Order Totals */}
        <div className="mt-6 pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">₹{order.subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">GST</span>
            <span className="font-medium text-gray-900">₹{order.tax.toFixed(2)}</span>
          </div>

          <div className="flex justify-between pt-2 border-t">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-blue-600">
              ₹{order.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Delivery Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Delivery Details
        </h2>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Delivery Address</p>
              <p className="text-sm text-gray-600 mt-1">
                {order.delivery_address}<br />
                {order.delivery_city}, {order.delivery_state} - {order.delivery_pincode}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Phone className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Contact Number</p>
              <p className="text-sm text-gray-600 mt-1">{order.customer_phone}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Mail className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-600 mt-1">{order.customer_email}</p>
            </div>
          </div>

          {order.notes && (
            <div className="flex items-start space-x-3 pt-3 border-t">
              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Order Notes</p>
                <p className="text-sm text-gray-600 mt-1">{order.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/customer"
            className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            Go to Home
          </Link>

          <Link
            to="/customer/medicines"
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue Shopping
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>

        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-sm text-gray-600">
            Need help with your order?{' '}
            <a href="mailto:support@billsprout.online" className="text-blue-600 hover:underline font-medium">
              Contact Support
            </a>
          </p>
        </div>
      </div>

      {/* What's Next */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-3">What happens next?</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="font-bold mr-2">1.</span>
            <span>Our pharmacist will review your order and verify the prescription (if applicable)</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">2.</span>
            <span>Once confirmed, we'll prepare your medicines for pickup/delivery</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">3.</span>
            <span>You'll receive a notification when your order is ready</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">4.</span>
            <span>You can track your order status from the "My Orders" page</span>
          </li>
        </ol>
      </div>
    </div>
  )
}

export default OrderConfirmationPage
