import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import { 
  Package, Eye, CheckCircle, XCircle, Clock, Truck, 
  Search, Filter, Download, Calendar 
} from 'lucide-react'

const CustomerOrdersPage = () => {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    dispatched: 'bg-orange-100 text-orange-800',
    delivered: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800'
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

  useEffect(() => {
    loadOrders()
  }, [statusFilter, dateFilter])

  const loadOrders = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('customer_orders')
        .select(`
          *,
          customer:profiles!customer_id(id, full_name, email, phone),
          items:customer_order_items(
            id, 
            medicine_name, 
            batch_number, 
            quantity, 
            unit_price,
            discount_percent,
            discount_amount,
            gst_percentage,
            gst_amount,
            item_total,
            requires_prescription
          )
        `)
        .order('created_at', { ascending: false })

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Apply date filter
      if (dateFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        query = query.gte('created_at', today.toISOString())
      } else if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('created_at', monthAgo.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      console.log('📦 Loaded orders:', data)
      setOrders(data || [])
    } catch (error) {
      console.error('❌ Error loading orders:', error)
      alert('Failed to load orders: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId, newStatus, notes = '') => {
    try {
      const { error } = await supabase
        .from('customer_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      // Add note to status history if provided
      if (notes) {
        await supabase
          .from('order_status_history')
          .insert({
            order_id: orderId,
            old_status: selectedOrder.status,
            new_status: newStatus,
            changed_by: user.id,
            notes: notes
          })
      }

      alert('Order status updated successfully!')
      await loadOrders()
      
      // Reload order details if viewing
      if (selectedOrder?.id === orderId) {
        await loadOrderDetails(orderId)
      }
    } catch (error) {
      console.error('❌ Error updating status:', error)
      alert('Failed to update status: ' + error.message)
    }
  }

  const loadOrderDetails = async (orderId) => {
    try {
      const { data, error } = await supabase
        .from('customer_orders')
        .select(`
          *,
          customer:profiles!customer_id(id, full_name, email, phone),
          items:customer_order_items(*),
          status_history:order_status_history(
            *,
            changed_by_user:profiles!changed_by(full_name, email)
          ),
          reservations:stock_reservations(
            *,
            batch:medicine_batches(batch_number, expiry_date)
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error

      console.log('📋 Order details:', data)
      setSelectedOrder(data)
      setShowOrderDetails(true)
    } catch (error) {
      console.error('❌ Error loading order details:', error)
      alert('Failed to load order details: ' + error.message)
    }
  }

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.customer?.full_name?.toLowerCase().includes(query) ||
      order.customer?.email?.toLowerCase().includes(query) ||
      order.delivery_name?.toLowerCase().includes(query)
    )
  })

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Customer Orders</h1>
        <p className="text-gray-600">Manage and fulfill customer orders</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Orders Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
            </div>
            <Package className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => o.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {orders.filter(o => ['approved', 'processing', 'dispatched'].includes(o.status)).length}
              </p>
            </div>
            <Truck className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-green-600">
                {orders.filter(o => o.status === 'delivered').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const StatusIcon = statusIcons[order.status] || Package
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.order_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.customer?.full_name || order.delivery_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.customer?.email || order.delivery_phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.items?.length || 0} items
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(order.total)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => loadOrderDetails(order.id)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setShowOrderDetails(false)
            setSelectedOrder(null)
          }}
          onStatusUpdate={updateOrderStatus}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          statusColors={statusColors}
          statusIcons={statusIcons}
        />
      )}
    </div>
  )
}

// Order Details Modal Component
const OrderDetailsModal = ({ 
  order, 
  onClose, 
  onStatusUpdate, 
  formatCurrency, 
  formatDate,
  statusColors,
  statusIcons 
}) => {
  const [newStatus, setNewStatus] = useState(order.status)
  const [notes, setNotes] = useState('')
  const StatusIcon = statusIcons[order.status] || Package

  const handleStatusUpdate = () => {
    if (newStatus === order.status) {
      alert('Please select a different status')
      return
    }
    onStatusUpdate(order.id, newStatus, notes)
    setNotes('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
            <p className="text-sm text-gray-600">{order.order_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Status</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
              <StatusIcon className="w-4 h-4 mr-2" />
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>

          {/* Customer Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-medium text-gray-900">{order.customer?.full_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{order.customer?.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{order.customer?.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Delivery Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Delivery Name</p>
                <p className="font-medium text-gray-900">{order.delivery_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Delivery Phone</p>
                <p className="font-medium text-gray-900">{order.delivery_phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Delivery Address</p>
                <p className="font-medium text-gray-900">{order.delivery_address}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Order Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Medicine</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Batch</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Discount</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">GST</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm">
                        {item.medicine_name}
                        {item.requires_prescription && (
                          <span className="ml-2 text-xs text-red-600">Rx</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{item.batch_number || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-2 text-sm text-right">
                        {item.discount_percent}% ({formatCurrency(item.discount_amount)})
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {item.gst_percentage}% ({formatCurrency(item.gst_amount)})
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(item.item_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-medium text-green-600">-{formatCurrency(order.discount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST</span>
                <span className="font-medium">{formatCurrency(order.gst_amount)}</span>
              </div>
              {order.delivery_charge > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Charge</span>
                  <span className="font-medium">{formatCurrency(order.delivery_charge)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total Amount</span>
                <span className="font-bold text-lg text-gray-900">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Prescription */}
          {order.prescription_url && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Prescription</h3>
              <a
                href={order.prescription_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                View Prescription
              </a>
            </div>
          )}

          {/* Status History */}
          {order.status_history && order.status_history.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Status History</h3>
              <div className="space-y-2">
                {order.status_history.map((history, index) => (
                  <div key={index} className="flex items-start text-sm border-l-2 border-gray-300 pl-4 py-2">
                    <div className="flex-1">
                      <p className="text-gray-900">
                        {history.old_status ? (
                          <>
                            <span className="font-medium">{history.old_status}</span>
                            {' → '}
                            <span className="font-medium">{history.new_status}</span>
                          </>
                        ) : (
                          <span className="font-medium">{history.new_status}</span>
                        )}
                      </p>
                      {history.notes && (
                        <p className="text-gray-600 mt-1">{history.notes}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">
                        {formatDate(history.created_at)} by {history.changed_by_user?.full_name || 'System'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Update Status */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Update Order Status</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="processing">Processing</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about this status change..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleStatusUpdate}
                disabled={newStatus === order.status}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerOrdersPage
