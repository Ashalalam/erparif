/**
 * Invoice Generation Service
 * Generates professional PDF invoices for customer orders
 * Uses jsPDF for PDF generation
 */

import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { supabase } from '../lib/supabase'

/**
 * Format currency to INR
 */
const formatCurrency = (amount) => {
  return `₹${parseFloat(amount || 0).toFixed(2)}`
}

/**
 * Format date to readable format
 */
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Get pharmacy/business settings from database
 */
const getBusinessSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single()
    
    if (error) throw error
    
    return {
      name: data?.pharmacy_name || import.meta.env.VITE_BUSINESS_NAME || 'BillSprout Pharmacy',
      email: import.meta.env.VITE_BUSINESS_EMAIL || 'support@billsprout.com',
      phone: data?.phone || '+91 98765 43210',
      address: import.meta.env.VITE_PHARMACY_ADDRESS || '123 Main Street, City - 123456',
      gstNumber: data?.gst_number || 'GST123456789',
      drugLicense: data?.drug_license_number || 'DL-1234567890',
      fssaiNumber: data?.fssai_license || 'FSSAI-12345',
      logoUrl: data?.logo_url || null
    }
  } catch (error) {
    console.error('Failed to fetch business settings:', error)
    // Return defaults
    return {
      name: import.meta.env.VITE_BUSINESS_NAME || 'BillSprout Pharmacy',
      email: import.meta.env.VITE_BUSINESS_EMAIL || 'support@billsprout.com',
      phone: '+91 98765 43210',
      address: import.meta.env.VITE_PHARMACY_ADDRESS || '123 Main Street, City - 123456',
      gstNumber: 'GST123456789',
      drugLicense: 'DL-1234567890',
      fssaiNumber: 'FSSAI-12345',
      logoUrl: null
    }
  }
}

/**
 * Fetch complete order details with items
 */
const fetchOrderDetails = async (orderId) => {
  const { data: order, error: orderError } = await supabase
    .from('customer_orders')
    .select(`
      *,
      customer:profiles!customer_id (
        id,
        full_name,
        email,
        phone
      )
    `)
    .eq('id', orderId)
    .single()
  
  if (orderError) throw orderError
  
  const { data: items, error: itemsError } = await supabase
    .from('customer_order_items')
    .select(`
      *,
      medicine:medicines (
        name,
        generic_name,
        manufacturer
      ),
      batch:medicine_batches (
        batch_number,
        expiry_date
      )
    `)
    .eq('order_id', orderId)
  
  if (itemsError) throw itemsError
  
  return { order, items }
}

/**
 * Generate PDF invoice for a customer order
 * Returns the PDF as a Blob
 */
export const generateInvoicePDF = async (orderId) => {
  try {
    // Fetch order details
    const { order, items } = await fetchOrderDetails(orderId)
    
    // Fetch business settings
    const business = await getBusinessSettings()
    
    // Create PDF document (A4 size)
    const doc = new jsPDF()
    
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 15
    let yPos = margin
    
    // =====================================
    // HEADER SECTION
    // =====================================
    
    // Business Name (Large, Bold)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55) // Gray-800
    doc.text(business.name, margin, yPos)
    yPos += 8
    
    // Business Details (Small)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128) // Gray-500
    doc.text(business.address, margin, yPos)
    yPos += 4
    doc.text(`Phone: ${business.phone} | Email: ${business.email}`, margin, yPos)
    yPos += 4
    doc.text(`GST: ${business.gstNumber} | Drug License: ${business.drugLicense}`, margin, yPos)
    yPos += 4
    doc.text(`FSSAI: ${business.fssaiNumber}`, margin, yPos)
    yPos += 10
    
    // Divider Line
    doc.setDrawColor(229, 231, 235) // Gray-200
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10
    
    // =====================================
    // INVOICE TITLE
    // =====================================
    
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(79, 70, 229) // Indigo-600
    doc.text('TAX INVOICE', margin, yPos)
    
    // Invoice Number & Date (Right aligned)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(31, 41, 55)
    const invoiceText = `Invoice #: ${order.order_number}`
    const dateText = `Date: ${formatDate(order.created_at)}`
    doc.text(invoiceText, pageWidth - margin, yPos, { align: 'right' })
    yPos += 5
    doc.text(dateText, pageWidth - margin, yPos, { align: 'right' })
    yPos += 10
    
    // =====================================
    // BILLING & DELIVERY INFO
    // =====================================
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('Bill To:', margin, yPos)
    
    doc.text('Ship To:', pageWidth / 2 + 10, yPos)
    yPos += 6
    
    // Customer Info (Left)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(order.customer.full_name || 'Customer', margin, yPos)
    doc.text(order.delivery_name || order.customer.full_name, pageWidth / 2 + 10, yPos)
    yPos += 5
    
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    if (order.customer.email) {
      doc.text(order.customer.email, margin, yPos)
    }
    yPos += 4
    
    if (order.customer.phone) {
      doc.text(order.customer.phone, margin, yPos)
    }
    
    // Delivery Address (Right)
    const deliveryAddress = [
      order.delivery_address,
      order.delivery_landmark ? `Landmark: ${order.delivery_landmark}` : '',
      order.delivery_city && order.delivery_pincode ? `${order.delivery_city} - ${order.delivery_pincode}` : '',
      order.delivery_state
    ].filter(Boolean).join('\n')
    
    const addressLines = doc.splitTextToSize(deliveryAddress, (pageWidth / 2) - 30)
    doc.text(addressLines, pageWidth / 2 + 10, yPos)
    
    yPos += Math.max(addressLines.length * 4, 12)
    yPos += 8
    
    // =====================================
    // ITEMS TABLE
    // =====================================
    
    const tableData = items.map((item, index) => [
      index + 1,
      item.medicine?.name || 'Unknown Medicine',
      item.medicine?.manufacturer || '-',
      item.batch?.batch_number || '-',
      formatDate(item.batch?.expiry_date),
      item.quantity.toString(),
      item.free_quantity > 0 ? item.free_quantity.toString() : '-',
      formatCurrency(item.unit_price),
      formatCurrency(item.cgst_amount + item.sgst_amount),
      formatCurrency(item.total_price)
    ])
    
    doc.autoTable({
      startY: yPos,
      head: [[
        '#', 
        'Medicine Name', 
        'Mfg.', 
        'Batch', 
        'Expiry', 
        'Qty', 
        'Free',
        'Price', 
        'GST',
        'Total'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229], // Indigo-600
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [31, 41, 55]
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // Gray-50
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 15, halign: 'center' },
        7: { cellWidth: 20, halign: 'right' },
        8: { cellWidth: 20, halign: 'right' },
        9: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    })
    
    yPos = doc.lastAutoTable.finalY + 10
    
    // =====================================
    // TOTALS SECTION (PAGE 1)
    // =====================================
    
    const totalsX = pageWidth - margin - 60
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(31, 41, 55)
    
    // Subtotal
    doc.text('Subtotal:', totalsX, yPos)
    doc.text(formatCurrency(order.subtotal), pageWidth - margin, yPos, { align: 'right' })
    yPos += 6
    
    // Discount
    if (order.discount > 0) {
      doc.setTextColor(220, 38, 38) // Red-600
      doc.text('Discount:', totalsX, yPos)
      doc.text(`- ${formatCurrency(order.discount)}`, pageWidth - margin, yPos, { align: 'right' })
      yPos += 6
      doc.setTextColor(31, 41, 55)
    }
    
    // GST
    doc.text('GST:', totalsX, yPos)
    doc.text(formatCurrency(order.gst_amount), pageWidth - margin, yPos, { align: 'right' })
    yPos += 6
    
    // Delivery Charge
    if (order.delivery_charge > 0) {
      doc.text('Delivery:', totalsX, yPos)
      doc.text(formatCurrency(order.delivery_charge), pageWidth - margin, yPos, { align: 'right' })
      yPos += 6
    }
    
    // Total Line
    doc.setLineWidth(0.5)
    doc.line(totalsX, yPos, pageWidth - margin, yPos)
    yPos += 6
    
    // Grand Total
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(79, 70, 229) // Indigo-600
    doc.text('Grand Total:', totalsX, yPos)
    doc.text(formatCurrency(order.total), pageWidth - margin, yPos, { align: 'right' })
    yPos += 10
    
    // Payment Method
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    const paymentMethod = order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'
    const paymentStatus = order.payment_status === 'paid' ? 'PAID' : 'PENDING'
    doc.text(`Payment: ${paymentMethod} | Status: ${paymentStatus}`, totalsX, yPos)
    
    // Page 1 Footer (at bottom of page 1)
    const page1FooterY = pageHeight - 15
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.3)
    doc.line(margin, page1FooterY, pageWidth - margin, page1FooterY)
    
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(156, 163, 175)
    doc.text(
      `This is a computer-generated invoice and does not require signature | Generated on ${formatDate(new Date())}`,
      pageWidth / 2,
      page1FooterY + 5,
      { align: 'center' }
    )
    
    // =====================================
    // PAGE 2: TERMS & CONDITIONS + BANK DETAILS
    // =====================================
    
    doc.addPage() // Force new page
    yPos = margin + 5
    
    // Page 2 Header - Business Name (smaller)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(79, 70, 229)
    doc.text(business.name, margin, yPos)
    yPos += 8
    
    // Divider
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.3)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10
    
    // Terms & Conditions
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('Terms & Conditions', margin, yPos)
    yPos += 7
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(55, 65, 81)
    const terms = [
      '1. Goods once sold cannot be returned or exchanged.',
      '2. Prescription medicines require a valid prescription from a registered medical practitioner.',
      '3. Please check the expiry date before use.',
      '4. Store medicines as per package instructions.',
      '5. Keep medicines out of reach of children.',
      '6. In case of any dispute, the matter will be subject to local jurisdiction only.',
      '7. Payment terms: Payment must be made as per the agreed terms.',
      '8. Delivery charges are non-refundable.'
    ]
    
    terms.forEach(term => {
      doc.text(term, margin, yPos)
      yPos += 5
    })
    
    yPos += 8
    
    // Bank Details Section
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('Bank Details', margin, yPos)
    yPos += 7
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(55, 65, 81)
    
    const bankDetails = [
      `Bank Name: ${business.bankName || 'ABC Bank'}`,
      `Account Name: ${business.name}`,
      `Account Number: ${business.accountNumber || 'XXXX-XXXX-XXXX'}`,
      `IFSC Code: ${business.ifscCode || 'ABCD0123456'}`,
      `Branch: ${business.branch || 'Main Branch'}`
    ]
    
    bankDetails.forEach(detail => {
      doc.text(detail, margin, yPos)
      yPos += 5
    })
    
    yPos += 10
    
    // Thank you message
    doc.setFontSize(12)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(79, 70, 229)
    doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('For any queries, please contact us at the above details.', pageWidth / 2, yPos, { align: 'center' })
    
    // Page 2 Footer
    const page2FooterY = pageHeight - 15
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.3)
    doc.line(margin, page2FooterY, pageWidth - margin, page2FooterY)
    
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(156, 163, 175)
    doc.text(
      `${business.name} | ${business.email} | ${business.phone}`,
      pageWidth / 2,
      page2FooterY + 5,
      { align: 'center' }
    )
    
    // Return PDF as Blob
    return doc.output('blob')
    
  } catch (error) {
    console.error('Failed to generate invoice PDF:', error)
    throw new Error(`Invoice generation failed: ${error.message}`)
  }
}

/**
 * Download invoice PDF
 */
export const downloadInvoice = async (orderId, orderNumber) => {
  try {
    const blob = await generateInvoicePDF(orderId)
    
    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Invoice_${orderNumber || orderId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    return { success: true }
  } catch (error) {
    console.error('Failed to download invoice:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Generate and upload invoice to Supabase Storage
 * Returns the public URL
 */
export const uploadInvoiceToStorage = async (orderId, orderNumber) => {
  try {
    const blob = await generateInvoicePDF(orderId)
    
    // Upload to Supabase Storage
    const fileName = `invoices/${orderNumber || orderId}_${Date.now()}.pdf`
    
    const { data, error } = await supabase.storage
      .from('documents') // Make sure this bucket exists
      .upload(fileName, blob, {
        contentType: 'application/pdf',
        upsert: true
      })
    
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)
    
    return { success: true, url: publicUrl, path: fileName }
  } catch (error) {
    console.error('Failed to upload invoice:', error)
    return { success: false, error: error.message }
  }
}

export default {
  generateInvoicePDF,
  downloadInvoice,
  uploadInvoiceToStorage
}
