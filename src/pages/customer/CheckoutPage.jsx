import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { 
  MapPin, Phone, Mail, User, FileText, CreditCard, 
  AlertCircle, ArrowLeft, CheckCircle, Loader2 
} from 'lucide-react'
import useCartStore from '../../store/cartStore'
import useAuthStore from '../../store/authStore'
import PrescriptionUpload from '../../components/PrescriptionUpload'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { createRazorpayOrder, initiatePayment, handlePaymentFailure } from '../../services/razorpayService'
import { checkPaymentColumns } from '../../utils/checkDatabase'

const CheckoutPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prescriptionRequired = searchParams.get('prescription') === 'required'
  
  const { items, getSubtotal, getGST, getGrandTotal, clearCart } = useCartStore()
  const { user, profile } = useAuthStore()
  
  const [loading, setLoading] = useState(false)
  const [prescriptionUrls, setPrescriptionUrls] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([]) // Track selected files
  const [paymentMethod, setPaymentMethod] = useState('COD') // Payment method
  const [paymentColumnsExist, setPaymentColumnsExist] = useState(true) // Track if DB is ready
  const prescriptionUploadRef = useRef(null)
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    notes: ''
  })
  
  const [errors, setErrors] = useState({})

  useEffect(() => {
    // Redirect if cart is empty
    if (items.length === 0) {
      toast.error('Your cart is empty')
      navigate('/customer/medicines')
      return
    }

    // Check if payment columns exist
    const checkDatabase = async () => {
      const result = await checkPaymentColumns()
      setPaymentColumnsExist(result.exists)
      
      if (!result.exists) {
        console.warn('⚠️ Payment columns not found - Online payment disabled')
        toast.error('Online payment temporarily unavailable. Please use Cash on Delivery.', {
          duration: 5000
        })
        setPaymentMethod('COD') // Force COD
      }
    }
    
    checkDatabase()
  }, [items, navigate])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Invalid phone number (10 digits required)'
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Delivery address is required'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required'
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required'
    } else if (!/^[0-9]{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Invalid pincode (6 digits required)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePrescriptionUpload = (urls) => {
    console.log('✅ Prescription uploaded, URLs:', urls)
    setPrescriptionUrls(urls)
    toast.success('Prescription uploaded successfully')
  }

  const handleFilesSelected = (files) => {
    console.log('📁 Files selected:', files.length)
    setSelectedFiles(files)
  }

  const handlePlaceOrder = async () => {
    console.log('🛒 Place Order clicked')
    
    // Validate form
    if (!validateForm()) {
      toast.error('Please fill in all required fields')
      return
    }

    // Check if prescription is required
    const requiresRx = items.some(item => item.medicine.prescription_required)
    console.log('💊 Requires prescription:', requiresRx)
    console.log('📁 Selected files:', selectedFiles.length)
    console.log('🔗 Prescription URLs:', prescriptionUrls.length)

    // If prescription is required, check for selected files
    if (requiresRx && selectedFiles.length === 0 && prescriptionUrls.length === 0) {
      toast.error('Please select your prescription file(s) before placing the order')
      return
    }

    setLoading(true)

    try {
      let uploadedUrls = [...prescriptionUrls]

      // Upload prescription if files are selected but not uploaded yet
      if (requiresRx && selectedFiles.length > 0 && prescriptionUploadRef.current) {
        console.log('⬆️ Uploading prescription files...')
        const uploadInput = prescriptionUploadRef.current.querySelector('[data-upload-handler="true"]')
        if (uploadInput?.uploadFiles) {
          try {
            const urls = await uploadInput.uploadFiles()
            if (urls && urls.length > 0) {
              uploadedUrls = urls
              setPrescriptionUrls(urls)
              console.log('✅ Upload successful, URLs:', urls)
            } else {
              throw new Error('Upload did not return any URLs')
            }
          } catch (uploadError) {
            console.error('❌ Upload failed:', uploadError)
            setLoading(false)
            toast.error('Failed to upload prescription. Please try again.')
            return
          }
        } else {
          console.error('❌ Upload handler not found')
          setLoading(false)
          toast.error('Prescription upload not ready. Please refresh and try again.')
          return
        }
      }

      // Final check: if prescription required, must have URLs
      if (requiresRx && uploadedUrls.length === 0) {
        setLoading(false)
        toast.error('Prescription upload failed. Please try again.')
        return
      }

      // Validate stock availability
      const stockValidation = await validateStock()
      if (!stockValidation.valid) {
        toast.error(stockValidation.message)
        setLoading(false)
        return
      }

      // Calculate totals
      const subtotal = getSubtotal()
      const gst = getGST()
      const total = getGrandTotal()

      // Generate order number
      console.log('📝 Generating order number...')
      const { data: orderNumberData, error: orderNumberError } = await supabase
        .rpc('generate_order_number')

      if (orderNumberError || !orderNumberData) {
        console.error('❌ Order number generation failed:', orderNumberError)
        throw new Error('Failed to generate order number')
      }

      const orderNumber = orderNumberData
      console.log('✅ Order number generated:', orderNumber)

      // If COD, proceed with traditional order creation
      if (paymentMethod === 'COD') {
        await createCODOrder(orderNumber, subtotal, gst, total, uploadedUrls, requiresRx)
        return
      }

      // For online payment, create order and initiate Razorpay
      console.log('💳 Initiating online payment...')
      
      // Prepare order items for Razorpay order creation
      const orderItems = items.map(item => {
        const subtotalItem = item.price * item.quantity
        const discountAmount = (subtotalItem * (item.discount || 0)) / 100
        const afterDiscount = subtotalItem - discountAmount
        const gstAmount = (afterDiscount * item.medicine.gst_percentage) / 100
        const itemTotal = afterDiscount + gstAmount

        return {
          medicine_id: item.medicine.id,
          batch_id: item.batch.id,
          medicine_name: item.medicine.name,
          batch_number: item.batch.batch_number,
          quantity: item.quantity,
          unit_price: item.price,
          mrp: item.medicine.mrp || item.price,
          discount_percent: item.discount || 0,
          discount_amount: discountAmount,
          gst_percentage: item.medicine.gst_percentage,
          gst_amount: gstAmount,
          item_total: itemTotal,
          requires_prescription: item.medicine.prescription_required
        }
      })

      // Create Razorpay order
      const razorpayOrderData = {
        order_number: orderNumber,
        customer_id: user.id,
        items: orderItems,
        subtotal: subtotal,
        gst_amount: gst,
        discount: 0,
        delivery_charge: 0,
        grand_total: total,
        delivery_address: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
        customer_phone: formData.phone,
        customer_email: formData.email,
        prescription_url: uploadedUrls.length > 0 ? uploadedUrls[0] : null,
        notes: formData.notes || null
      }

      const razorpayOrder = await createRazorpayOrder(razorpayOrderData)
      console.log('✅ Razorpay order created:', razorpayOrder.order_id)

      // Initiate Razorpay payment
      await initiatePayment(
        {
          order_id: razorpayOrder.order_id,
          order_number: orderNumber,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency
        },
        {
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone
        },
        // On success
        async (response) => {
          console.log('✅ Payment successful:', response)
          
          // Create stock reservations
          for (const item of items) {
            const { error: reservationError } = await supabase.rpc('create_stock_reservation', {
              p_batch_id: item.batch.id,
              p_order_id: razorpayOrder.order_id,
              p_customer_id: user.id,
              p_quantity: item.quantity
            })

            if (reservationError) {
              console.error('Stock reservation error:', reservationError)
            }
          }

          // Clear cart AFTER successful payment
          await clearCart(user.id)
          
          toast.success('Payment successful! Order placed.')
          navigate(`/customer/order-confirmation/${razorpayOrder.order_id}`)
          setLoading(false)
        },
        // On failure
        async (error) => {
          console.error('❌ Payment failed:', error)
          await handlePaymentFailure(razorpayOrder.order_id)
          toast.error('Payment failed. Please try again.')
          setLoading(false)
        }
      )

    } catch (error) {
      console.error('❌ Order placement error:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      })
      
      let errorMessage = 'Failed to place order. Please try again.'
      
      // Check for specific migration-related error
      if (error.message?.includes('DATABASE NOT UPDATED') || 
          error.message?.includes('payment_method') ||
          error.code === '23514') {
        errorMessage = '⚠️ SETUP REQUIRED: Database migration not applied. Please contact admin to apply "migration-add-payment-fields.sql" in Supabase. Use COD payment for now.'
        
        // Also log clear instructions
        console.error('============================================')
        console.error('🚨 DATABASE MIGRATION REQUIRED')
        console.error('============================================')
        console.error('The database needs to be updated with payment columns.')
        console.error('')
        console.error('STEPS TO FIX:')
        console.error('1. Open Supabase Dashboard: https://supabase.com/dashboard')
        console.error('2. Go to SQL Editor')
        console.error('3. Run the file: migration-add-payment-fields.sql')
        console.error('4. Refresh this page')
        console.error('============================================')
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  const createCODOrder = async (orderNumber, subtotal, gst, total, uploadedUrls, requiresRx) => {
    try {
      // Create order
      const orderData = {
        order_number: orderNumber,
        customer_id: user.id,
        status: 'pending',
        subtotal: subtotal,
        discount: 0,
        gst_amount: gst,
        delivery_charge: 0,
        total: total,
        delivery_name: formData.fullName,
        delivery_phone: formData.phone,
        delivery_address: formData.address,
        delivery_landmark: null,
        delivery_city: formData.city,
        delivery_state: formData.state,
        delivery_pincode: formData.pincode,
        requires_prescription: requiresRx,
        prescription_uploaded: uploadedUrls.length > 0,
        prescription_url: uploadedUrls.length > 0 ? uploadedUrls[0] : null,
        prescription_verified: false,
        admin_notes: formData.notes || null,
        payment_method: 'COD',
        payment_status: 'pending',
        customer_notes: formData.notes || null
      }

      console.log('📦 Creating COD order with data:', orderData)

      const { data: order, error: orderError } = await supabase
        .from('customer_orders')
        .insert([orderData])
        .select()
        .single()

      if (orderError) {
        console.error('❌ Order creation error:', orderError)
        throw new Error(`Failed to create order: ${orderError.message}`)
      }

      console.log('✅ Order created:', order.id)

      // Create order items
      const orderItems = items.map(item => {
        const subtotalItem = item.price * item.quantity
        const discountAmount = (subtotalItem * (item.discount || 0)) / 100
        const afterDiscount = subtotalItem - discountAmount
        const gstAmount = (afterDiscount * item.medicine.gst_percentage) / 100
        const itemTotal = afterDiscount + gstAmount

        return {
          order_id: order.id,
          medicine_id: item.medicine.id,
          batch_id: item.batch.id,
          medicine_name: item.medicine.name,
          batch_number: item.batch.batch_number,
          quantity: item.quantity,
          unit_price: item.price,
          mrp: item.medicine.mrp || item.price,
          discount_percent: item.discount || 0,
          discount_amount: discountAmount,
          gst_percentage: item.medicine.gst_percentage,
          gst_amount: gstAmount,
          item_total: itemTotal,
          requires_prescription: item.medicine.prescription_required
        }
      })

      const { error: itemsError } = await supabase
        .from('customer_order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Order items creation error:', itemsError)
        await supabase.from('customer_orders').delete().eq('id', order.id)
        throw new Error('Failed to create order items')
      }

      // Create stock reservations
      for (const item of items) {
        const { error: reservationError } = await supabase.rpc('create_stock_reservation', {
          p_batch_id: item.batch.id,
          p_order_id: order.id,
          p_customer_id: user.id,
          p_quantity: item.quantity
        })

        if (reservationError) {
          console.error('Stock reservation error:', reservationError)
        }
      }

      // Clear cart AFTER successful COD order creation
      await clearCart(user.id)

      console.log('🎉 COD order placement complete!')
      toast.success('Order placed successfully!')
      navigate(`/customer/order-confirmation/${order.id}`)
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  const validateStock = async () => {
    try {
      for (const item of items) {
        // Get current batch stock
        const { data: batch, error } = await supabase
          .from('medicine_batches')
          .select('current_quantity, expiry_date')
          .eq('id', item.batch.id)
          .single()

        if (error) {
          return {
            valid: false,
            message: `Failed to validate stock for ${item.medicine.name}`
          }
        }

        if (!batch) {
          return {
            valid: false,
            message: `Batch not found for ${item.medicine.name}`
          }
        }

        if (batch.current_quantity < item.quantity) {
          return {
            valid: false,
            message: `Insufficient stock for ${item.medicine.name}. Only ${batch.current_quantity} units available.`
          }
        }

        if (new Date(batch.expiry_date) <= new Date()) {
          return {
            valid: false,
            message: `${item.medicine.name} batch has expired`
          }
        }
      }

      return { valid: true }
    } catch (error) {
      console.error('Stock validation error:', error)
      return {
        valid: false,
        message: 'Failed to validate stock. Please try again.'
      }
    }
  }

  if (items.length === 0) {
    return null // Will redirect in useEffect
  }

  const subtotal = getSubtotal()
  const gst = getGST()
  const grandTotal = getGrandTotal()
  const requiresRx = items.some(item => item.medicine.prescription_required)
  const rxItems = items.filter(item => item.medicine.prescription_required)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/customer/cart"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="mt-2 text-gray-600">Complete your order</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Customer Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fullName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="10-digit phone number"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Delivery Address
            </h2>

            <div className="space-y-4">
              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.address ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your complete address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.city ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="City"
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                  )}
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.state ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="State"
                  />
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                  )}
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.pincode ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="6-digit pincode"
                    maxLength="6"
                  />
                  {errors.pincode && (
                    <p className="mt-1 text-sm text-red-600">{errors.pincode}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special instructions or notes for delivery"
                />
              </div>
            </div>
          </div>

          {/* Prescription Upload */}
          {requiresRx && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Prescription Upload
              </h2>

              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-900 font-medium mb-2">
                  The following items require a prescription:
                </p>
                <ul className="text-sm text-orange-800 list-disc list-inside">
                  {rxItems.map(item => (
                    <li key={item.id}>{item.medicine.name}</li>
                  ))}
                </ul>
              </div>

              <div ref={prescriptionUploadRef}>
                <PrescriptionUpload
                  onUploadComplete={handlePrescriptionUpload}
                  onFilesSelected={handleFilesSelected}
                  required={true}
                />
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Payment Method
            </h2>

            <div className="space-y-3">
              {/* Cash on Delivery */}
              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                paymentMethod === 'COD'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">Cash on Delivery</span>
                    <span className="text-sm text-gray-500">Pay when you receive</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Pay with cash when your order is delivered
                  </p>
                </div>
              </label>

              {/* Online Payment (Razorpay) */}
              <label className={`flex items-center p-4 border-2 rounded-lg transition-all ${
                !paymentColumnsExist 
                  ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                  : paymentMethod === 'Online'
                    ? 'border-blue-500 bg-blue-50 cursor-pointer'
                    : 'border-gray-200 hover:border-gray-300 cursor-pointer'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Online"
                  checked={paymentMethod === 'Online'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={!paymentColumnsExist}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">Pay Online</span>
                    {paymentColumnsExist ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        Secure
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                        Setup Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {paymentColumnsExist 
                      ? 'Pay using UPI, Cards, Net Banking, or Wallets'
                      : 'Database migration required - Use COD for now'
                    }
                  </p>
                  <div className="flex items-center mt-2 text-xs text-gray-400">
                    <span>Powered by Razorpay</span>
                  </div>
                </div>
              </label>
            </div>

            {/* Payment Info */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="ml-3 text-sm text-blue-800">
                  {paymentMethod === 'COD' ? (
                    <p>Your order will be confirmed after admin approval. Pay when delivered.</p>
                  ) : (
                    <p>You will be redirected to a secure payment gateway. Your order will be confirmed instantly.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

            {/* Items List */}
            <div className="space-y-3 mb-4 pb-4 border-b">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.medicine.name}</p>
                    <p className="text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-gray-900">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-3 mb-4 pb-4 border-b">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">₹{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST</span>
                <span className="font-medium text-gray-900">₹{gst.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium text-blue-600">
                  {paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
                </span>
              </div>
            </div>

            <div className="flex justify-between mb-6">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-blue-600">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>{paymentMethod === 'COD' ? 'Place Order' : 'Proceed to Payment'}</span>
                </>
              )}
            </button>

            {/* Info */}
            <div className="mt-6 pt-6 border-t space-y-2 text-xs text-gray-600">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Your order will be reviewed by our pharmacist before processing</span>
              </div>
              {requiresRx && (
                <div className="flex items-start space-x-2">
                  <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Prescription verification required for Rx medicines</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
