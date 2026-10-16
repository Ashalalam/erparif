import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import useCartStore from '../../store/cartStore'
import { 
  Package, Clock, CheckCircle, XCircle, Truck, 
  Eye, Download, ChevronDown, ChevronUp, RefreshCw, 
  RotateCcw, Ban, AlertCircle, FileText, MapPin
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { downloadInvoice } from '../../services/invoiceService'
import toast from 'react-hot-toast'
import DeliveryTracking from '../../components/customer/DeliveryTracking'

const MyOrdersPage = () => {
  const { user } = useAuthStore()
  const { addItem } = useCartStore()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [trackingOrder, setTrackingOrder] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellingOrder, setCancellingOrder] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-blue-100 text-blue-800 border-blue-200',
    processing: 'bg-purple-100 text-purple-800 border-purple-200',
    dispatched: 'bg-orange-100 text-orange-800 border-orange-200',
    delivered: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200'
  }

  const statusIcons = {
    pending: Clock,
    approved: CheckCircle,
    processing: Package,
    dispatched: Truck,
    delivered: CheckCircle,
    rejected: XCircle,
    cancelled: XCircle
  }

  const statusMessages = {
    pending: 'Your order has been received and is awaiting approval',
    approved: 'Your order has been approved and will be processed soon',
    processing: 'Your order is being processed',
    dispatched: 'Your order has been dispatched and is on the way',
    delivered: 'Your order has been delivered',
    rejected: 'This order was rejected',
    cancelled: 'This order was cancelled'
  }

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('customer_orders')
        .select(`
          *,
          items:customer_order_items(
            id,
            medicine_id,
            medicine_name, 
            batch_id,
            batch_number, 
            quantity, 
            unit_price,
            discount_percent,
            discount_amount,
            gst_percentage,
            gst_amount,
            item_total,
            requires_prescription
          ),
          status_history:order_status_history(
            id,
            old_status,
            new_status,
            notes,
            created_at
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      console.log('📦 Loaded my orders:', data)
      setOrders(data || [])
    } catch (error) {
      console.error('❌ Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleOrderDetails = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId)
  }

  const handleReorder = async (order) => {
    try {
      setActionLoading(true)
      
      // Validate order has items
      if (!order.items || order.items.length === 0) {
        alert('This order has no items to reorder')
        return
      }

      console.log('🔄 Reordering from order:', order)
      
      // Add each item to cart
      let addedCount = 0
      for (const item of order.items) {
        console.log('Processing item:', item)
        
        // Try to fetch the medicine and batch details to ensure they still exist
        const { data: medicine, error: medError } = await supabase
          .from('medicines')
          .select('*, batches:medicine_batches(*)')
          .eq('id', item.medicine_id)
          .single()

        if (medError || !medicine) {
          console.error('Medicine not found:', item.medicine_name, medError)
          alert(`Medicine "${item.medicine_name}" is no longer available`)
          continue
        }

        // Find the same batch or any available batch
        const batch = medicine.batches?.find(b => b.id === item.batch_id && b.current_quantity >= item.quantity) 
                   || medicine.batches?.find(b => b.current_quantity >= item.quantity)
        
        if (!batch) {
          alert(`"${item.medicine_name}" is out of stock or insufficient quantity available`)
          continue
        }

        // Add to cart (cartStore expects: medicine, batch, quantity, freeQuantity)
        addItem(
          {
            id: medicine.id,
            name: medicine.name,
            generic_name: medicine.generic_name,
            manufacturer: medicine.manufacturer,
            mrp: medicine.mrp,
            gst_percentage: medicine.gst_percentage,
            requires_prescription: medicine.requires_prescription
          },
          {
            id: batch.id,
            batch_number: batch.batch_number,
            expiry_date: batch.expiry_date,
            current_quantity: batch.current_quantity,
            selling_price: batch.selling_price
          },
          item.quantity,
          0 // free quantity
        )
        
        addedCount++
      }

      if (addedCount > 0) {
        alert(`${addedCount} item(s) added to cart! Please review your cart.`)
        navigate('/customer/cart')
      } else {
        alert('No items could be added to cart. All items are unavailable.')
      }
    } catch (error) {
      console.error('❌ Error reordering:', error)
      alert('Failed to reorder items. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelOrder = (order) => {
    if (order.status !== 'pending') {
      alert('Only pending orders can be cancelled')
      return
    }
    setCancellingOrder(order)
    setShowCancelModal(true)
  }

  const confirmCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason')
      return
    }

    try {
      setActionLoading(true)

      const { error } = await supabase
        .from('customer_orders')
        .update({
          status: 'cancelled',
          cancellation_reason: cancelReason,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', cancellingOrder.id)

      if (error) throw error

      alert('Order cancelled successfully')
      setShowCancelModal(false)
      setCancellingOrder(null)
      setCancelReason('')
      await loadOrders()
    } catch (error) {
      console.error('❌ Error cancelling order:', error)
      alert('Failed to cancel order: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getOrderProgress = (status) => {
    const steps = ['pending', 'approved', 'processing', 'dispatched', 'delivered']
    const currentIndex = steps.indexOf(status)
    
    if (status === 'cancelled' || status === 'rejected') {
      return { percentage: 0, step: 0, total: steps.length }
    }
    
    return {
      percentage: ((currentIndex + 1) / steps.length) * 100,
      step: currentIndex + 1,
      total: steps.length
    }
  }

  const handleDownloadInvoice = async (order) => {
    try {
      toast.loading('Generating invoice...', { id: 'invoice' })
      const result = await downloadInvoice(order.id, order.order_number)
      
      if (result.success) {
        toast.success('Invoice downloaded successfully!', { id: 'invoice' })
      } else {
        toast.error('Failed to download invoice', { id: 'invoice' })
      }
    } catch (error) {
      console.error('Error downloading invoice:', error)
      toast.error('Failed to download invoice', { id: 'invoice' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
        <p className="text-gray-600">Track and manage your medicine orders</p>
      </div>

      {/* Filter and Refresh */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <button
            onClick={loadOrders}
            className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600 mb-6">
            {statusFilter === 'all' 
              ? "You haven't placed any orders yet."
              : `No ${statusFilter} orders found.`
            }
          </p>
          <a
            href="/customer/medicines"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Browse Medicines
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const StatusIcon = statusIcons[order.status] || Package
            const isExpanded = expandedOrder === order.id
            const progress = getOrderProgress(order.status)

            return (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow"
              >
                {/* Order Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {order.order_number}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Placed on {formatDate(order.created_at)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusColors[order.status]}`}>
                      <StatusIcon className="w-4 h-4 mr-2" />
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>

                  {/* Progress Bar (not shown for cancelled/rejected) */}
                  {order.status !== 'cancelled' && order.status !== 'rejected' && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Order Progress</span>
                        <span className="text-sm font-medium text-gray-900">
                          Step {progress.step} of {progress.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {statusMessages[order.status]}
                      </p>
                    </div>
                  )}

                  {/* Cancellation/Rejection Message */}
                  {(order.status === 'cancelled' || order.status === 'rejected') && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        {statusMessages[order.status]}
                        {order.status === 'cancelled' && order.cancellation_reason && (
                          <span className="block mt-1 font-medium">Reason: {order.cancellation_reason}</span>
                        )}
                        {order.status === 'rejected' && order.rejection_reason && (
                          <span className="block mt-1 font-medium">Reason: {order.rejection_reason}</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Total Items</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {order.items?.length || 0} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Delivery Address</h4>
                    <p className="text-sm text-gray-900">{order.delivery_name}</p>
                    <p className="text-sm text-gray-600">{order.delivery_phone}</p>
                    <p className="text-sm text-gray-600">{order.delivery_address}</p>
                    {order.delivery_city && (
                      <p className="text-sm text-gray-600">
                        {order.delivery_city}, {order.delivery_state} - {order.delivery_pincode}
                      </p>
                    )}
                  </div>

                  {/* Prescription Info */}
                  {order.requires_prescription && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-900 font-medium">
                            Prescription Required
                          </span>
                        </div>
                        {order.prescription_url && (
                          <a
                            href={order.prescription_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-4 h-4" />
                            View Prescription
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-blue-800 mt-1">
                        {order.prescription_verified 
                          ? '✓ Prescription verified by pharmacist'
                          : 'Prescription verification pending'
                        }
                      </p>
                    </div>
                  )}

                  {/* Order Actions */}
                  <div className="flex gap-2 mb-4">
                    {/* Download Invoice Button - Available for delivered orders */}
                    {order.status === 'delivered' && (
                      <button
                        onClick={() => handleDownloadInvoice(order)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Download Invoice
                      </button>
                    )}

                    {/* Track Delivery Button - Available for dispatched/in-transit orders */}
                    {['dispatched', 'delivered'].includes(order.status) && (
                      <button
                        onClick={() => setTrackingOrder(order.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <MapPin className="w-4 h-4" />
                        Track Delivery
                      </button>
                    )}

                    {/* Reorder Button - Always available for delivered orders */}
                    {order.status === 'delivered' && (
                      <button
                        onClick={() => handleReorder(order)}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reorder
                      </button>
                    )}

                    {/* Cancel Button - Only for pending orders */}
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleCancelOrder(order)}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Ban className="w-4 h-4" />
                        Cancel Order
                      </button>
                    )}

                    {/* Reorder for other statuses (except cancelled/rejected) */}
                    {!['pending', 'delivered', 'cancelled', 'rejected'].includes(order.status) && (
                      <button
                        onClick={() => handleReorder(order)}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reorder Items
                      </button>
                    )}
                  </div>

                  {/* Toggle Details Button */}
                  <button
                    onClick={() => toggleOrderDetails(order.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-5 h-5" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-5 h-5" />
                        View Details
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded Order Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    {/* Order Items */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Order Items</h4>
                      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Medicine
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Quantity
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                Price
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {order.items?.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.medicine_name}
                                    {item.requires_prescription && (
                                      <span className="ml-2 text-xs text-red-600 font-medium">Rx</span>
                                    )}
                                  </div>
                                  {item.batch_number && (
                                    <div className="text-xs text-gray-500">
                                      Batch: {item.batch_number}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-gray-900">
                                  {item.quantity}
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-gray-900">
                                  {formatCurrency(item.unit_price)}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                  {formatCurrency(item.item_total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Pricing Breakdown</h4>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
                          </div>
                          {order.discount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Discount</span>
                              <span className="text-green-600">-{formatCurrency(order.discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">GST</span>
                            <span className="text-gray-900">{formatCurrency(order.gst_amount)}</span>
                          </div>
                          {order.delivery_charge > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Delivery Charge</span>
                              <span className="text-gray-900">{formatCurrency(order.delivery_charge)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                            <span className="text-gray-900">Total</span>
                            <span className="text-indigo-600">{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status History */}
                    {order.status_history && order.status_history.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Order Timeline</h4>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="space-y-3">
                            {order.status_history
                              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                              .map((history, index) => (
                                <div key={history.id} className="flex gap-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">
                                      {history.old_status ? (
                                        <>
                                          Status changed to{' '}
                                          <span className="text-indigo-600">
                                            {history.new_status}
                                          </span>
                                        </>
                                      ) : (
                                        <>Order created</>
                                      )}
                                    </p>
                                    {history.notes && (
                                      <p className="text-sm text-gray-600 mt-1">{history.notes}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                      {formatDate(history.created_at)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && cancellingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Cancel Order
                </h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to cancel order {cancellingOrder.order_number}?
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Please tell us why you're cancelling this order..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancellingOrder(null)
                  setCancelReason('')
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={confirmCancelOrder}
                disabled={actionLoading || !cancelReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Tracking Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Track Delivery</h3>
                  <p className="text-sm text-gray-500">Real-time delivery tracking</p>
                </div>
              </div>
              <button
                onClick={() => setTrackingOrder(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Tracking Content */}
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <DeliveryTracking orderId={trackingOrder} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyOrdersPage
