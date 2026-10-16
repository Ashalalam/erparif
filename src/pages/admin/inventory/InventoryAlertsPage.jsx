import React, { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { 
  AlertTriangle, Package, Clock, TrendingDown, 
  Calendar, MapPin, DollarSign, RefreshCw, Filter 
} from 'lucide-react'

const InventoryAlertsPage = () => {
  const [lowStockItems, setLowStockItems] = useState([])
  const [expiringBatches, setExpiringBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('low-stock') // 'low-stock' | 'expiry'
  const [expiryFilter, setExpiryFilter] = useState(90) // days ahead

  useEffect(() => {
    loadData()
  }, [expiryFilter])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load low-stock medicines
      const { data: lowStock, error: lowStockError } = await supabase
        .rpc('get_low_stock_medicines')

      if (lowStockError) {
        console.error('Error loading low-stock medicines:', lowStockError)
      } else {
        setLowStockItems(lowStock || [])
      }

      // Load expiring batches
      const { data: expiring, error: expiringError } = await supabase
        .rpc('get_expiring_batches', { p_days_ahead: expiryFilter })

      if (expiringError) {
        console.error('Error loading expiring batches:', expiringError)
      } else {
        setExpiringBatches(expiring || [])
      }
    } catch (error) {
      console.error('Error loading inventory alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getExpiryBadgeColor = (status) => {
    switch (status) {
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'critical':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approaching':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
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
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory alerts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Alerts</h1>
            <p className="text-gray-600">Monitor low stock and expiring medicines</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired Batches</p>
              <p className="text-2xl font-bold text-red-600">
                {expiringBatches.filter(b => b.expiry_status === 'expired').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical (≤30 days)</p>
              <p className="text-2xl font-bold text-orange-600">
                {expiringBatches.filter(b => b.expiry_status === 'critical').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Warning (≤60 days)</p>
              <p className="text-2xl font-bold text-yellow-600">
                {expiringBatches.filter(b => b.expiry_status === 'warning').length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('low-stock')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'low-stock'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Low Stock ({lowStockItems.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('expiry')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'expiry'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Expiring Batches ({expiringBatches.length})
              </div>
            </button>
          </div>
        </div>

        {/* Low Stock Tab */}
        {activeTab === 'low-stock' && (
          <div className="p-6">
            {lowStockItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Low Stock Items
                </h3>
                <p className="text-gray-600">
                  All medicines are above their low stock threshold
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Medicine
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Threshold
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batches
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Oldest Expiry
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lowStockItems.map((item) => (
                      <tr key={item.medicine_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.medicine_name}
                          </div>
                          {item.generic_name && (
                            <div className="text-sm text-gray-500">
                              {item.generic_name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.category || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`text-sm font-semibold ${
                            item.total_current_stock === 0 
                              ? 'text-red-600' 
                              : 'text-orange-600'
                          }`}>
                            {item.total_current_stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          {item.low_stock_threshold}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          {item.batch_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.oldest_expiry ? formatDate(item.oldest_expiry) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {item.total_current_stock === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Out of Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Low Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Expiring Batches Tab */}
        {activeTab === 'expiry' && (
          <div>
            {/* Filter */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Show batches expiring within:
                </label>
                <select
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                </select>
              </div>
            </div>

            <div className="p-6">
              {expiringBatches.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Expiring Batches
                  </h3>
                  <p className="text-gray-600">
                    No batches expiring within the selected period
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Medicine
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Batch Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expiry Date
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Days Left
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value (MRP)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {expiringBatches.map((batch) => (
                        <tr key={batch.batch_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {batch.medicine_name}
                            </div>
                            {batch.generic_name && (
                              <div className="text-sm text-gray-500">
                                {batch.generic_name}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {batch.batch_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(batch.expiry_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`text-sm font-semibold ${
                              batch.days_until_expiry < 0 
                                ? 'text-red-600'
                                : batch.days_until_expiry <= 30
                                ? 'text-orange-600'
                                : 'text-yellow-600'
                            }`}>
                              {batch.days_until_expiry < 0 
                                ? `${Math.abs(batch.days_until_expiry)} days ago`
                                : `${batch.days_until_expiry} days`
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                            {batch.current_quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {formatCurrency(batch.mrp * batch.current_quantity)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {batch.rack_location || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getExpiryBadgeColor(batch.expiry_status)}`}>
                              {batch.expiry_status === 'expired' && '❌ Expired'}
                              {batch.expiry_status === 'critical' && '🔴 Critical'}
                              {batch.expiry_status === 'warning' && '🟡 Warning'}
                              {batch.expiry_status === 'approaching' && '🔵 Approaching'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InventoryAlertsPage
