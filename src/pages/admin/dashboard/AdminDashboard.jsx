import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  ShoppingCart,
  Receipt,
  Clock
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '../../../lib/supabase'
import LoadingSpinner from '../../../components/LoadingSpinner'

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [inventoryAlerts, setInventoryAlerts] = useState({
    lowStock: 0,
    expired: 0,
    expiringSoon: 0
  })
  const [dashboardData, setDashboardData] = useState({
    stats: {
      todaySales: 0,
      todayPurchases: 0,
      todayProfit: 0,
      totalMedicines: 0,
      totalStock: 0,
      lowStockMedicines: 0,
      expiringMedicines: 0,
      expiredMedicines: 0,
      totalCustomers: 0,
      totalRetailers: 0,
      totalWholesalers: 0,
      pendingPayments: 0,
      outstandingCredit: 0,
      todayInvoices: 0
    },
    charts: {
      dailySales: [],
      monthlySales: [],
      purchaseVsSales: [],
      topMedicines: [],
      categorySales: []
    }
  })

  useEffect(() => {
    fetchDashboardData()
    fetchInventoryAlerts()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Get today's date range
      const today = new Date()
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

      // Fetch all required data in parallel
      const [
        salesResponse,
        purchasesResponse,
        medicinesResponse,
        batchesResponse,
        customersResponse,
        retailersResponse,
        wholesalersResponse,
        paymentsResponse
      ] = await Promise.all([
        // Today's sales
        supabase
          .from('sales')
          .select('total, created_at')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        
        // Today's purchases
        supabase
          .from('purchases')
          .select('total, created_at')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        
        // Medicines count
        supabase
          .from('medicines')
          .select('id, low_stock_threshold')
          .eq('status', 'active'),
        
        // Stock and expiry data
        supabase
          .from('medicine_batches')
          .select('current_quantity, expiry_date, medicine_id'),
        
        // Customers count
        supabase
          .from('customers')
          .select('id')
          .eq('status', 'active'),
        
        // Retailers count
        supabase
          .from('retailers')
          .select('id')
          .eq('status', 'active'),
        
        // Wholesalers count
        supabase
          .from('wholesalers')
          .select('id')
          .eq('status', 'active'),
        
        // Pending payments
        supabase
          .from('sales')
          .select('due_amount')
          .eq('payment_status', 'pending')
      ])

      // Calculate stats
      const stats = {
        todaySales: salesResponse.data?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0,
        todayPurchases: purchasesResponse.data?.reduce((sum, purchase) => sum + (purchase.total || 0), 0) || 0,
        todayProfit: 0, // Will calculate based on sales - cost
        totalMedicines: medicinesResponse.data?.length || 0,
        totalStock: batchesResponse.data?.reduce((sum, batch) => sum + (batch.current_quantity || 0), 0) || 0,
        lowStockMedicines: 0, // Will calculate based on threshold
        expiringMedicines: 0, // Expiring within 30 days
        expiredMedicines: 0, // Already expired
        totalCustomers: customersResponse.data?.length || 0,
        totalRetailers: retailersResponse.data?.length || 0,
        totalWholesalers: wholesalersResponse.data?.length || 0,
        pendingPayments: paymentsResponse.data?.reduce((sum, payment) => sum + (payment.due_amount || 0), 0) || 0,
        outstandingCredit: 0,
        todayInvoices: salesResponse.data?.length || 0
      }

      // Calculate profit (simplified - would need purchase cost data)
      stats.todayProfit = stats.todaySales * 0.25 // Assume 25% margin

      // Calculate expiry data
      const currentDate = new Date()
      const thirtyDaysFromNow = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000))

      if (batchesResponse.data) {
        batchesResponse.data.forEach(batch => {
          const expiryDate = new Date(batch.expiry_date)
          if (expiryDate < currentDate) {
            stats.expiredMedicines++
          } else if (expiryDate <= thirtyDaysFromNow) {
            stats.expiringMedicines++
          }
        })
      }

      // Generate sample chart data (in production, this would come from real data)
      const charts = {
        dailySales: generateSampleSalesData(),
        monthlySales: generateSampleMonthlyData(),
        purchaseVsSales: generateSampleComparisonData(),
        topMedicines: generateSampleTopMedicines(),
        categorySales: generateSampleCategoryData()
      }

      setDashboardData({ stats, charts })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInventoryAlerts = async () => {
    try {
      // Get low stock count
      const { data: lowStockData } = await supabase
        .rpc('get_low_stock_medicines')

      // Get expiring batches
      const { data: expiringData } = await supabase
        .rpc('get_expiring_batches', { p_days_ahead: 90 })

      setInventoryAlerts({
        lowStock: lowStockData?.length || 0,
        expired: expiringData?.filter(b => b.expiry_status === 'expired').length || 0,
        expiringSoon: expiringData?.filter(b => b.expiry_status === 'critical').length || 0
      })
    } catch (error) {
      console.error('Error fetching inventory alerts:', error)
    }
  }

  // Sample data generators (replace with real data in production)
  const generateSampleSalesData = () => {
    const data = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: Math.floor(Math.random() * 5000) + 2000,
        purchases: Math.floor(Math.random() * 3000) + 1000
      })
    }
    return data
  }

  const generateSampleMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    return months.map(month => ({
      month,
      sales: Math.floor(Math.random() * 50000) + 30000,
      profit: Math.floor(Math.random() * 15000) + 8000
    }))
  }

  const generateSampleComparisonData = () => {
    return [
      { name: 'Mon', purchases: 4000, sales: 2400 },
      { name: 'Tue', purchases: 3000, sales: 1398 },
      { name: 'Wed', purchases: 2000, sales: 9800 },
      { name: 'Thu', purchases: 2780, sales: 3908 },
      { name: 'Fri', purchases: 1890, sales: 4800 },
      { name: 'Sat', purchases: 2390, sales: 3800 },
      { name: 'Sun', purchases: 3490, sales: 4300 }
    ]
  }

  const generateSampleTopMedicines = () => {
    return [
      { name: 'Paracetamol', sales: 150 },
      { name: 'Aspirin', sales: 120 },
      { name: 'Amoxicillin', sales: 100 },
      { name: 'Ibuprofen', sales: 85 },
      { name: 'Metformin', sales: 70 }
    ]
  }

  const generateSampleCategoryData = () => {
    return [
      { name: 'Antibiotics', value: 35, color: '#0088FE' },
      { name: 'Pain Relief', value: 25, color: '#00C49F' },
      { name: 'Diabetes', value: 20, color: '#FFBB28' },
      { name: 'Vitamins', value: 15, color: '#FF8042' },
      { name: 'Others', value: 5, color: '#8884D8' }
    ]
  }

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />
  }

  const StatCard = ({ title, value, icon: Icon, change, changeType = 'positive', bgColor = '', textColor = '', link = '' }) => {
    const content = (
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${textColor || 'text-gray-900'}`}>
              {typeof value === 'number' && title.includes('₹') ? `₹${value.toLocaleString()}` : value.toLocaleString()}
            </p>
            {change && (
              <p className={`text-sm flex items-center mt-1 ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                {changeType === 'positive' ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {change}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full ${bgColor || (changeType === 'positive' ? 'bg-green-100' : 'bg-red-100')}`}>
            <Icon className={`h-6 w-6 ${textColor || (changeType === 'positive' ? 'text-green-600' : 'text-red-600')}`} />
          </div>
        </div>
      </div>
    )

    if (link) {
      return <Link to={link}>{content}</Link>
    }
    return content
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening in your pharmacy today.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary">
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </button>
          <button className="btn-primary">
            View Reports
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Sales"
          value={dashboardData.stats.todaySales}
          icon={DollarSign}
          change="+12.5%"
          changeType="positive"
        />
        <StatCard
          title="Today's Purchases"
          value={dashboardData.stats.todayPurchases}
          icon={ShoppingCart}
          change="+8.2%"
          changeType="positive"
        />
        <StatCard
          title="Today's Profit"
          value={dashboardData.stats.todayProfit}
          icon={TrendingUp}
          change="+15.3%"
          changeType="positive"
        />
        <StatCard
          title="Today's Invoices"
          value={dashboardData.stats.todayInvoices}
          icon={Receipt}
          change="+5"
          changeType="positive"
        />
      </div>

      {/* Inventory Alerts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory Alerts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Low Stock Items"
            value={inventoryAlerts.lowStock}
            icon={TrendingDown}
            changeType="negative"
            bgColor="bg-red-50"
            textColor="text-red-600"
            link="/admin/inventory-alerts"
          />
          <StatCard
            title="Expired Batches"
            value={inventoryAlerts.expired}
            icon={AlertTriangle}
            changeType="negative"
            bgColor="bg-red-50"
            textColor="text-red-600"
            link="/admin/inventory-alerts"
          />
          <StatCard
            title="Expiring Soon (≤30d)"
            value={inventoryAlerts.expiringSoon}
            icon={Clock}
            changeType="negative"
            bgColor="bg-orange-50"
            textColor="text-orange-600"
            link="/admin/inventory-alerts"
          />
          <StatCard
            title="Total Stock Items"
            value={dashboardData.stats.totalStock}
            icon={Package}
            changeType="positive"
            bgColor="bg-blue-50"
            textColor="text-blue-600"
            link="/admin/inventory"
          />
        </div>
      </div>

      {/* Second Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Medicines"
          value={dashboardData.stats.totalMedicines}
          icon={Package}
        />
        <StatCard
          title="Low Stock Items"
          value={dashboardData.stats.lowStockMedicines}
          icon={AlertTriangle}
          changeType="warning"
        />
        <StatCard
          title="Expiring Soon"
          value={dashboardData.stats.expiringMedicines}
          icon={Clock}
          changeType="warning"
        />
        <StatCard
          title="Total Customers"
          value={dashboardData.stats.totalCustomers}
          icon={Users}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.charts.dailySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Purchase vs Sales */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase vs Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.charts.purchaseVsSales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="purchases" fill="#f59e0b" />
              <Bar dataKey="sales" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Medicines */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Medicines</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.charts.topMedicines} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="sales" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Sales */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboardData.charts.categorySales}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dashboardData.charts.categorySales.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alert */}
        <div className="card border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">Low Stock Alert</h4>
              <p className="text-sm text-gray-600">{dashboardData.stats.lowStockMedicines} medicines are running low</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
          <button className="mt-3 text-sm text-yellow-700 hover:text-yellow-800 font-medium">
            View Details →
          </button>
        </div>

        {/* Expiry Alert */}
        <div className="card border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">Expiry Alert</h4>
              <p className="text-sm text-gray-600">{dashboardData.stats.expiringMedicines} medicines expiring soon</p>
            </div>
            <Clock className="h-8 w-8 text-red-500" />
          </div>
          <button className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium">
            View Details →
          </button>
        </div>

        {/* Pending Payments */}
        <div className="card border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">Pending Payments</h4>
              <p className="text-sm text-gray-600">₹{dashboardData.stats.pendingPayments.toLocaleString()} pending</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
          <button className="mt-3 text-sm text-blue-700 hover:text-blue-800 font-medium">
            View Details →
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard