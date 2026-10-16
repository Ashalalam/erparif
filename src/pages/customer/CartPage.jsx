import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, AlertCircle, Package, FileText } from 'lucide-react'
import useCartStore from '../../store/cartStore'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const CartPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    items,
    updateItemQuantity,
    removeItem,
    getSubtotal,
    getGST,
    getGrandTotal,
    clearCart
  } = useCartStore()

  const [updating, setUpdating] = useState(false)

  const handleQuantityChange = async (item, newQuantity) => {
    if (newQuantity < 1) {
      toast.error('Quantity must be at least 1')
      return
    }

    if (newQuantity > item.batch.current_quantity) {
      toast.error(`Only ${item.batch.current_quantity} units available`)
      return
    }

    await updateItemQuantity(item.id, newQuantity, 0, user?.id)
  }

  const handleRemoveItem = async (item) => {
    await removeItem(item.id, user?.id)
    toast.success(`${item.medicine.name} removed from cart`)
  }

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      await clearCart(user?.id)
      toast.success('Cart cleared')
    }
  }

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    // Check if any items require prescription
    const requiresPrescription = items.some(item => item.medicine.prescription_required)

    if (requiresPrescription) {
      navigate('/customer/checkout?prescription=required')
    } else {
      navigate('/customer/checkout')
    }
  }

  const subtotal = getSubtotal()
  const gst = getGST()
  const grandTotal = getGrandTotal()

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-gray-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some medicines to get started</p>
          <Link
            to="/customer/medicines"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Medicines
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>
    )
  }

  // Check if any items require prescription
  const requiresPrescription = items.some(item => item.medicine.prescription_required)
  const prescriptionItems = items.filter(item => item.medicine.prescription_required)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="mt-2 text-gray-600">
            {items.length} item{items.length !== 1 ? 's' : ''} in your cart
          </p>
        </div>
        
        {items.length > 0 && (
          <button
            onClick={handleClearCart}
            className="text-red-600 hover:text-red-700 font-medium text-sm"
          >
            Clear Cart
          </button>
        )}
      </div>

      {/* Prescription Notice */}
      {requiresPrescription && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start space-x-3">
          <FileText className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-orange-900">Prescription Required</p>
            <p className="text-sm text-orange-800 mt-1">
              {prescriptionItems.length} item{prescriptionItems.length !== 1 ? 's' : ''} in your cart require{prescriptionItems.length === 1 ? 's' : ''} a valid prescription.
              You'll need to upload your prescription during checkout.
            </p>
            <div className="mt-2">
              <p className="text-xs text-orange-700 font-medium">Prescription items:</p>
              <ul className="text-xs text-orange-700 list-disc list-inside mt-1">
                {prescriptionItems.map(item => (
                  <li key={item.id}>{item.medicine.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start space-x-4">
                {/* Medicine Icon */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Package className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                {/* Medicine Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.medicine.name}
                      </h3>
                      {item.medicine.generic_name && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.medicine.generic_name}
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleRemoveItem(item)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-1">
                    {item.medicine.manufacturer && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Manufacturer:</span> {item.medicine.manufacturer}
                      </p>
                    )}
                    {item.medicine.strength && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Strength:</span> {item.medicine.strength}
                      </p>
                    )}
                    {item.batch.batch_number && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Batch:</span> {item.batch.batch_number}
                      </p>
                    )}
                    {item.batch.expiry_date && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Expiry:</span>{' '}
                        {new Date(item.batch.expiry_date).toLocaleDateString('en-IN', {
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    )}
                  </div>

                  {/* Prescription Badge */}
                  {item.medicine.prescription_required && (
                    <div className="mt-3">
                      <span className="inline-flex items-center space-x-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        <FileText className="w-3 h-3" />
                        <span>Prescription Required</span>
                      </span>
                    </div>
                  )}

                  {/* Price and Quantity */}
                  <div className="mt-4 flex items-center justify-between">
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">Quantity:</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuantityChange(item, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="p-1 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        
                        <input
                          type="number"
                          min="1"
                          max={item.batch.current_quantity}
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 1)}
                          className="w-16 text-center px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        
                        <button
                          onClick={() => handleQuantityChange(item, item.quantity + 1)}
                          disabled={item.quantity >= item.batch.current_quantity}
                          className="p-1 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <span className="text-xs text-gray-500">
                        (Max: {item.batch.current_quantity})
                      </span>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        ₹{item.price.toFixed(2)} × {item.quantity}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-4 pb-4 border-b">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">₹{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST</span>
                <span className="font-medium text-gray-900">₹{gst.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between mb-6 pb-6 border-b">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-blue-600">₹{grandTotal.toFixed(2)}</span>
            </div>

            <button
              onClick={handleProceedToCheckout}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <Link
              to="/customer/medicines"
              className="mt-3 w-full block text-center text-blue-600 hover:text-blue-700 font-medium py-3"
            >
              Continue Shopping
            </Link>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>All prices are inclusive of GST</span>
                </div>
                {requiresPrescription && (
                  <div className="flex items-start space-x-2">
                    <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Prescription upload required at checkout</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
