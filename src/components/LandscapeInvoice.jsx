import React from 'react'

// Helper function to convert number to words (Indian format)
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

  if (num === 0) return 'Zero'

  const crore = Math.floor(num / 10000000)
  const lakh = Math.floor((num % 10000000) / 100000)
  const thousand = Math.floor((num % 100000) / 1000)
  const hundred = Math.floor((num % 1000) / 100)
  const remainder = num % 100

  let words = ''

  if (crore > 0) words += ones[crore] + ' Crore '
  if (lakh > 0) words += (lakh < 20 ? teens[lakh - 10] || ones[lakh] : tens[Math.floor(lakh / 10)] + ' ' + ones[lakh % 10]) + ' Lakh '
  if (thousand > 0) words += (thousand < 20 ? teens[thousand - 10] || ones[thousand] : tens[Math.floor(thousand / 10)] + ' ' + ones[thousand % 10]) + ' Thousand '
  if (hundred > 0) words += ones[hundred] + ' Hundred '
  if (remainder > 0) {
    if (remainder < 10) words += ones[remainder]
    else if (remainder < 20) words += teens[remainder - 10]
    else words += tens[Math.floor(remainder / 10)] + ' ' + ones[remainder % 10]
  }

  return words.trim()
}

const amountToWords = (amount) => {
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  
  let words = 'Rupees ' + numberToWords(rupees)
  if (paise > 0) words += ' and ' + numberToWords(paise) + ' Paise'
  words += ' Only'
  
  return words
}

const LandscapeInvoice = ({ 
  sale, 
  items, 
  customer, 
  companyDetails 
}) => {
  // Calculate totals and GST breakdown
  const calculateTotals = () => {
    let totalQty = 0
    let totalFree = 0
    let subtotal = 0
    let totalDiscountAmt = 0
    
    const gstBreakdown = {}

    items.forEach(item => {
      totalQty += item.quantity
      totalFree += item.freeQuantity || 0
      
      const itemTotal = item.quantity * item.price
      const discountAmt = (itemTotal * (item.discount || 0)) / 100
      const taxableAmount = itemTotal - discountAmt
      
      subtotal += itemTotal
      totalDiscountAmt += discountAmt
      
      const gstRate = item.medicine.gst_percentage || 0
      const gstAmount = (taxableAmount * gstRate) / 100
      
      // GST breakdown by rate
      if (!gstBreakdown[gstRate]) {
        gstBreakdown[gstRate] = { 
          taxable: 0, 
          cgst: 0, 
          sgst: 0, 
          igst: 0,
          totalGst: 0 
        }
      }
      gstBreakdown[gstRate].taxable += taxableAmount
      gstBreakdown[gstRate].cgst += gstAmount / 2
      gstBreakdown[gstRate].sgst += gstAmount / 2
      gstBreakdown[gstRate].totalGst += gstAmount
    })

    const taxableValue = subtotal - totalDiscountAmt
    let totalCgst = 0
    let totalSgst = 0
    let totalIgst = 0

    Object.values(gstBreakdown).forEach(tax => {
      totalCgst += tax.cgst
      totalSgst += tax.sgst
      totalIgst += tax.igst
    })

    const totalTax = totalCgst + totalSgst + totalIgst
    const grandTotal = taxableValue + totalTax
    const roundOff = Math.round(grandTotal) - grandTotal
    const netPayable = Math.round(grandTotal)

    return {
      totalQty,
      totalFree,
      subtotal,
      totalDiscountAmt,
      taxableValue,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      grandTotal,
      roundOff,
      netPayable,
      gstBreakdown
    }
  }

  const totals = calculateTotals()
  const invoiceDate = new Date(sale.created_at)

  return (
    <div className="invoice-container">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 5mm;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body {
          width: 100%;
          height: 100%;
        }

        .invoice-container {
          font-family: Arial, sans-serif;
          width: 210mm;
          margin: 0 auto;
        }

        .page {
          width: 210mm;
          height: 287mm;
          page-break-after: always;
          page-break-inside: avoid;
          position: relative;
          background: white;
        }

        .page:last-child {
          page-break-after: auto;
        }

        /* Page Content Wrappers */
        .page-content {
          border: 2px solid #000;
          margin: 5mm;
          padding: 0;
          height: calc(287mm - 10mm);
        }

        /* Header */
        .invoice-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding: 8px 10px 6px 10px;
        }

        .company-name {
          font-size: 20pt;
          font-weight: bold;
          color: #1e40af;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }

        .company-type {
          font-size: 9pt;
          color: #1e40af;
          text-decoration: underline;
          margin-bottom: 3px;
        }

        .company-address {
          font-size: 7.5pt;
          line-height: 1.4;
          color: #000;
        }

        .invoice-title {
          font-size: 13pt;
          font-weight: bold;
          margin-top: 6px;
          padding: 3px 0;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
        }

        /* Customer Section */
        .customer-section {
          display: flex;
          justify-content: space-between;
          padding: 6px 10px;
          border-bottom: 2px solid #000;
          font-size: 7.5pt;
          line-height: 1.5;
        }

        .customer-left {
          flex: 1;
        }

        .customer-right {
          text-align: right;
          min-width: 120px;
        }

        .customer-name {
          font-weight: bold;
          margin-bottom: 2px;
        }

        /* Product Table */
        .product-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7pt;
        }

        .product-table thead {
          background: #b9f0f3;
        }

        .product-table th {
          border: 1px solid #000;
          padding: 4px 2px;
          text-align: center;
          font-weight: bold;
          line-height: 1.1;
          vertical-align: middle;
        }

        .product-table td {
          border: 1px solid #000;
          padding: 4px 3px;
          vertical-align: middle;
        }

        .text-left { text-align: left; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }

        /* Column Widths */
        .col-sr { width: 20px; }
        .col-product { width: auto; min-width: 100px; }
        .col-mfr { width: 55px; }
        .col-hsn { width: 38px; }
        .col-pack { width: 32px; }
        .col-qty { width: 28px; }
        .col-free { width: 28px; }
        .col-batch { width: 50px; }
        .col-exp { width: 35px; }
        .col-mrp { width: 42px; }
        .col-rate { width: 42px; }
        .col-disc { width: 28px; }
        .col-gst-pct { width: 32px; }
        .col-gst-amt { width: 42px; }
        .col-amount { width: 52px; }

        .product-name {
          font-weight: 600;
          font-size: 7.5pt;
          word-wrap: break-word;
        }

        /* Footer Section */
        .footer-section {
          display: flex;
          padding: 6px 10px;
          gap: 8px;
          border-top: 2px solid #000;
        }

        .gst-summary {
          flex: 1;
        }

        .gst-summary-title {
          font-weight: bold;
          font-size: 8pt;
          margin-bottom: 4px;
        }

        .gst-summary-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7pt;
        }

        .gst-summary-table th,
        .gst-summary-table td {
          border: 1px solid #000;
          padding: 3px 4px;
          text-align: center;
        }

        .gst-summary-table th {
          background: #e8e8e8;
          font-weight: bold;
        }

        .totals-box {
          width: 240px;
        }

        .totals-table {
          width: 100%;
          font-size: 8pt;
          border-collapse: collapse;
        }

        .totals-table td {
          padding: 3px 6px;
          border-bottom: 1px solid #ddd;
        }

        .totals-label {
          font-weight: 600;
          text-align: left;
        }

        .totals-value {
          text-align: right;
          min-width: 70px;
        }

        .grand-total-row {
          font-weight: bold;
          font-size: 9pt;
          background: #f5f5f5;
          border-top: 2px solid #000;
        }

        .grand-total-row td {
          padding: 5px 6px;
          border-bottom: none;
        }

        /* Notes Section */
        .notes-section {
          padding: 8px 10px;
          border-top: 1px solid #000;
          font-size: 6.5pt;
          line-height: 1.5;
        }

        .notes-title {
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 4px;
        }

        /* Page 2 Styles */
        .terms-header {
          text-align: center;
          font-weight: bold;
          font-size: 12pt;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #000;
        }

        .terms-text {
          font-size: 8pt;
          line-height: 1.6;
          padding: 0 15px;
        }

        .terms-text p {
          margin-bottom: 8px;
        }

        .bank-details-box {
          margin: 20px 15px;
          padding: 12px;
          border: 1px solid #000;
          background: #f9f9f9;
        }

        .bank-details-title {
          font-weight: bold;
          font-size: 10pt;
          margin-bottom: 8px;
        }

        .bank-details-content {
          font-size: 8pt;
          line-height: 1.6;
        }

        .signature-area {
          margin: 50px 15px 15px 15px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .checked-by {
          font-size: 9pt;
        }

        .authorized-sig {
          text-align: center;
        }

        .sig-line {
          margin-top: 60px;
          padding-top: 2px;
          border-top: 1px solid #000;
          min-width: 180px;
          font-weight: bold;
          font-size: 9pt;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .invoice-container {
            width: 100%;
          }

          .page {
            page-break-after: always !important;
            page-break-inside: avoid !important;
            width: 100%;
            height: auto;
          }

          .page:last-child {
            page-break-after: auto !important;
          }
        }
      `}</style>

      {/* Page 1 - Invoice */}
      <div className="page">
        <div className="page-content">
          {/* Header */}
          <div className="invoice-header">
            <div className="company-name">{companyDetails.pharmacy_name || 'LIFESPROUT CARE LLP'}</div>
            <div className="company-type">Pharmaceutical Distributors</div>
            <div className="company-address">
              {companyDetails.address || 'SHOP NO. 1, PROPERTY NO.642, GROUND FLOOR'}<br/>
              NEAR FOREST OFFICE AT POST: PATAN, TAL: JIVAJI NAGAR<br/>
              GSTIN: {companyDetails.gstin || '36CTUPD3541E1ZO'} | 
              D.L. NO: {companyDetails.drug_license_number || '(20B&21B)TG/AS/2025-139054'}<br/>
              {companyDetails.fssai_number && `FSSAI: ${companyDetails.fssai_number} | `}
              Phone: {companyDetails.phone || '9666105832'} | 
              Email: {companyDetails.email || 'care@lifesproutcare.com'}
            </div>
            <div className="invoice-title">GST INVOICE</div>
          </div>

          {/* Customer Section */}
          <div className="customer-section">
            <div className="customer-left">
              <div className="customer-name">
                M/S: {customer?.business_name || customer?.name || 'Walk-in Customer'}
              </div>
              {customer?.address && <div>{customer.address}</div>}
              {customer?.phone && <div>PHONE: {customer.phone}</div>}
              {customer?.gstin && <div>GSTIN: {customer.gstin}</div>}
            </div>
            <div className="customer-right">
              <div><strong>INVOICE NO:</strong> {sale.invoice_number}</div>
              <div><strong>Date:</strong> {invoiceDate.toLocaleDateString('en-GB')}</div>
            </div>
          </div>

          {/* Product Table */}
          <table className="product-table">
            <thead>
              <tr>
                <th className="col-sr">Sr</th>
                <th className="col-product text-left">Product Name</th>
                <th className="col-mfr">Mfr</th>
                <th className="col-hsn">HSN</th>
                <th className="col-pack">Pack</th>
                <th className="col-qty">Qty</th>
                <th className="col-free">Off/<br/>Free</th>
                <th className="col-batch">Batch</th>
                <th className="col-exp">Exp</th>
                <th className="col-mrp">M.R.P</th>
                <th className="col-rate">Rate</th>
                <th className="col-disc">Disc</th>
                <th className="col-gst-pct">GST<br/>%</th>
                <th className="col-gst-amt">GST<br/>Amt</th>
                <th className="col-amount text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const itemTotal = item.quantity * item.price
                const discountAmt = (itemTotal * (item.discount || 0)) / 100
                const taxableAmount = itemTotal - discountAmt
                const gstRate = item.medicine.gst_percentage || 0
                const gstAmount = (taxableAmount * gstRate) / 100
                const totalWithGst = taxableAmount + gstAmount
                
                return (
                  <tr key={index}>
                    <td className="text-center">{index + 1}</td>
                    <td className="text-left">
                      <div className="product-name">{item.medicine.name}</div>
                    </td>
                    <td className="text-center" style={{fontSize: '6pt'}}>
                      {item.medicine.manufacturer?.substring(0, 8) || '-'}
                    </td>
                    <td className="text-center">{item.medicine.hsn_code || '3004'}</td>
                    <td className="text-center">{item.medicine.pack_size || '10'}</td>
                    <td className="text-center"><strong>{item.quantity}</strong></td>
                    <td className="text-center">{item.freeQuantity || 0}</td>
                    <td className="text-center">{item.batch.batch_number}</td>
                    <td className="text-center">
                      {new Date(item.batch.expiry_date).toLocaleDateString('en-GB', { 
                        month: '2-digit', 
                        year: '2-digit' 
                      })}
                    </td>
                    <td className="text-right">{item.batch.mrp?.toFixed(2) || '0.00'}</td>
                    <td className="text-right">{item.price.toFixed(2)}</td>
                    <td className="text-center">{item.discount || 0}</td>
                    <td className="text-center">{gstRate.toFixed(0)}</td>
                    <td className="text-right">{gstAmount.toFixed(2)}</td>
                    <td className="text-right"><strong>{totalWithGst.toFixed(2)}</strong></td>
                  </tr>
                )
              })}
              
              {/* Fill empty rows */}
              {items.length < 8 && Array(8 - items.length).fill(0).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td colSpan="15">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer with GST Summary and Totals */}
          <div className="footer-section">
            <div className="gst-summary">
              <div className="gst-summary-title">GST SUMMARY</div>
              <table className="gst-summary-table">
                <thead>
                  <tr>
                    <th>Rate</th>
                    <th>Taxable</th>
                    <th>CGST</th>
                    <th>SGST</th>
                    <th>Total GST</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(totals.gstBreakdown).map(([rate, values]) => (
                    <tr key={rate}>
                      <td>{rate}%</td>
                      <td className="text-right">{values.taxable.toFixed(2)}</td>
                      <td className="text-right">{values.cgst.toFixed(2)}</td>
                      <td className="text-right">{values.sgst.toFixed(2)}</td>
                      <td className="text-right">{values.totalGst.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="totals-box">
              <table className="totals-table">
                <tbody>
                  <tr>
                    <td className="totals-label">SUBTOTAL</td>
                    <td className="totals-value">{totals.taxableValue.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="totals-label">CGST</td>
                    <td className="totals-value">{totals.totalCgst.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="totals-label">SGST</td>
                    <td className="totals-value">{totals.totalSgst.toFixed(2)}</td>
                  </tr>
                  <tr className="grand-total-row">
                    <td className="totals-label">GRAND TOTAL</td>
                    <td className="totals-value">₹{totals.netPayable.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="notes-section">
            <div className="notes-title">Amount in Words:</div>
            <div>{amountToWords(totals.netPayable)}</div>
          </div>
        </div>
      </div>

      {/* Page 2 - Terms & Conditions */}
      <div className="page">
        <div className="page-content">
          <div className="terms-header">
            Terms & Conditions<br/>
            {companyDetails.pharmacy_name || 'LIFESPROUT CARE LLP'}
          </div>

          <div className="terms-text">
            <p><strong>General Terms:</strong></p>
            <p>• Goods once sold will not be taken back or exchanged.</p>
            <p>• Bills not paid by due date will attract 24% interest per annum.</p>
            <p>• Interest @2% per month will be charged for all outstanding bills.</p>
            <p>• All disputes are subject to {companyDetails.state || 'TELANGANA'} jurisdiction only.</p>
            <p>• Payment terms as agreed at the time of sale.</p>
          </div>

          <div className="bank-details-box">
            <div className="bank-details-title">
              Bank Details
            </div>
            <div className="bank-details-content">
              <div><strong>Bank Name:</strong> {companyDetails.bank_name || 'HDFC BANK'}</div>
              <div><strong>Branch:</strong> {companyDetails.bank_branch || 'Main Branch'}</div>
              <div><strong>A/C NO:</strong> {companyDetails.bank_account || '50200012345678'}</div>
              <div><strong>IFSC CODE:</strong> {companyDetails.bank_ifsc || 'HDFC0000372'}</div>
            </div>
          </div>

          <div className="signature-area">
            <div className="checked-by">Checked By: ________________</div>
            <div className="authorized-sig">
              <div className="sig-line">Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandscapeInvoice
