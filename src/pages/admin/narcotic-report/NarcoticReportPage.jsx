import React, { useState, useEffect } from 'react'
import { Search, Download, Filter, AlertTriangle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const NarcoticReportPage = () => {
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [scheduleFilter, setScheduleFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchNarcoticSales()
  }, [])

  const fetchNarcoticSales = async () => {
    try {
      setLoading(true)
      
      // Fetch narcotic sales log with related data
      const { data, error } = await supabase
        .from('narcotic_sales_log')
        .select(`
          *,
          sale:sales(invoice_number),
          medicine:medicines(name, generic_name),
          batch:medicine_batches(batch_number, expiry_date),
          prescription:prescriptions(prescription_number, prescription_date)
        `)
        .order('sale_date', { ascending: false })

      if (error) throw error

      // Transform data to match expected format
      const transformedData = (data || []).map(item => ({
        id: item.id,
        sale_date: item.sale_date,
        invoice_number: item.sale?.invoice_number,
        medicine_name: item.medicine?.name,
        generic_name: item.medicine?.generic_name,
        drug_schedule: item.drug_schedule,
        quantity: item.quantity,
        batch_number: item.batch?.batch_number,
        expiry_date: item.batch?.expiry_date,
        customer_name: item.customer_name,
        customer_phone: item.customer_phone,
        doctor_name: item.doctor_name,
        doctor_registration: item.doctor_registration,
        prescription_number: item.prescription?.prescription_number,
        prescription_date: item.prescription?.prescription_date,
        dispensed_by_email: null // We'll skip user email for simplicity
      }))

      setSales(transformedData)
    } catch (error) {
      console.error('Error fetching narcotic sales:', error)
      toast.error('Failed to load narcotic sales report')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    const filteredData = getFilteredSales()
    
    const csvContent = [
      ['Date', 'Invoice', 'Medicine', 'Schedule', 'Qty', 'Batch', 'Expiry', 'Customer', 'Phone', 'Doctor', 'Registration', 'Rx Number', 'Dispensed By'].join(','),
      ...filteredData.map(sale => [
        new Date(sale.sale_date).toLocaleDateString(),
        sale.invoice_number,
        `"${sale.medicine_name}"`,
        sale.drug_schedule,
        sale.quantity,
        sale.batch_number,
        new Date(sale.expiry_date).toLocaleDateString(),
        `"${sale.customer_name || 'N/A'}"`,
        sale.customer_phone || 'N/A',
        `"${sale.doctor_name || 'N/A'}"`,
        sale.doctor_registration || 'N/A',
        sale.prescription_number || 'N/A',
        sale.dispensed_by_email || 'N/A'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `narcotic-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    
    toast.success('Report exported')
  }

  const getFilteredSales = () => {
    return sales.filter(sale => {
      const matchesSearch = 
        sale.medicine_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesSchedule = scheduleFilter === 'ALL' || sale.drug_schedule === scheduleFilter
      
      const matchesDateFrom = !dateFrom || new Date(sale.sale_date) >= new Date(dateFrom)
      const matchesDateTo = !dateTo || new Date(sale.sale_date) <= new Date(dateTo)
      
      return matchesSearch && matchesSchedule && matchesDateFrom && matchesDateTo
    })
  }

  const filteredSales = getFilteredSales()

  const getScheduleBadgeColor = (schedule) => {
    switch (schedule) {
      case 'H': return 'bg-yellow-100 text-yellow-800'
      case 'H1': return 'bg-orange-100 text-orange-800'
      case 'X': return 'bg-red-100 text-red-800'
      case 'NARCOTIC': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <AlertTriangle className="h-7 w-7 text-red-600 mr-2" />
            Narcotic & Scheduled Drugs Report
          </h1>
          <p className="text-gray-600">Regulatory compliance log for controlled substances</p>
        </div>
        <button onClick={exportReport} className="btn-primary">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search medicine, customer, doctor, invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule
            </label>
            <select
              value={scheduleFilter}
              onChange={(e) => setScheduleFilter(e.target.value)}
              className="input-field"
            >
              <option value="ALL">All Schedules</option>
              <option value="H">Schedule H</option>
              <option value="H1">Schedule H1</option>
              <option value="X">Schedule X</option>
              <option value="NARCOTIC">Narcotic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field text-sm"
                placeholder="From"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field text-sm"
                placeholder="To"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="text-2xl font-bold text-gray-900">{filteredSales.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Schedule H</p>
          <p className="text-2xl font-bold text-yellow-600">
            {filteredSales.filter(s => s.drug_schedule === 'H').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Schedule H1</p>
          <p className="text-2xl font-bold text-orange-600">
            {filteredSales.filter(s => s.drug_schedule === 'H1').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Narcotics</p>
          <p className="text-2xl font-bold text-red-600">
            {filteredSales.filter(s => s.drug_schedule === 'NARCOTIC').length}
          </p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rx Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-12 text-center text-gray-500">
                      No narcotic sales found
                    </td>
                  </tr>
                ) : (
                  filteredSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {sale.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{sale.medicine_name}</div>
                        <div className="text-xs text-gray-500">{sale.generic_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScheduleBadgeColor(sale.drug_schedule)}`}>
                          {sale.drug_schedule}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-900">
                        {sale.quantity}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{sale.batch_number}</div>
                        <div className="text-xs">Exp: {new Date(sale.expiry_date).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{sale.customer_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{sale.customer_phone || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{sale.doctor_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{sale.doctor_registration || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {sale.prescription_number || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default NarcoticReportPage
