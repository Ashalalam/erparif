import React, { useState, useEffect } from 'react'
import { Search, Download, Plus, X, DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const SupplierLedgerPage = () => {
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState([])
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [ledgerEntries, setLedgerEntries] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentNotes, setPaymentNotes] = useState('')
  const [adjustmentType, setAdjustmentType] = useState('ADJUSTMENT')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentNotes, setAdjustmentNotes] = useState('')

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      
      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('wholesalers')
        .select('*')
        .eq('status', 'active')

      if (suppliersError) throw suppliersError

      // Fetch ledger entries for all suppliers
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('supplier_ledger')
        .select('supplier_id, transaction_type, debit_amount, credit_amount')

      if (ledgerError) {
        console.error('Ledger error:', ledgerError)
        // Continue even if ledger fails
      }

      // Calculate totals for each supplier
      const suppliersWithTotals = suppliersData.map(supplier => {
        const supplierLedger = (ledgerData || []).filter(l => l.supplier_id === supplier.id)
        const total_purchases = supplierLedger
          .filter(l => l.transaction_type === 'PURCHASE')
          .reduce((sum, l) => sum + (l.credit_amount || 0), 0)
        const total_payments = supplierLedger
          .filter(l => l.transaction_type === 'PAYMENT')
          .reduce((sum, l) => sum + (l.debit_amount || 0), 0)
        
        const outstanding_amount = supplier.current_balance || 0
        const credit_limit = supplier.credit_limit || 0
        const payable_status = 
          outstanding_amount > credit_limit ? 'EXCEEDED' :
          outstanding_amount > credit_limit * 0.8 ? 'WARNING' :
          'NORMAL'

        return {
          ...supplier,
          total_purchases,
          total_payments,
          outstanding_amount,
          credit_limit,
          payment_terms: supplier.payment_terms || 0,
          payable_status
        }
      })

      // Sort by outstanding amount
      suppliersWithTotals.sort((a, b) => b.outstanding_amount - a.outstanding_amount)
      
      setSuppliers(suppliersWithTotals)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const fetchLedgerEntries = async (supplierId) => {
    try {
      const { data, error } = await supabase
        .from('supplier_ledger')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('transaction_date', { ascending: false })

      if (error) throw error
      setLedgerEntries(data || [])
    } catch (error) {
      console.error('Error fetching ledger:', error)
      toast.error('Failed to load ledger entries')
    }
  }

  const handleSupplierClick = (supplier) => {
    setSelectedSupplier(supplier)
    fetchLedgerEntries(supplier.id)
  }

  const handleAddPayment = async () => {
    if (!selectedSupplier || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter valid payment amount')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const amount = parseFloat(paymentAmount)

      // Calculate new balance
      const newBalance = selectedSupplier.current_balance - amount

      // Insert payment entry
      const { error: ledgerError } = await supabase
        .from('supplier_ledger')
        .insert({
          supplier_id: selectedSupplier.id,
          transaction_date: new Date(paymentDate).toISOString(),
          transaction_type: 'PAYMENT',
          reference_type: 'PAYMENT',
          debit_amount: amount,
          credit_amount: 0,
          balance: newBalance,
          description: paymentNotes || 'Payment made to supplier',
          payment_method: paymentMethod,
          created_by: user?.id
        })

      if (ledgerError) throw ledgerError

      toast.success('Payment recorded successfully')
      setShowPaymentModal(false)
      setPaymentAmount('')
      setPaymentNotes('')
      
      // Refresh data
      fetchSuppliers()
      fetchLedgerEntries(selectedSupplier.id)
    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error('Failed to record payment')
    }
  }

  const handleAddAdjustment = async () => {
    if (!selectedSupplier || !adjustmentAmount || parseFloat(adjustmentAmount) === 0) {
      toast.error('Please enter valid adjustment amount')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const amount = parseFloat(adjustmentAmount)
      const isDebit = adjustmentType === 'DEBIT_NOTE' || adjustmentType === 'ADJUSTMENT'

      // Calculate new balance
      const newBalance = isDebit 
        ? selectedSupplier.current_balance - amount
        : selectedSupplier.current_balance + amount

      // Insert adjustment entry
      const { error: ledgerError } = await supabase
        .from('supplier_ledger')
        .insert({
          supplier_id: selectedSupplier.id,
          transaction_date: new Date().toISOString(),
          transaction_type: adjustmentType,
          reference_type: adjustmentType,
          debit_amount: isDebit ? amount : 0,
          credit_amount: isDebit ? 0 : amount,
          balance: newBalance,
          description: adjustmentNotes || `${adjustmentType} adjustment`,
          created_by: user?.id
        })

      if (ledgerError) throw ledgerError

      toast.success('Adjustment recorded successfully')
      setShowAdjustmentModal(false)
      setAdjustmentAmount('')
      setAdjustmentNotes('')
      
      // Refresh data
      fetchSuppliers()
      fetchLedgerEntries(selectedSupplier.id)
    } catch (error) {
      console.error('Error recording adjustment:', error)
      toast.error('Failed to record adjustment')
    }
  }

  const exportLedger = () => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier')
      return
    }

    const csvContent = [
      ['Date', 'Type', 'Reference', 'Debit (Paid)', 'Credit (Purchase)', 'Balance', 'Description'].join(','),
      ...ledgerEntries.map(entry => [
        new Date(entry.transaction_date).toLocaleDateString(),
        entry.transaction_type,
        entry.reference_type || '-',
        entry.debit_amount.toFixed(2),
        entry.credit_amount.toFixed(2),
        entry.balance.toFixed(2),
        `"${entry.description || ''}"` 
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `supplier-ledger-${selectedSupplier.business_name}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    
    toast.success('Ledger exported')
  }

  const filteredSuppliers = suppliers.filter(s =>
    s.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.includes(searchTerm)
  )

  const getPayableStatusColor = (status) => {
    switch (status) {
      case 'EXCEEDED': return 'text-red-600 bg-red-50'
      case 'WARNING': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-green-600 bg-green-50'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Ledger</h1>
          <p className="text-gray-600">Track purchases, payments, and outstanding payables to suppliers</p>
        </div>
        {selectedSupplier && (
          <button onClick={exportLedger} className="btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export Ledger
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Payable</p>
              <p className="text-2xl font-bold text-red-600">
                ₹{suppliers.reduce((sum, s) => sum + (s.outstanding_amount || 0), 0).toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{suppliers.reduce((sum, s) => sum + (s.total_purchases || 0), 0).toFixed(2)}
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{suppliers.reduce((sum, s) => sum + (s.total_payments || 0), 0).toFixed(2)}
              </p>
            </div>
            <TrendingDown className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Credit Exceeded</p>
              <p className="text-2xl font-bold text-gray-900">
                {suppliers.filter(s => s.payable_status === 'EXCEEDED').length}
              </p>
            </div>
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Supplier List */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No suppliers found
                </div>
              ) : (
                filteredSuppliers.map(supplier => (
                  <div
                    key={supplier.id}
                    onClick={() => handleSupplierClick(supplier)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSupplier?.id === supplier.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {supplier.business_name}
                        </p>
                        <p className="text-sm text-gray-600">{supplier.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-red-600">
                          ₹{supplier.outstanding_amount?.toFixed(2)}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded ${getPayableStatusColor(supplier.payable_status)}`}>
                          {supplier.payable_status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Ledger Details */}
        <div className="lg:col-span-2">
          {selectedSupplier ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedSupplier.business_name}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedSupplier.phone}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowAdjustmentModal(true)}
                    className="btn-secondary text-sm"
                  >
                    Add Adjustment
                  </button>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="btn-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </button>
                </div>
              </div>

              {/* Account Summary */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Outstanding Payable</p>
                  <p className="text-lg font-bold text-red-600">
                    ₹{selectedSupplier.outstanding_amount?.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Credit Limit</p>
                  <p className="text-lg font-bold text-gray-900">
                    ₹{selectedSupplier.credit_limit?.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Terms</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedSupplier.payment_terms} days
                  </p>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit (Paid)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit (Purchase)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ledgerEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(entry.transaction_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            entry.transaction_type === 'PURCHASE' ? 'bg-blue-100 text-blue-800' :
                            entry.transaction_type === 'PAYMENT' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {entry.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                          {entry.debit_amount > 0 ? `₹${entry.debit_amount.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                          {entry.credit_amount > 0 ? `₹${entry.credit_amount.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          ₹{entry.balance.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a supplier to view ledger details</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier
                </label>
                <p className="text-gray-900 font-medium">
                  {selectedSupplier?.business_name}
                </p>
                <p className="text-sm text-red-600">
                  Payable: ₹{selectedSupplier?.outstanding_amount?.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input-field"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="input-field"
                  rows="3"
                  placeholder="Payment notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayment}
                  className="btn-primary flex-1"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Adjustment</h3>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier
                </label>
                <p className="text-gray-900 font-medium">
                  {selectedSupplier?.business_name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustment Type
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="input-field"
                >
                  <option value="ADJUSTMENT">General Adjustment</option>
                  <option value="DEBIT_NOTE">Debit Note (Reduce Payable)</option>
                  <option value="CREDIT_NOTE">Credit Note (Increase Payable)</option>
                  <option value="OPENING_BALANCE">Opening Balance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="input-field"
                  rows="3"
                  placeholder="Adjustment notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowAdjustmentModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAdjustment}
                  className="btn-primary flex-1"
                >
                  Add Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupplierLedgerPage
