import React, { useState, useEffect } from 'react'
import { Mail, MessageSquare, Bell, Save, Loader, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const NotificationPreferences = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState({
    // Email preferences
    email_enabled: true,
    email_order_confirmed: true,
    email_order_processing: true,
    email_order_ready: true,
    email_order_delivered: true,
    email_order_cancelled: true,
    email_promotional: false,
    
    // SMS preferences
    sms_enabled: true,
    sms_order_confirmed: true,
    sms_order_processing: false,
    sms_order_ready: true,
    sms_order_delivered: true,
    sms_order_cancelled: true,
    sms_promotional: false,
    
    // Contact info
    phone_number: '',
    email_address: ''
  })

  useEffect(() => {
    if (user) {
      loadPreferences()
    }
  }, [user])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('customer_notification_preferences')
        .select('*')
        .eq('customer_id', user.id)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      if (data) {
        setPreferences(data)
      } else {
        // Create default preferences
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, phone')
          .eq('id', user.id)
          .single()
        
        setPreferences(prev => ({
          ...prev,
          email_address: profile?.email || user.email || '',
          phone_number: profile?.phone || ''
        }))
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
      toast.error('Failed to load notification preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Upsert preferences
      const { error } = await supabase
        .from('customer_notification_preferences')
        .upsert({
          customer_id: user.id,
          ...preferences
        }, {
          onConflict: 'customer_id'
        })
      
      if (error) throw error
      
      toast.success('Notification preferences saved successfully!')
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleContactUpdate = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-indigo-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
              <p className="text-sm text-gray-500 mt-1">
                Choose how you want to receive updates about your orders
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={preferences.email_address || ''}
                  onChange={(e) => handleContactUpdate('email_address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={preferences.phone_number || ''}
                  onChange={(e) => handleContactUpdate('phone_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
          </div>

          {/* Email Notifications */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.email_enabled}
                  onChange={() => handleToggle('email_enabled')}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-600">Enable All</span>
              </label>
            </div>

            <div className="space-y-3 ml-7">
              {[
                { key: 'email_order_confirmed', label: 'Order Confirmed', desc: 'When your order is confirmed' },
                { key: 'email_order_processing', label: 'Order Processing', desc: 'When your order is being prepared' },
                { key: 'email_order_ready', label: 'Order Ready', desc: 'When your order is ready for pickup/delivery' },
                { key: 'email_order_delivered', label: 'Order Delivered', desc: 'When your order is delivered' },
                { key: 'email_order_cancelled', label: 'Order Cancelled', desc: 'When your order is cancelled' },
                { key: 'email_promotional', label: 'Promotional Emails', desc: 'Special offers and updates' }
              ].map(item => (
                <label key={item.key} className="flex items-start cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={preferences[item.key]}
                    onChange={() => handleToggle(item.key)}
                    disabled={!preferences.email_enabled}
                    className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {item.label}
                    </span>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* SMS Notifications */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-medium text-gray-900">SMS Notifications</h3>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.sms_enabled}
                  onChange={() => handleToggle('sms_enabled')}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-600">Enable All</span>
              </label>
            </div>

            <div className="space-y-3 ml-7">
              {[
                { key: 'sms_order_confirmed', label: 'Order Confirmed', desc: 'Instant confirmation via SMS' },
                { key: 'sms_order_processing', label: 'Order Processing', desc: 'Processing status updates' },
                { key: 'sms_order_ready', label: 'Order Ready', desc: 'Ready for pickup/delivery alert' },
                { key: 'sms_order_delivered', label: 'Order Delivered', desc: 'Delivery confirmation' },
                { key: 'sms_order_cancelled', label: 'Order Cancelled', desc: 'Cancellation notification' },
                { key: 'sms_promotional', label: 'Promotional SMS', desc: 'Special offers via SMS' }
              ].map(item => (
                <label key={item.key} className="flex items-start cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={preferences[item.key]}
                    onChange={() => handleToggle(item.key)}
                    disabled={!preferences.sms_enabled}
                    className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {item.label}
                    </span>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Your privacy matters</p>
                <p className="text-blue-700">
                  We'll only send you notifications for events you choose. Your contact information
                  is kept secure and never shared with third parties.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationPreferences
