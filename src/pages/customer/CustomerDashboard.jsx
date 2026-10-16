import React from 'react'
import { Link } from 'react-router-dom'
import { Package, ShoppingCart, List, User, ArrowRight } from 'lucide-react'
import useAuthStore from '../../store/authStore'

const CustomerDashboard = () => {
  const { profile } = useAuthStore()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Customer'}!
        </h1>
        <p className="mt-2 text-gray-600">Order medicines easily and track your orders</p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Link
          to="/customer/medicines"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Browse Medicines</h3>
          <p className="text-sm text-gray-600">Search and order from our complete catalog</p>
        </Link>

        <Link
          to="/customer/cart"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">My Cart</h3>
          <p className="text-sm text-gray-600">Review and checkout your selected items</p>
        </Link>

        <Link
          to="/customer/orders"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <List className="w-6 h-6 text-orange-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">My Orders</h3>
          <p className="text-sm text-gray-600">Track your order status and history</p>
        </Link>

        <Link
          to="/customer/profile"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">My Profile</h3>
          <p className="text-sm text-gray-600">Manage your account and delivery address</p>
        </Link>
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Order</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-semibold text-gray-900">Browse & Select</h3>
            </div>
            <p className="text-sm text-gray-700 ml-11">
              Search for medicines and add them to your cart
            </p>
          </div>

          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-semibold text-gray-900">Review & Checkout</h3>
            </div>
            <p className="text-sm text-gray-700 ml-11">
              Enter delivery details and upload prescription if required
            </p>
          </div>

          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-semibold text-gray-900">Track & Receive</h3>
            </div>
            <p className="text-sm text-gray-700 ml-11">
              Track your order status and receive at your doorstep
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Verified Medicines</h3>
          <p className="text-sm text-gray-600">All medicines are genuine and verified</p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Fast Delivery</h3>
          <p className="text-sm text-gray-600">Quick processing and delivery</p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Secure & Safe</h3>
          <p className="text-sm text-gray-600">Your data and orders are secure</p>
        </div>
      </div>
    </div>
  )
}

export default CustomerDashboard
