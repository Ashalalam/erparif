import React from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, Package, User, LogOut, Home, List, Bell } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useCartStore from '../../store/cartStore'
import { useCartSync } from '../../hooks/useCartSync'

const CustomerLayout = () => {
  const { user, profile, signOut } = useAuthStore()
  const { getItemsCount } = useCartStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Sync cart with database on auth changes
  useCartSync()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/customer" className="flex items-center space-x-3">
              {/* Fixed LifeSprout Care Logo */}
              <img 
                src="/assets/lifesprout-logo.png" 
                alt="LifeSprout Care" 
                className="h-12 w-auto object-contain"
              />
              <div className="border-l border-gray-300 pl-3">
                <div className="text-lg font-bold text-gray-900">BillSprout</div>
                <div className="text-xs text-gray-500">Smart Pharmacy</div>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-6">
              <Link 
                to="/customer" 
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/customer') && !isActive('/customer/') 
                    ? 'bg-blue-50 text-blue-900' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Home</span>
              </Link>
              
              <Link 
                to="/customer/medicines" 
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/customer/medicines') 
                    ? 'bg-blue-50 text-blue-900' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Package className="w-5 h-5" />
                <span>Medicines</span>
              </Link>
              
              <Link 
                to="/customer/orders" 
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/customer/orders') 
                    ? 'bg-blue-50 text-blue-900' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <List className="w-5 h-5" />
                <span>My Orders</span>
              </Link>
              
              <Link 
                to="/customer/notifications" 
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/customer/notifications') 
                    ? 'bg-blue-50 text-blue-900' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
              </Link>
            </nav>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Cart */}
              <Link 
                to="/customer/cart" 
                className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ShoppingCart className="w-6 h-6" />
                {getItemsCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {getItemsCount()}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              <div className="flex items-center space-x-3 border-l pl-4">
                <Link 
                  to="/customer/profile" 
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <User className="w-5 h-5 text-gray-700" />
                  <span className="hidden md:block text-sm font-medium text-gray-700">
                    {profile?.full_name || user?.email}
                  </span>
                </Link>
                
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t">
          <div className="flex justify-around py-2">
            <Link 
              to="/customer" 
              className={`flex flex-col items-center px-4 py-2 text-xs ${
                isActive('/customer') && !isActive('/customer/') 
                  ? 'text-blue-900' 
                  : 'text-gray-600'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
            
            <Link 
              to="/customer/medicines" 
              className={`flex flex-col items-center px-4 py-2 text-xs ${
                isActive('/customer/medicines') 
                  ? 'text-blue-900' 
                  : 'text-gray-600'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>Medicines</span>
            </Link>
            
            <Link 
              to="/customer/orders" 
              className={`flex flex-col items-center px-4 py-2 text-xs ${
                isActive('/customer/orders') 
                  ? 'text-blue-900' 
                  : 'text-gray-600'
              }`}
            >
              <List className="w-5 h-5" />
              <span>Orders</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>© 2024 BillSprout Smart ERP - LIFESPROUT Care</p>
            <p className="mt-1">
              Need help? Contact:{' '}
              <a href="mailto:support@billsprout.online" className="text-blue-900 hover:underline">
                support@billsprout.online
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default CustomerLayout
