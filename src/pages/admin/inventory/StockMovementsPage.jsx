import React, { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { 
  Package, TrendingUp, TrendingDown, RefreshCw, 
  Filter, Calendar, Search, ChevronLeft, ChevronRight 
} from 'lucide-react'

const StockMovementsPage = () => {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    movementType: 'all',
    medicine: '',
    dateFrom: '',
    dateTo: '',
    searchTerm: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0
  })

  useEffect(() => {
    loadMovements()
  }, [filters, pagination.page])

  const loadMovements = async () => {
    try {
      setLoading(true)

      // Build query
      let query = supabase
        .from('stock_movements_detailed')
        .select('*', { count: 'exact' })

      // Apply filters
      if (filters.movementType !== 'all') {
        query = query.eq('movement_type', filters.movementType)
      }

      if (filters.medicine) {
        query = query.or(`medicine_name.ilike.%${filters.medicine}%,generic_name.ilike.%${filters.medicine}%`)
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
      }

      if (filters.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`)
      }

      if (filters.searchTerm) {
        query = query.or(
          `batch_number.ilike.%${filters.searchTerm}%,` +
          `reference_id::text.ilike.%${filters.searchTerm}%,` +
          `reason.ilike.%${filters.searchTerm}%`
        )
      }

      // Pagination
      const from = (pagination.page - 1) * pagination.pageSize
      const to = from + pagination.pageSize - 1

      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading stock movements:', error)
        throw error
      }

      setMovements(data || [])
      setPagination(prev => ({ ...prev, total: count || 0 }))
    } catch (error) {
      console.error('Error loading stock movements:', error)
      alert('Failed to load stock movements')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const resetFilters = () => {
    setFilters({
      movementType: 'all',
      medicine: '',
      dateFrom: '',
      dateTo: '',
      searchTerm: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const getMovementColor = (type) => {
    switch (type) {
      case 'purchase':
        return 'bg-green-100 text-green-800'
      case 'sale':
        return 'bg-blue-100 text-blue-800'
      case 'return':
        return 'bg-purple-100 text-purple-800'
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800'
      case 'damage':
        return 'bg-red-100 text-red-800'
      case 'expiry':
        return 'bg-orange-100 text-orange-800'
      case 'free':
        return 'bg-pink-100 text-pink-800'
      case 'transfer':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getMovementIcon = (type) => {
    switch (type) {
      case 'purchase':
      case 'return':
        return <TrendingUp className="w-4 h-4" />
      case 'sale':
      case 'damage':
      case 'expiry':
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalPages = Math.ceil(pagination.total / pagination.pageSize)

  if (loading && movements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stock movements...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Stock Movement History</h1>
            <p className="text-gray-600">Track all inventory transactions</p>
          </div>
          <button
            onClick={loadMovements}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Movement Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Movement Type
            </label>
            <select
              value={filters.movementType}
              onChange={(e) => handleFilterChange('movementType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="sale">Sale</option>
              <option value="return">Return</option>
              <option value="adjustment">Adjustment</option>
              <option value="damage">Damage</option>
              <option value="expiry">Expiry</option>
              <option value="free">Free</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          {/* Medicine Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medicine Name
            </label>
            <input
              type="text"
              value={filters.medicine}
              onChange={(e) => handleFilterChange('medicine', e.target.value)}
              placeholder="Search medicine..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Search Term */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Batch, Reference ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Reset Filters */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={resetFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold">{movements.length}</span> of{' '}
          <span className="font-semibold">{pagination.total}</span> movements
        </p>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {movements.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Stock Movements Found
            </h3>
            <p className="text-gray-600">
              {Object.values(filters).some(v => v && v !== 'all')
                ? 'Try adjusting your filters'
                : 'No stock movements recorded yet'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medicine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(movement.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementColor(movement.movement_type)}`}>
                        {getMovementIcon(movement.movement_type)}
                        {movement.movement_display}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {movement.medicine_name}
                      </div>
                      {movement.generic_name && (
                        <div className="text-sm text-gray-500">
                          {movement.generic_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.batch_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-semibold ${
                        ['purchase', 'return'].includes(movement.movement_type)
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {['purchase', 'return'].includes(movement.movement_type) ? '+' : '-'}
                        {movement.quantity}
                        {movement.free_quantity > 0 && (
                          <span className="text-xs text-gray-500 ml-1">
                            (+{movement.free_quantity} free)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.reference_type && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {movement.reference_type}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {movement.reason || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.created_by_name || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.pageSize && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                disabled={pagination.page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{pagination.page}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                    disabled={pagination.page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StockMovementsPage
