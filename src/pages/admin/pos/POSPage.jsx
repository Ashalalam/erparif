import React, { useState, useEffect } from 'react'
import { Search, Plus, Minus, Trash2, X, RefreshCw, Store, Wifi, User, CreditCard, Printer } from 'lucide-react'
import useCartStore from '../../../store/cartStore'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import { createRoot } from 'react-dom/client'
import LandscapeInvoice from '../../../components/LandscapeInvoice'
import WholesaleInvoice from '../../../components/WholesaleInvoice'

const POSPage = () => {
  const [medicines, setMedicines] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState([])
  const [wholesalers, setWholesalers] = useState([])
  const [retailers, setRetailers] = useState([])
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [doctorName, setDoctorName] = useState('')
  const [mciNo, setMciNo] = useState('')
  const [showCart, setShowCart] = useState(false) // For mobile toggle
  const [logo, setLogo] = useState(null)
  const [pharmacyName, setPharmacyName] = useState('BillSprout')

  const {
    items,
    customer,
    saleType,
    discount,
    addItem,
    updateItemQuantity,
    removeItem,
    setCustomer,
    setSaleType,
    getSubtotal,
    getGST,
    getGrandTotal,
    getItemsCount,
    clearCart
  } = useCartStore()

  useEffect(() => {
    fetchCustomers()
    fetchSettings()
    loadAllMedicines() // Load all medicines on mount
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
      // Silently handle - use defaults
    }
  }

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchMedicines()
    } else if (searchTerm.length === 0) {
      loadAllMedicines() // Show all when search is cleared
    }
  }, [searchTerm])

  // Auto-open customer modal when sale type is selected
  useEffect(() => {
    if (saleType && saleType !== '' && !customer) {
      setShowCustomerModal(true)
    }
  }, [saleType, customer])

  const fetchCustomers = async () => {
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'active')
        .order('name')
      
      // Separate customers by type
      const allCustomers = customerData || []
      setCustomers(allCustomers.filter(c => !c.customer_type || c.customer_type === 'individual'))
      setWholesalers(allCustomers.filter(c => c.customer_type === 'wholesaler'))
      setRetailers(allCustomers.filter(c => c.customer_type === 'retailer'))
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const loadAllMedicines = async () => {
    setLoading(true)
    try {
      const { data: medicineData, error: medError } = await supabase
        .from('medicines')
        .select('*')
        .eq('status', 'active')
        .order('name')
        .limit(50)

      if (medError) throw medError
      if (!medicineData || medicineData.length === 0) {
        setMedicines([])
        return
      }

      const medicineIds = medicineData.map(m => m.id)
      const { data: batchData, error: batchError } = await supabase
        .from('medicine_batches')
        .select('*')
        .in('medicine_id', medicineIds)
        .gt('current_quantity', 0)
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })

      if (batchError) throw batchError

      const medicinesWithBatches = medicineData.map(medicine => ({
        ...medicine,
        medicine_batches: batchData?.filter(b => b.medicine_id === medicine.id) || []
      })).filter(m => m.medicine_batches.length > 0)

      setMedicines(medicinesWithBatches)
    } catch (error) {
      console.error('Error loading medicines:', error)
      toast.error('Error loading medicines')
    } finally {
      setLoading(false)
    }
  }

  const searchMedicines = async () => {
    setLoading(true)
    try {
      const { data: medicineData, error: medError } = await supabase
        .from('medicines')
        .select('*')
        .eq('status', 'active')
        .or(`name.ilike.%${searchTerm}%,generic_name.ilike.%${searchTerm}%`)
        .limit(20)

      if (medError) throw medError
      if (!medicineData || medicineData.length === 0) {
        setMedicines([])
        return
      }

      const medicineIds = medicineData.map(m => m.id)
      const { data: batchData, error: batchError } = await supabase
        .from('medicine_batches')
        .select('*')
        .in('medicine_id', medicineIds)
        .gt('current_quantity', 0)
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })

      if (batchError) throw batchError

      const medicinesWithBatches = medicineData.map(medicine => ({
        ...medicine,
        medicine_batches: batchData?.filter(b => b.medicine_id === medicine.id) || []
      })).filter(m => m.medicine_batches.length > 0)

      setMedicines(medicinesWithBatches)
    } catch (error) {
      console.error('Error searching medicines:', error)
      toast.error('Error searching medicines')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (medicine, batch) => {
    if (batch.current_quantity < 1) {
      toast.error('Insufficient stock')
      return
    }
    addItem(medicine, batch, 1, 0)
    toast.success(`${medicine.name} added`)
  }

  const handleProcessSale = async (paymentMethod = 'cash') => {
    if (items.length === 0) {
      toast.error('Cart is empty')
      return
    }

    if (!saleType || saleType === '') {
      toast.error('Please select sale type')
      return
    }

    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      const { data: invoiceData } = await supabase.rpc('generate_invoice_number')

      const saleData = {
        invoice_number: invoiceData,
        customer_id: customer?.id || null,
        subtotal: getSubtotal(),
        discount: discount,
        gst_amount: getGST(),
        total: getGrandTotal(),
        paid_amount: getGrandTotal(),
        due_amount: 0,
        payment_method: paymentMethod,
        payment_status: 'paid',
        sale_type: saleType,
        created_by: user?.id
      }

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(saleData)
        .select()
        .single()

      if (saleError) throw saleError

      const saleItems = items.map(item => ({
        sale_id: sale.id,
        medicine_id: item.medicine.id,
        batch_id: item.batch.id,
        quantity: item.quantity,
        free_quantity: item.freeQuantity || 0,
        selling_price: item.price,
        discount: item.discount || 0,
        gst_percentage: item.medicine.gst_percentage || 0,
        gst_amount: (item.quantity * item.price * (item.medicine.gst_percentage || 0)) / 100,
        total: item.quantity * item.price * (1 + (item.medicine.gst_percentage || 0) / 100)
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      clearCart()
      setDoctorName('')
      setMciNo('')
      toast.success('Sale completed successfully!')
    } catch (error) {
      console.error('Error processing sale:', error)
      toast.error('Error processing sale')
    } finally {
      setLoading(false)
    }
  }

  const handleRazorpayPayment = () => {
    if (items.length === 0) {
      toast.error('Cart is empty')
      return
    }

    if (!saleType || saleType === '') {
      toast.error('Please select sale type')
      return
    }

    const amount = getGrandTotal()
    
    if (typeof window.Razorpay === 'undefined') {
      toast.error('Razorpay not loaded. Please refresh the page.')
      return
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: Math.round(amount * 100),
      currency: 'INR',
      name: 'BillSprout Smart ERP',
      description: 'Medicine Purchase',
      handler: function (response) {
        toast.success('Payment successful! Processing sale...')
        handleProcessSale('razorpay')
      },
      prefill: {
        name: customer?.name || customer?.business_name || '',
        contact: customer?.phone || '',
        email: customer?.email || ''
      },
      theme: {
        color: '#1e3a8a'
      }
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', function (response) {
      toast.error('Payment failed: ' + response.error.description)
      console.error('Payment failed:', response.error)
    })
    rzp.open()
  }

  const handleCompleteSaleAndPrint = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty')
      return
    }

    if (!saleType || saleType === '') {
      toast.error('Please select sale type')
      return
    }

    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      const { data: invoiceData } = await supabase.rpc('generate_invoice_number')

      const saleData = {
        invoice_number: invoiceData,
        customer_id: customer?.id || null,
        subtotal: getSubtotal(),
        discount: discount,
        gst_amount: getGST(),
        total: getGrandTotal(),
        paid_amount: getGrandTotal(),
        due_amount: 0,
        payment_method: 'cash',
        payment_status: 'paid',
        sale_type: saleType,
        created_by: user?.id
      }

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(saleData)
        .select()
        .single()

      if (saleError) throw saleError

      const saleItems = items.map(item => ({
        sale_id: sale.id,
        medicine_id: item.medicine.id,
        batch_id: item.batch.id,
        quantity: item.quantity,
        free_quantity: item.freeQuantity || 0,
        selling_price: item.price,
        discount: item.discount || 0,
        gst_percentage: item.medicine.gst_percentage || 0,
        gst_amount: (item.quantity * item.price * (item.medicine.gst_percentage || 0)) / 100,
        total: item.quantity * item.price * (1 + (item.medicine.gst_percentage || 0) / 100)
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      // Generate and print thermal invoice
      generateThermalInvoice(sale, items, '80mm')

      clearCart()
      setDoctorName('')
      setMciNo('')
      toast.success('Sale completed successfully!')
    } catch (error) {
      console.error('Error processing sale:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Error message:', error.message)
      console.error('Error hint:', error.hint)
      console.error('Error code:', error.code)
      toast.error(error.message || error.hint || 'Error processing sale')
    } finally {
      setLoading(false)
    }
  }

  const generateThermalInvoice = async (sale, saleItems, paperSize = '80mm') => {
    // Fetch settings from database
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .single()

    const companyDetails = settings || {
      pharmacy_name: 'LIFESPROUTS CARE',
      address: '2-190/6 Peikaji Nagar Asifabad, Kommurum Bheem Asifabad',
      state: 'TELANGANA',
      gstin: '36CTUPD3541E1ZO',
      drug_license_number: '(20B&21B)TG/AS/2025-139054',
      phone: '9666105832, 9959838249',
      email: 'vedithapharma@gmail.com'
    }

    // Open print window
    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${sale.invoice_number}</title>
      </head>
      <body>
        <div id="invoice-root"></div>
      </body>
      </html>
    `)
    printWindow.document.close()

    // Create container for React component
    const container = printWindow.document.getElementById('invoice-root')
    
    // Render React component to print window
    const root = createRoot(container)
    
    // Choose invoice component based on sale type
    const isWholesale = saleType === 'wholesale'
    const InvoiceComponent = isWholesale ? WholesaleInvoice : LandscapeInvoice
    
    root.render(
      <InvoiceComponent
        sale={sale}
        items={saleItems}
        customer={customer}
        companyDetails={companyDetails}
      />
    )

    // Wait for rendering and print
    setTimeout(() => {
      printWindow.print()
    }, 800)
  }

  const generateInvoicePrint = (sale, saleItems) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    
    const isWholesale = saleType === 'wholesale'
    const today = new Date(sale.created_at)
    
    // Calculate tax breakdown
    const cgstAmount = getGST() / 2
    const sgstAmount = getGST() / 2
    const grossTotal = getSubtotal()
    const totalDiscount = (grossTotal * discount) / 100
    const taxableAmount = grossTotal - totalDiscount
    const totalTaxAmount = getGST()
    
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${sale.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            padding: ${isWholesale ? '10px' : '20px'}; 
            font-size: ${isWholesale ? '11px' : '12px'};
          }
          .invoice-header { 
            text-align: center; 
            margin-bottom: ${isWholesale ? '10px' : '15px'}; 
            border-bottom: 2px solid #000; 
            padding-bottom: ${isWholesale ? '8px' : '10px'}; 
          }
          .invoice-header h1 { 
            font-size: ${isWholesale ? '16px' : '18px'}; 
            font-weight: bold; 
            margin-bottom: 3px; 
          }
          .invoice-header p { 
            font-size: ${isWholesale ? '9px' : '10px'}; 
            margin: 1px 0; 
          }
          .invoice-title {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin: 10px 0;
            text-decoration: underline;
          }
          .invoice-info { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 10px;
            font-size: ${isWholesale ? '10px' : '11px'};
          }
          .info-left, .info-right { flex: 1; }
          .info-right { text-align: right; }
          .info-row { margin-bottom: 3px; }
          .customer-section {
            border: 1px solid #000;
            padding: 8px;
            margin-bottom: 10px;
            font-size: ${isWholesale ? '10px' : '11px'};
          }
          .customer-section .row {
            display: flex;
            margin-bottom: 3px;
          }
          .customer-section .label {
            width: ${isWholesale ? '120px' : '150px'};
            font-weight: bold;
          }
          .customer-section .value {
            flex: 1;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 10px;
            font-size: ${isWholesale ? '9px' : '10px'};
          }
          th, td { 
            padding: ${isWholesale ? '4px 2px' : '6px 4px'}; 
            text-align: left; 
            border: 1px solid #000;
          }
          th { 
            background-color: #f0f0f0; 
            font-weight: bold;
            text-align: center;
          }
          td { vertical-align: top; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .totals-section {
            margin-top: 10px;
            font-size: ${isWholesale ? '10px' : '11px'};
          }
          .totals-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 3px;
          }
          .totals-label {
            width: 150px;
            text-align: right;
            padding-right: 10px;
            font-weight: bold;
          }
          .totals-value {
            width: 100px;
            text-align: right;
            border-bottom: 1px solid #ccc;
            padding-bottom: 2px;
          }
          .grand-total {
            font-size: 14px;
            font-weight: bold;
            border-top: 2px solid #000;
            border-bottom: 2px double #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .footer { 
            text-align: center; 
            margin-top: 20px; 
            padding-top: 10px; 
            border-top: 1px solid #000; 
            font-size: ${isWholesale ? '9px' : '10px'};
          }
          .no-print { display: block; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="invoice-header">
          <h1>${isWholesale ? 'LIFESPROUTS CARE' : 'VEDITHA MEDICALS'}</h1>
          <p>2-190/6 Peikaji Nagar Asifabad, Kommurum Bheem Asifabad</p>
          <p>TELANGANA-504203</p>
          <p>GSTIN: 36CTUPD3541E1ZO, D.L NO: (20B&21B)TG/AS/2025-139054</p>
          <p>Phone: 9666105832, 9959838249, E-Mail: vedithapharma@gmail.com</p>
        </div>

        ${isWholesale ? '<div class="invoice-title">TAX INVOICE</div>' : '<div class="invoice-title">GST INVOICE</div>'}

        <!-- Invoice Info -->
        <div class="invoice-info">
          <div class="info-left">
            ${isWholesale ? `
              <div class="info-row"><strong>Bill To:</strong></div>
              <div class="info-row">${customer?.business_name || 'Walk-in Customer'}</div>
              ${customer?.address ? `<div class="info-row">${customer.address}</div>` : ''}
            ` : `
              <div class="info-row"><strong>Customer:</strong> ${customer?.name || 'Walk-in Customer'}</div>
              ${customer?.phone ? `<div class="info-row"><strong>Phone:</strong> ${customer.phone}</div>` : ''}
            `}
          </div>
          <div class="info-right">
            <div class="info-row"><strong>Invoice No:</strong> ${sale.invoice_number}</div>
            <div class="info-row"><strong>Date:</strong> ${today.toLocaleDateString('en-GB')}</div>
            <div class="info-row"><strong>Time:</strong> ${today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        ${isWholesale && customer ? `
          <!-- Customer Details Box (Wholesale Only) -->
          <div class="customer-section">
            <div class="row">
              <span class="label">Shop Name:</span>
              <span class="value">${customer.business_name || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">GSTIN:</span>
              <span class="value">${customer.gstin || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Drug License:</span>
              <span class="value">${customer.drug_license_number || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Phone:</span>
              <span class="value">${customer.phone || 'N/A'}</span>
            </div>
            ${customer.address ? `
            <div class="row">
              <span class="label">Address:</span>
              <span class="value">${customer.address}</span>
            </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">Sr No</th>
              <th>Item ${isWholesale ? 'Name' : 'Descriptions'}</th>
              <th style="width: 40px;">Pack</th>
              <th style="width: 60px;">HSN ${isWholesale ? '' : 'Code'}</th>
              <th style="width: 70px;">Batch</th>
              <th style="width: 50px;">Exp</th>
              <th style="width: 40px;">Qty</th>
              <th style="width: 40px;">Free</th>
              <th style="width: 60px;">${isWholesale ? 'Rate' : 'RATE'}</th>
              <th style="width: 50px;">Dis%</th>
              <th style="width: 60px;">Dis Amt</th>
              <th style="width: 50px;">GST%</th>
              <th style="width: 70px;">Total ${isWholesale ? '' : 'Amt'}</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => {
              const itemTotal = item.quantity * item.price
              const itemDiscountAmt = (itemTotal * (item.discount || 0)) / 100
              const taxableAmt = itemTotal - itemDiscountAmt
              const gstAmt = (taxableAmt * (item.medicine.gst_percentage || 0)) / 100
              const totalWithGst = taxableAmt + gstAmt
              
              return `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td>${item.medicine.name}</td>
                <td class="text-center">${item.medicine.pack_size || '10'}</td>
                <td class="text-center">${item.medicine.hsn_code || '8547'}</td>
                <td class="text-center">${item.batch.batch_number}</td>
                <td class="text-center">${new Date(item.batch.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-center">${item.freeQuantity || 0}</td>
                <td class="text-right">${item.price.toFixed(2)}</td>
                <td class="text-center">${(item.discount || 0).toFixed(2)}%</td>
                <td class="text-right">${itemDiscountAmt.toFixed(2)}</td>
                <td class="text-center">${(item.medicine.gst_percentage || 0).toFixed(2)}%</td>
                <td class="text-right">${totalWithGst.toFixed(2)}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals-section">
          <div class="totals-row">
            <div class="totals-label">CGST:</div>
            <div class="totals-value">${cgstAmount.toFixed(2)}</div>
          </div>
          <div class="totals-row">
            <div class="totals-label">SGST:</div>
            <div class="totals-value">${sgstAmount.toFixed(2)}</div>
          </div>
          <div class="totals-row">
            <div class="totals-label">IGST:</div>
            <div class="totals-value">0.00</div>
          </div>
          <div class="totals-row">
            <div class="totals-label">Gross Total:</div>
            <div class="totals-value">${grossTotal.toFixed(2)}</div>
          </div>
          <div class="totals-row">
            <div class="totals-label">Total Discount:</div>
            <div class="totals-value">${totalDiscount.toFixed(2)}</div>
          </div>
          <div class="totals-row">
            <div class="totals-label">Taxable Amount:</div>
            <div class="totals-value">${taxableAmount.toFixed(2)}</div>
          </div>
          <div class="totals-row">
            <div class="totals-label">Total Tax Amount:</div>
            <div class="totals-value">${totalTaxAmount.toFixed(2)}</div>
          </div>
          <div class="totals-row grand-total">
            <div class="totals-label">GRAND TOTAL:</div>
            <div class="totals-value">₹${getGrandTotal().toFixed(2)}</div>
          </div>
          <div class="totals-row" style="margin-top: 10px;">
            <div class="totals-label">Payment Method:</div>
            <div class="totals-value">${sale.payment_method.toUpperCase()}</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>Thank you for your business!</strong></p>
          <p>This is a computer-generated invoice.</p>
          ${isWholesale ? '<p>E&OE - Errors and Omissions Excepted</p>' : ''}
        </div>

        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 30px; background: #1e3a8a; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Print Invoice</button>
          <button onclick="window.close()" style="padding: 10px 30px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-left: 10px;">Close</button>
        </div>

        <script>
          setTimeout(() => {
            window.print();
          }, 500);
        </script>
      </body>
      </html>
    `
    
    printWindow.document.write(invoiceHTML)
    printWindow.document.close()
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-900 rounded-lg flex items-center justify-center overflow-hidden">
                {logo ? (
                  <img src={logo} alt="Logo" className="h-full w-full object-contain p-0.5" />
                ) : (
                  <span className="text-white font-bold text-sm md:text-lg">Rx</span>
                )}
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm md:text-lg font-bold text-gray-900">{pharmacyName} – Store Operations</h1>
                <p className="text-xs text-gray-500">Lifesprout Care | Pharma Mode</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full">
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Online</span>
            </div>
            
            {/* Mobile Cart Toggle */}
            <button
              onClick={() => setShowCart(!showCart)}
              className="md:hidden relative p-2 bg-blue-900 text-white rounded-lg"
            >
              <CreditCard className="w-5 h-5" />
              {getItemsCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getItemsCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Medicine Search */}
        <div className={`flex-1 p-4 md:p-6 overflow-y-auto ${showCart ? 'hidden md:block' : 'block'}`}>
          {/* Search Bar */}
          <div className="mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg hidden sm:block">
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search product / salt / barcode"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
                />
              </div>

              <select
                value={saleType || ''}
                onChange={(e) => {
                  const value = e.target.value
                  setSaleType(value === '' ? null : value)
                  setCustomer(null)
                  setDoctorName('')
                  setMciNo('')
                }}
                className="px-3 md:px-4 py-2.5 border border-gray-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              >
                <option value="">Select Type</option>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
              </select>
            </div>
          </div>

          {/* Medicine Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900 mx-auto"></div>
              </div>
            ) : medicines.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-400">
                No medicines available
              </div>
            ) : (
              medicines.map(medicine => (
                medicine.medicine_batches.map(batch => (
                  <div
                    key={`${medicine.id}-${batch.id}`}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleAddToCart(medicine, batch)}
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">{medicine.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{medicine.generic_name}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <span>FEFO: BATCH-{batch.batch_number?.slice(0, 8)}</span>
                      <span>Exp: {new Date(batch.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}</span>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-xl font-bold text-gray-900">
                          ₹{(saleType === 'wholesale' ? batch.wholesale_price : batch.selling_price).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">Stock: {batch.current_quantity}</div>
                      </div>
                      <button className="p-2 bg-blue-900 text-white rounded-full hover:bg-blue-800">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Billing Cart */}
        <div className={`w-full md:w-96 bg-white border-l border-gray-200 flex flex-col ${showCart ? 'block' : 'hidden md:flex'}`}>
          {/* Cart Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Billing Cart</h2>
              <button 
                onClick={() => setShowCart(false)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Customer Info - Changes based on Retail/Wholesale */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Customer Name</span>
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="text-blue-900 font-medium hover:underline"
                >
                  {customer ? (customer.name || customer.business_name) : 'Walk-in Customer'}
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Phone</span>
                <span className="font-medium">{customer?.phone || '+91 7747 571513'}</span>
              </div>
              
              {/* Retail-specific fields */}
              {(saleType === 'retail' || !saleType || saleType === '') && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Doctor Name</span>
                    <input
                      type="text"
                      placeholder="Dr. Name"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      className="text-right font-medium bg-transparent border-b border-gray-200 focus:border-blue-500 focus:outline-none text-sm py-1 px-2 w-40"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">MCI No</span>
                    <input
                      type="text"
                      placeholder="MCI No"
                      value={mciNo}
                      onChange={(e) => setMciNo(e.target.value)}
                      className="text-right font-medium bg-transparent border-b border-gray-200 focus:border-blue-500 focus:outline-none text-sm py-1 px-2 w-40"
                    />
                  </div>
                </>
              )}
              
              {/* Wholesale-specific fields */}
              {saleType === 'wholesale' && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Shop Name</span>
                    <span className="font-medium text-xs text-right">{customer?.business_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">GSTIN</span>
                    <span className="font-medium text-xs">{customer?.gstin || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Drug License</span>
                    <span className="font-medium text-xs">{customer?.drug_license_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Address</span>
                    <span className="font-medium text-xs text-right max-w-[180px] truncate">{customer?.address || 'N/A'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="font-medium">Cart is empty</p>
                <p className="text-sm mt-1">Add items to start billing</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{item.medicine.name}</h4>
                        <p className="text-xs text-gray-500">{item.medicine.generic_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          BATCH: {item.batch.batch_number} | Exp: {new Date(item.batch.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateItemQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          className="p-1 bg-blue-900 text-white rounded hover:bg-blue-800"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">₹{(item.quantity * item.price).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">@ ₹{item.price.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Footer */}
          <div className="border-t border-gray-200 p-4 space-y-4">
            {/* Discount */}
            {items.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Discount (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => useCartStore.getState().setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                />
              </div>
            )}

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (Gross)</span>
                <span>Rs.{getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total GST</span>
                <span>Rs.{getGST().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>GRAND TOTAL</span>
                <span>Rs.{getGrandTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Payment Method Selection */}
              <div className="text-sm font-semibold text-gray-700 mb-2">Select Payment Method:</div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRazorpayPayment}
                  disabled={items.length === 0 || loading}
                  className="flex-1 border-2 border-blue-900 text-blue-900 py-3 rounded-lg font-semibold hover:bg-blue-50 disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>RAZORPAY (Online)</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              {/* Cash Payment - Complete Sale & Print */}
              <button
                onClick={handleCompleteSaleAndPrint}
                disabled={items.length === 0 || loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Printer className="w-5 h-5" />
                <span>{loading ? 'Processing...' : 'CASH - Complete Sale & Print'}</span>
              </button>

              <div className="text-center text-xs text-gray-500 mt-2">
                💡 Cash payment will complete sale and open invoice
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold">Select Customer</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Walk-in Customer */}
              <button
                onClick={() => {
                  setCustomer(null)
                  setShowCustomerModal(false)
                }}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 mb-4"
              >
                <div className="font-semibold">Walk-in Customer</div>
                <div className="text-sm text-gray-500">No customer selected</div>
              </button>

              {/* Customers List */}
              {saleType === 'retail' && customers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Customers</h4>
                  {customers.map(cust => (
                    <button
                      key={cust.id}
                      onClick={() => {
                        setCustomer({ ...cust, type: 'customer' })
                        setShowCustomerModal(false)
                      }}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50"
                    >
                      <div className="font-semibold">{cust.name}</div>
                      <div className="text-sm text-gray-500">{cust.phone}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Wholesalers List */}
              {saleType === 'wholesale' && wholesalers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Wholesalers</h4>
                  {wholesalers.map(wh => (
                    <button
                      key={wh.id}
                      onClick={() => {
                        setCustomer({ ...wh, type: 'wholesaler' })
                        setShowCustomerModal(false)
                      }}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50"
                    >
                      <div className="font-semibold">{wh.business_name}</div>
                      <div className="text-sm text-gray-500">{wh.phone}</div>
                      {wh.gstin && <div className="text-xs text-gray-400">GSTIN: {wh.gstin}</div>}
                    </button>
                  ))}
                </div>
              )}

              {/* Retailers List */}
              {saleType === 'wholesale' && retailers.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Retailers</h4>
                  {retailers.map(ret => (
                    <button
                      key={ret.id}
                      onClick={() => {
                        setCustomer({ ...ret, type: 'retailer' })
                        setShowCustomerModal(false)
                      }}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50"
                    >
                      <div className="font-semibold">{ret.business_name}</div>
                      <div className="text-sm text-gray-500">{ret.phone}</div>
                      {ret.gstin && <div className="text-xs text-gray-400">GSTIN: {ret.gstin}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default POSPage
