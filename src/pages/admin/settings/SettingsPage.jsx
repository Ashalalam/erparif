import React, { useState, useEffect } from 'react'
import { Save, Upload, Download, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const SettingsPage = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState(null)
  const [formData, setFormData] = useState({
    pharmacy_name: '',
    phone: '',
    address: '',
    email: '',
    website: '',
    gstin: '',
    drug_license_number: '',
    fssai_number: '',
    state: '',
    cgst_rate: 9,
    sgst_rate: 9,
    invoice_prefix: 'INV',
    invoice_footer: 'Thank you for your business!',
    auto_print_invoice: true,
    logo_url: '',
    low_stock_threshold: 10,
    expiry_alert_days: 30,
    block_expired_sales: true,
    bank_name: '',
    bank_branch: '',
    bank_account: '',
    bank_ifsc: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single()

      if (error) {
        // If no settings exist, create default
        if (error.code === 'PGRST116') {
          const { data: newData, error: insertError } = await supabase
            .from('settings')
            .insert([{
              pharmacy_name: 'My Pharmacy',
              cgst_rate: 9,
              sgst_rate: 9,
              invoice_prefix: 'INV',
              invoice_footer: 'Thank you for your business!',
              auto_print_invoice: true,
              low_stock_threshold: 10,
              expiry_alert_days: 30,
              block_expired_sales: true
            }])
            .select()
            .single()

          if (insertError) throw insertError
          
          setSettingsId(newData.id)
          setFormData({
            ...formData,
            ...newData
          })
        } else {
          throw error
        }
      } else {
        setSettingsId(data.id)
        setFormData({
          ...formData,
          ...data
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('settings')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', settingsId)

      if (error) throw error

      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Convert image to base64 data URL (no storage bucket needed)
      const reader = new FileReader()
      
      reader.onloadend = async () => {
        try {
          const base64String = reader.result
          
          // Update logo_url with base64 data
          setFormData(prev => ({ ...prev, logo_url: base64String }))
          
          // Save to database immediately
          if (settingsId) {
            const { error } = await supabase
              .from('settings')
              .update({ logo_url: base64String })
              .eq('id', settingsId)
            
            if (error) throw error
          }
          
          toast.success('Logo uploaded successfully')
        } catch (error) {
          console.error('Error saving logo:', error)
          toast.error('Failed to save logo')
        }
      }
      
      reader.onerror = () => {
        toast.error('Failed to read image file')
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Failed to upload logo')
    }
  }

  const handleExportData = async () => {
    try {
      toast('Exporting data...')
      
      // Export all tables
      const tables = ['customers', 'medicines', 'medicine_batches', 'sales', 'purchases', 'wholesalers']
      const exportData = {}
      
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
        
        if (!error && data) {
          exportData[table] = data
        }
      }
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pharmacy-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      
      toast.success('Data exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure pharmacy settings and preferences</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pharmacy Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pharmacy Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pharmacy Name *
                  </label>
                  <input
                    type="text"
                    name="pharmacy_name"
                    value={formData.pharmacy_name}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  rows={3}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tax Settings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax & Legal Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drug License Number
                  </label>
                  <input
                    type="text"
                    name="drug_license_number"
                    value={formData.drug_license_number}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    FSSAI Number
                  </label>
                  <input
                    type="text"
                    name="fssai_number"
                    value={formData.fssai_number}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., Maharashtra"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CGST Rate (%)
                  </label>
                  <input
                    type="number"
                    name="cgst_rate"
                    value={formData.cgst_rate}
                    onChange={handleChange}
                    step="0.01"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SGST Rate (%)
                  </label>
                  <input
                    type="number"
                    name="sgst_rate"
                    value={formData.sgst_rate}
                    onChange={handleChange}
                    step="0.01"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Settings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    name="invoice_prefix"
                    value={formData.invoice_prefix}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Footer Text
                  </label>
                  <input
                    type="text"
                    name="invoice_footer"
                    value={formData.invoice_footer}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto_print"
                  name="auto_print_invoice"
                  checked={formData.auto_print_invoice}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 rounded"
                />
                <label htmlFor="auto_print" className="text-sm text-gray-700">
                  Auto-print invoices after sale
                </label>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., HDFC Bank"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    name="bank_branch"
                    value={formData.bank_branch}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., Main Branch"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="bank_account"
                    value={formData.bank_account}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., 50200012345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    name="bank_ifsc"
                    value={formData.bank_ifsc}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., HDFC0000372"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logo and Quick Settings */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pharmacy Logo</h3>
            <div className="text-center">
              <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl font-bold text-primary-600">Rx</span>
                )}
              </div>
              <label className="btn-secondary cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Low Stock Threshold
                </label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  value={formData.low_stock_threshold}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Alert Days
                </label>
                <input
                  type="number"
                  name="expiry_alert_days"
                  value={formData.expiry_alert_days}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="block_expired_sales"
                  name="block_expired_sales"
                  checked={formData.block_expired_sales}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 rounded"
                />
                <label htmlFor="block_expired_sales" className="text-sm text-gray-700">
                  Block expired medicine sales
                </label>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
            <div className="space-y-3">
              <button 
                onClick={handleExportData}
                className="w-full btn-secondary"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage