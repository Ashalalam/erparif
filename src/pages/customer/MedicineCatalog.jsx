import React, { useState, useEffect } from 'react'
import { Search, Filter, ShoppingCart, AlertCircle, Package, FileText, Plus, Minus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import useCartStore from '../../store/cartStore'
import useAuthStore from '../../store/authStore'

const MedicineCatalog = () => {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [prescriptionFilter, setPrescriptionFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [categories, setCategories] = useState([])
  const [quantities, setQuantities] = useState({}) // Track quantity per medicine
  
  const { addItem } = useCartStore()
  const { user } = useAuthStore()

  console.log('🎯 MedicineCatalog component mounted/rendered')

  useEffect(() => {
    console.log('🚀 MedicineCatalog useEffect triggered - calling loadAllMedicines')
    loadAllMedicines()
    fetchCategories()
  }, [])

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchMedicines()
    } else if (searchTerm.length === 0) {
      loadAllMedicines()
    }
  }, [searchTerm])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('medicines')
        .select('category')
        .eq('status', 'active')
        .not('category', 'is', null)

      if (error) throw error

      const uniqueCategories = [...new Set(data.map(m => m.category).filter(Boolean))]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Load all medicines - exactly like POS does
  const loadAllMedicines = async () => {
    console.log('🔄 Customer Catalog: Loading medicines...')
    setLoading(true)
    try {
      // Step 1: Get all active medicines (same as POS)
      const { data: medicineData, error: medError } = await supabase
        .from('medicines')
        .select('*')
        .eq('status', 'active')
        .order('name')

      console.log('📊 Medicines query result:', { count: medicineData?.length, error: medError?.message })
      
      if (medError) throw medError
      if (!medicineData || medicineData.length === 0) {
        console.log('⚠️ No medicines found in database')
        setMedicines([])
        setLoading(false)
        return
      }

      console.log(`✅ Loaded ${medicineData.length} medicines, fetching batches...`)

      // Step 2: Get batches for ALL medicines (including expired and zero quantity)
      const medicineIds = medicineData.map(m => m.id)
      const { data: batchData, error: batchError } = await supabase
        .from('medicine_batches')
        .select('*')
        .in('medicine_id', medicineIds)
        .order('expiry_date', { ascending: true })

      console.log('📦 Batches query result:', { count: batchData?.length, error: batchError?.message })

      if (batchError) throw batchError

      // Step 3: Calculate available stock for each medicine (non-expired, quantity > 0)
      const medicinesWithStock = medicineData.map(medicine => {
        const allBatches = batchData?.filter(b => b.medicine_id === medicine.id) || []
        const availableBatches = allBatches.filter(b => 
          b.current_quantity > 0 && 
          new Date(b.expiry_date) >= new Date()
        )
        
        const totalStock = availableBatches.reduce((sum, b) => sum + b.current_quantity, 0)
        
        // Get price range from available batches
        const prices = availableBatches.map(b => b.selling_price).filter(p => p != null)
        const minPrice = prices.length > 0 ? Math.min(...prices) : null
        const maxPrice = prices.length > 0 ? Math.max(...prices) : null

        return {
          ...medicine,
          medicine_batches: availableBatches,
          all_batches: allBatches,
          total_stock: totalStock,
          available_stock: totalStock,
          in_stock: totalStock > 0,
          min_price: minPrice,
          max_price: maxPrice
        }
      })

      // Show ALL medicines, not just in-stock ones
      setMedicines(medicinesWithStock)
      console.log(`✅ Processed medicines:`, {
        total: medicinesWithStock.length,
        inStock: medicinesWithStock.filter(m => m.in_stock).length,
        outOfStock: medicinesWithStock.filter(m => !m.in_stock).length
      })
    } catch (error) {
      console.error('❌ Error loading medicines:', error)
      toast.error('Error loading medicines')
    } finally {
      setLoading(false)
      console.log('✅ Loading complete')
    }
  }

  // Search medicines - exactly like POS does
  const searchMedicines = async () => {
    setLoading(true)
    try {
      const { data: medicineData, error: medError } = await supabase
        .from('medicines')
        .select('*')
        .eq('status', 'active')
        .or(`name.ilike.%${searchTerm}%,generic_name.ilike.%${searchTerm}%`)
        .order('name')

      if (medError) throw medError
      if (!medicineData || medicineData.length === 0) {
        setMedicines([])
        setLoading(false)
        return
      }

      const medicineIds = medicineData.map(m => m.id)
      const { data: batchData, error: batchError } = await supabase
        .from('medicine_batches')
        .select('*')
        .in('medicine_id', medicineIds)
        .order('expiry_date', { ascending: true })

      if (batchError) throw batchError

      const medicinesWithStock = medicineData.map(medicine => {
        const allBatches = batchData?.filter(b => b.medicine_id === medicine.id) || []
        const availableBatches = allBatches.filter(b => 
          b.current_quantity > 0 && 
          new Date(b.expiry_date) >= new Date()
        )
        
        const totalStock = availableBatches.reduce((sum, b) => sum + b.current_quantity, 0)
        
        const prices = availableBatches.map(b => b.selling_price).filter(p => p != null)
        const minPrice = prices.length > 0 ? Math.min(...prices) : null
        const maxPrice = prices.length > 0 ? Math.max(...prices) : null

        return {
          ...medicine,
          medicine_batches: availableBatches,
          all_batches: allBatches,
          total_stock: totalStock,
          available_stock: totalStock,
          in_stock: totalStock > 0,
          min_price: minPrice,
          max_price: maxPrice
        }
      })

      setMedicines(medicinesWithStock)
    } catch (error) {
      console.error('Error searching medicines:', error)
      toast.error('Error searching medicines')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (medicine) => {
    const quantity = quantities[medicine.id] || 1

    if (!medicine.in_stock || medicine.available_stock === 0) {
      toast.error('This medicine is out of stock')
      return
    }

    if (quantity > medicine.available_stock) {
      toast.error(`Only ${medicine.available_stock} units available`)
      return
    }

    if (medicine.medicine_batches && medicine.medicine_batches.length > 0) {
      // Use the batch with earliest expiry (same as POS)
      const batch = medicine.medicine_batches[0]
      
      if (batch.current_quantity < quantity) {
        toast.error('Insufficient stock')
        return
      }

      addItem(medicine, batch, quantity, 0, user?.id)
      toast.success(`${quantity} x ${medicine.name} added to cart`)
      
      // Reset quantity for this medicine
      setQuantities(prev => ({ ...prev, [medicine.id]: 1 }))
    } else {
      toast.error('No stock available for this medicine')
    }
  }

  const updateQuantity = (medicineId, change) => {
    const medicine = medicines.find(m => m.id === medicineId)
    if (!medicine) return

    const currentQty = quantities[medicineId] || 1
    const newQty = Math.max(1, Math.min(currentQty + change, medicine.available_stock))
    
    setQuantities(prev => ({ ...prev, [medicineId]: newQty }))
  }

  const setQuantityDirect = (medicineId, value) => {
    const medicine = medicines.find(m => m.id === medicineId)
    if (!medicine) return

    const qty = parseInt(value) || 1
    const newQty = Math.max(1, Math.min(qty, medicine.available_stock))
    
    setQuantities(prev => ({ ...prev, [medicineId]: newQty }))
  }

  // Filter medicines
  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (medicine.generic_name && medicine.generic_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = categoryFilter === 'all' || medicine.category === categoryFilter
    
    const matchesPrescription = prescriptionFilter === 'all' ||
                               (prescriptionFilter === 'rx' && medicine.prescription_required) ||
                               (prescriptionFilter === 'otc' && !medicine.prescription_required)

    const matchesStock = stockFilter === 'all' ||
                        (stockFilter === 'in_stock' && medicine.in_stock) ||
                        (stockFilter === 'out_of_stock' && !medicine.in_stock)

    return matchesSearch && matchesCategory && matchesPrescription && matchesStock
  })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Medicine Catalog</h1>
        <p className="mt-2 text-gray-600">Browse and order from our complete range of medicines</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search medicines by name or generic name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Prescription Filter */}
          <div>
            <select
              value={prescriptionFilter}
              onChange={(e) => setPrescriptionFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Medicines</option>
              <option value="otc">OTC (No Prescription)</option>
              <option value="rx">Prescription Required</option>
            </select>
          </div>
        </div>

        {/* Second row of filters */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Stock Filter */}
          <div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock Only</option>
              <option value="out_of_stock">Out of Stock Only</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredMedicines.length} medicine{filteredMedicines.length !== 1 ? 's' : ''}
          <span className="ml-4">
            ({filteredMedicines.filter(m => m.in_stock).length} in stock, {filteredMedicines.filter(m => !m.in_stock).length} out of stock)
          </span>
        </div>
      </div>

      {/* Medicine Grid */}
      {filteredMedicines.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No medicines found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedicines.map((medicine) => {
            const quantity = quantities[medicine.id] || 1
            const isOutOfStock = !medicine.in_stock || medicine.available_stock === 0
            
            return (
              <div key={medicine.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Medicine Name */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {medicine.name}
                  </h3>

                  {/* Generic Name */}
                  {medicine.generic_name && (
                    <p className="text-sm text-gray-600 mb-2">
                      {medicine.generic_name}
                    </p>
                  )}

                  {/* Details */}
                  <div className="space-y-1 mb-4">
                    {medicine.manufacturer && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Manufacturer:</span> {medicine.manufacturer}
                      </p>
                    )}
                    
                    {medicine.strength && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Strength:</span> {medicine.strength}
                      </p>
                    )}

                    {medicine.dosage_form && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Form:</span> {medicine.dosage_form}
                      </p>
                    )}

                    {medicine.category && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Category:</span> {medicine.category}
                      </p>
                    )}
                  </div>

                  {/* Prescription Badge */}
                  {medicine.prescription_required && (
                    <div className="flex items-center space-x-2 mb-4">
                      <FileText className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        Prescription Required
                      </span>
                    </div>
                  )}

                  {/* Price and Stock */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b">
                    <div>
                      {medicine.min_price ? (
                        <>
                          <div className="text-2xl font-bold text-gray-900">
                            ₹{medicine.min_price.toFixed(2)}
                          </div>
                          {medicine.min_price !== medicine.max_price && medicine.max_price && (
                            <div className="text-xs text-gray-500">
                              - ₹{medicine.max_price.toFixed(2)}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">Price not available</div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-800 border-2 border-red-200">
                          OUT OF STOCK
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            In Stock
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {medicine.available_stock} units
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity Selector (only for in-stock items) */}
                  {!isOutOfStock && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(medicine.id, -1)}
                          disabled={quantity <= 1}
                          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        
                        <input
                          type="number"
                          min="1"
                          max={medicine.available_stock}
                          value={quantity}
                          onChange={(e) => setQuantityDirect(medicine.id, e.target.value)}
                          className="w-20 text-center px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        
                        <button
                          onClick={() => updateQuantity(medicine.id, 1)}
                          disabled={quantity >= medicine.available_stock}
                          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        <span className="text-xs text-gray-500">
                          Max: {medicine.available_stock}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(medicine)}
                    disabled={isOutOfStock}
                    className={`w-full font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                      isOutOfStock
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Important Information</p>
          <p>
            Medicines marked with "Prescription Required" will need a valid prescription to be uploaded during checkout.
            All prices are inclusive of GST. Stock availability is updated in real-time.
          </p>
        </div>
      </div>
    </div>
  )
}

export default MedicineCatalog

