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

const WholesaleInvoice = ({ 
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
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        .wholesale-invoice {
          font-family: Arial, sans-serif;
          background: white;
          color: black;
          width: 210mm;
          min-height: 297mm;
          padding: 8mm;
          font-size: 9pt;
          line-height: 1.3;
          position: relative;
        }

        .wholesale-invoice * {
          box-sizing: border-box;
        }

        /* Page Border */
        .page-border {
          border: 2px solid #000;
          padding: 8px;
          min-height: 277mm;
        }

        /* Header */
        .invoice-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }

        .company-name {
          font-size: 18pt;
          font-weight: bold;
          color: #1e3a8a;
          margin-bottom: 4px;
          letter-spacing: 1px;
        }

        .company-type {
          font-size: 9pt;
          color: #1e3a8a;
          text-decoration: underline;
          margin-bottom: 4px;
        }

        .company-address {
          font-size: 8pt;
          line-height: 1.4;
          margin-bottom: 6px;
        }

        .invoice-title {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 8px;
          padding: 4px;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
        }

        /* Bill To Section */
        .bill-info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 8pt;
          border-bottom: 1px solid #000;
          padding-bottom: 6px;
        }

        .bill-to {
          flex: 1;
          padding-right: 20px;
        }

        .bill-meta {
          text-align: right;
          min-width: 150px;
        }

        .bill-to-title {
          font-weight: bold;
          margin-bottom: 4px;
          font-size: 9pt;
        }

        .info-line {
          margin-bottom: 2px;
        }

        .info-label {
          font-weight: bold;
        }

        /* Product Table */
        .product-table-wrapper {
          margin-bottom: 8px;
        }

        .product-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
        }

        .product-table thead {
          background: #B9F0F3;
        }

        .product-table th {
          border: 1px solid #000;
          padding: 4px 2px;
          text-align: center;
          font-weight: bold;
          line-height: 1.2;
        }

        .product-table td {
          border: 1px solid #000;
          padding: 4px 3px;
          vertical-align: middle;
        }

        .product-table .text-left { text-align: left; }
        .product-table .text-center { text-align: center; }
        .product-table .text-right { text-align: right; }

        /* Column Widths */
        .col-sr { width: 25px; }
        .col-product { width: auto; min-width: 120px; }
        .col-mfr { width: 70px; }
        .col-hsn { width: 45px; }
        .col-pack { width: 35px; }
        .col-qty { width: 30px; }
        .col-free { width: 30px; }
        .col-batch { width: 55px; }
        .col-exp { width: 40px; }
        .col-mrp { width: 45px; }
        .col-rate { width: 45px; }
        .col-disc { width: 30px; }
        .col-gst-pct { width: 35px; }
        .col-gst-amt { width: 45px; }
        .col-amount { width: 55px; }

        .product-name {
          font-weight: 600;
          word-wrap: break-word;
        }

        /* GST Summary Section */
        .footer-section {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
        }

        .gst-summary {
          flex: 1;
          margin-right: 10px;
        }

        .gst-summary-title {
          font-weight: bold;
          margin-bottom: 4px;
          font-size: 9pt;
        }

        .gst-summary-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
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

        .gst-summary-table .text-right {
          text-align: right;
        }

        /* Totals Section */
        .totals-section {
          width: 280px;
          border: 2px solid #000;
        }

        .totals-table {
          width: 100%;
          font-size: 9pt;
        }

        .totals-table td {
          padding: 4px 8px;
          border-bottom: 1px solid #ccc;
        }

        .totals-table .label-col {
          font-weight: 600;
          text-align: left;
        }

        .totals-table .value-col {
          text-align: right;
          min-width: 80px;
        }

        .grand-total-row {
          font-weight: bold;
          font-size: 11pt;
          background: #f0f0f0;
          border-top: 2px solid #000;
        }

        .grand-total-row td {
          padding: 6px 8px;
          border-bottom: none;
        }

        /* Amount in Words */
        .amount-words {
          margin-top: 8px;
          padding: 6px;
          border: 1px solid #000;
          font-size: 8pt;
        }

        .amount-words-label {
          font-weight: bold;
        }

        /* Notes Section */
        .notes-section {
          margin-top: 8px;
          padding: 6px;
          border: 1px solid #000;
          font-size: 7pt;
          line-height: 1.4;
        }

        .notes-title {
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 4px;
        }

        /* Page 2 - Terms & Conditions */
        .terms-page {
          page-break-before: always;
          font-family: Arial, sans-serif;
          background: white;
          color: black;
          width: 210mm;
          min-height: 297mm;
          padding: 8mm;
          font-size: 9pt;
        }

        .terms-header {
          text-align: center;
          font-weight: bold;
          font-size: 12pt;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 2px solid #000;
        }

        .terms-content {
          font-size: 8pt;
          line-height: 1.6;
        }

        .terms-content h4 {
          margin-top: 12px;
          margin-bottom: 6px;
          font-size: 9pt;
        }

        .terms-content ul {
          margin-left: 20px;
          margin-bottom: 10px;
        }

        .terms-content li {
          margin-bottom: 4px;
        }

        .bank-details {
          margin-top: 16px;
          padding: 10px;
          border: 1px solid #000;
          background: #f9f9f9;
        }

        .bank-details-title {
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 10pt;
        }

        .signature-section {
          margin-top: 40px;
          text-align: right;
          padding-right: 40px;
        }

        .signature-line {
          margin-top: 60px;
          padding-top: 2px;
          border-top: 1px solid #000;
          display: inline-block;
          min-width: 200px;
          text-align: center;
        }

        @media print {
          .wholesale-invoice, .terms-page {
            margin: 0;
            padding: 8mm;
            width: 100%;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Page 1 - Invoice */}
      <div className="wholesale-invoice">
        <div className="page-border">
          {/* Header */}
          <div className="invoice-header">
            <div className="company-name">{companyDetails.pharmacy_name || 'LIFESPROUTS CARE LLP'}</div>
            <div className="company-type">Pharmaceutical Distributors</div>
            <div className="company-address">
              {companyDetails.address || 'SHOP NO. 1, PROPERTY NO.642, GROUND FLOOR'}<br/>
              {companyDetails.state || 'TELANGANA'} | Phone: {companyDetails.phone || '9666105832'}<br/>
              GSTIN: {companyDetails.gstin || '36CTUPD3541E1ZO'} | D.L. NO: {companyDetails.drug_license_number || '(20B&21B)TG/AS/2025-139054'}<br/>
              {companyDetails.fssai_number && `FSSAI: ${companyDetails.fssai_number} | `}
              Email: {companyDetails.email || 'vedithapharma@gmail.com'}
            </div>
            <div className="invoice-title">GST INVOICE</div>
          </div>

          {/* Bill To Section */}
          <div className="bill-info-section">
            <div className="bill-to">
              <div className="bill-to-title">M/S: {customer?.business_name || customer?.name || 'WALK-IN CUSTOMER'}</div>
              {customer?.address && <div className="info-line">{customer.address}</div>}
              {customer?.phone && <div className="info-line">PHONE: {customer.phone}</div>}
              {customer?.gstin && <div className="info-line"><span className="info-label">GSTIN:</span> {customer.gstin}</div>}
              {customer?.drug_license_number && <div className="info-line"><span className="info-label">D.L. NO:</span> {customer.drug_license_number}</div>}
            </div>
            <div className="bill-meta">
              <div className="info-line"><span className="info-label">INVOICE NO:</span> {sale.invoice_number}</div>
              <div className="info-line"><span className="info-label">Date:</span> {invoiceDate.toLocaleDateString('en-GB')}</div>
            </div>
          </div>

          {/* Product Table */}
          <div className="product-table-wrapper">
            <table className="product-table">
              <thead>
                <tr>
                  <th className="col-sr">Sr</th>
                  <th className="col-product">Product Name</th>
                  <th className="col-mfr">Mfr</th>
                  <th className="col-hsn">HSN</th>
                  <th className="col-pack">Pack</th>
                  <th className="col-qty">Qty</th>
                  <th className="col-free">Off/<br/>Free</th>
                  <th className="col-batch">Batch</th>
                  <th className="col-exp">Exp</th>
                  <th className="col-mrp">M.R.P</th>
                  <th className="col-rate">Rate</th>
                  <th className="col-disc">Free</th>
                  <th className="col-gst-pct">GST%</th>
                  <th className="col-gst-amt">GST<br/>Amt</th>
                  <th className="col-amount">Amount</th>
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
                      <td className="text-center" style={{fontSize: '7pt'}}>
                        {item.medicine.manufacturer || '-'}
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
                
                {/* Add empty rows if needed */}
                {items.length < 5 && Array(5 - items.length).fill(0).map((_, i) => (
                  <tr key={`empty-${i}`} style={{height: '25px'}}>
                    <td colSpan="15">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with GST Summary and Totals */}
          <div className="footer-section">
            {/* GST Summary Table */}
            <div className="gst-summary">
              <div className="gst-summary-title">CLASS WISE GST SUMMARY</div>
              <table className="gst-summary-table">
                <thead>
                  <tr>
                    <th>CLASS</th>
                    <th>TOTAL</th>
                    <th>SGST</th>
                    <th>DISC</th>
                    <th>IGST</th>
                    <th>TOTAL GST</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(totals.gstBreakdown).map(([rate, values]) => (
                    <tr key={rate}>
                      <td>GST {rate}%</td>
                      <td className="text-right">{values.taxable.toFixed(2)}</td>
                      <td className="text-right">{values.sgst.toFixed(2)}</td>
                      <td className="text-right">0.00</td>
                      <td className="text-right">{values.igst.toFixed(2)}</td>
                      <td className="text-right">{values.totalGst.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{fontWeight: 'bold'}}>
                    <td>TOTAL</td>
                    <td className="text-right">{totals.taxableValue.toFixed(2)}</td>
                    <td className="text-right">{totals.totalSgst.toFixed(2)}</td>
                    <td className="text-right">0.00</td>
                    <td className="text-right">{totals.totalIgst.toFixed(2)}</td>
                    <td className="text-right">{totals.totalTax.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="totals-section">
              <table className="totals-table">
                <tbody>
                  <tr>
                    <td className="label-col">GST PAYABLE</td>
                    <td className="value-col">{totals.totalTax.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="label-col">SUB TOTAL</td>
                    <td className="value-col">{totals.taxableValue.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="label-col">CGST</td>
                    <td className="value-col">{totals.totalCgst.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="label-col">SGST</td>
                    <td className="value-col">{totals.totalSgst.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="label-col">CREDIT</td>
                    <td className="value-col">0.00</td>
                  </tr>
                  <tr>
                    <td className="label-col">ROUND OFF</td>
                    <td className="value-col">{totals.roundOff.toFixed(2)}</td>
                  </tr>
                  <tr className="grand-total-row">
                    <td className="label-col">GRAND TOTAL</td>
                    <td className="value-col">{totals.netPayable.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="amount-words">
            <span className="amount-words-label">Rs. (IN WORDS):</span> {amountToWords(totals.netPayable).toUpperCase()}
          </div>

          {/* Notes */}
          <div className="notes-section">
            <div className="notes-title">NOTE:</div>
            <div>
              1. GOODS ONCE SOLD WILL NOT BE TAKEN BACK OR EXCHANGED.<br/>
              2. Bills not paid due date will attract 24% interest.<br/>
              3. Interest @2% per month will be charged for all outstanding bills.<br/>
              4. DISPATCHED THE FILLED QUANTITY AS PER COMMERCIAL POLICY OF THE COMPANY ANNOUNCED FROM TIME TO TIME.<br/>
              5. All disputes are subject to jurisdiction of {companyDetails.state || 'TELANGANA'} court only.<br/>
              6. Payment...
            </div>
          </div>
        </div>
      </div>

      {/* Page 2 - Terms & Conditions */}
      <div className="terms-page">
        <div className="page-border">
          <div className="terms-header">
            Terms & Conditions<br/>
            For {companyDetails.pharmacy_name || 'LIFESPROUTS CARE LLP'}
          </div>

          <div className="terms-content">
            <h4>General Terms:</h4>
            <ul>
              <li>Goods once sold will not be taken back or exchanged.</li>
              <li>Bills not paid due date will attract 24% interest.</li>
              <li>Interest @2% per month will be charged for all outstanding bills.</li>
              <li>All payments must be made within the prescribed credit period.</li>
              <li>Sales Tax declaration will be given as per government norms.</li>
            </ul>

            <h4>Delivery & Returns:</h4>
            <ul>
              <li>Dispatched the filled quantity as per commercial policy of the company announced from time to time.</li>
              <li>Claims for shortage or damage must be reported within 24 hours of delivery.</li>
              <li>Expired products will not be accepted for return.</li>
              <li>Near-expiry returns subject to company policy.</li>
            </ul>

            <h4>Legal:</h4>
            <ul>
              <li>All disputes are subject to jurisdiction of {companyDetails.state || 'TELANGANA'} court only.</li>
              <li>E. & O.E. - Errors and Omissions Excepted</li>
            </ul>

            <div className="bank-details">
              <div className="bank-details-title">Bank Details: {companyDetails.pharmacy_name || 'LIFESPROUTS CARE LLP'}</div>
              <div><strong>Bank Name:</strong> {companyDetails.bank_name || 'HDFC BANK'}</div>
              <div><strong>Branch:</strong> {companyDetails.bank_branch || 'Main Branch'}</div>
              <div><strong>A/C NO:</strong> {companyDetails.bank_account || '50200012345678'}</div>
              <div><strong>IFSC CODE:</strong> {companyDetails.bank_ifsc || 'HDFC0000372'}</div>
              <div><strong>NEFT CODE:</strong> {companyDetails.bank_ifsc || 'HDFC0000372'}</div>
            </div>
          </div>

          <div className="signature-section">
            <div>Checked By: ________________</div>
            <div className="signature-line">
              <strong>Authorised signatory</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default WholesaleInvoice
