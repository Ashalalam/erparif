import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Pill, 
  Package, 
  ShoppingCart, 
  Receipt, 
  ShoppingBag,
  Users, 
  Truck, 
  UserCheck, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  DollarSign,
  FileText,
  AlertTriangle
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logo, setLogo] = useState(null)
  const [pharmacyName, setPharmacyName] = useState('BillSprout ERP')
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('logo_url, pharmacy_name')
        .limit(1)
        .single()

      if (!error && data) {
        if (data.logo_url) setLogo(data.logo_url)
        if (data.pharmacy_name) setPharmacyName(data.pharmacy_name)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'POS', href: '/admin/pos', icon: ShoppingCart },
    { name: 'Medicines', href: '/admin/medicines', icon: Pill },
    { name: 'Inventory', href: '/admin/inventory', icon: Package },
    { name: 'Inventory Alerts', href: '/admin/inventory-alerts', icon: AlertTriangle },
    { name: 'Stock Movements', href: '/admin/stock-movements', icon: Package },
    { name: 'Purchases', href: '/admin/purchases', icon: ShoppingBag },
    { name: 'Sales', href: '/admin/sales', icon: Receipt },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Customer Orders', href: '/admin/customer-orders', icon: Package },
    { name: 'Customer Ledger', href: '/admin/ledger', icon: DollarSign },
    { name: 'Supplier Ledger', href: '/admin/supplier-ledger', icon: Truck },
    { name: 'Prescriptions', href: '/admin/prescriptions', icon: FileText },
    { name: 'Narcotic Report', href: '/admin/narcotic-report', icon: AlertTriangle },
    { name: 'Wholesalers', href: '/admin/wholesalers', icon: Truck },
    { name: 'Users', href: '/admin/users', icon: UserCheck },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ]

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
      toast.success('Logged out successfully')
    } catch (error) {
      toast.error('Error logging out')
    }
  }

  const isActive = (href) => {
    if (href === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 bg-primary-600">
          <div className="flex items-center space-x-2">
            {/* Fixed LifeSprout Care Logo */}
            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1">
              <img 
                src="/assets/lifesprout-logo.png" 
                alt="LifeSprout Care" 
                className="h-full w-full object-contain"
              />
            </div>
            {/* Editable Business Logo (from settings) */}
            {logo && (
              <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center overflow-hidden p-0.5">
                <img src={logo} alt="Business Logo" className="h-full w-full object-contain" />
              </div>
            )}
            <span className="ml-2 text-lg font-semibold text-white truncate">{pharmacyName}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-primary-700 p-1 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-5 px-2">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 border-r-3 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 ${
                      isActive(item.href) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {profile?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 uppercase">
                {profile?.role || 'Admin'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-2 text-gray-400 hover:text-gray-600 p-1 rounded"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-2 rounded-md"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Search */}
            <div className="flex-1 max-w-lg mx-4 lg:mx-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search medicines, customers..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 relative">
                <Bell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>

              {/* Profile */}
              <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {profile?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default AdminLayout