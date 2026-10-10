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
  // Calculate totals
  const calculateTotals = () => {
    let totalQty = 0
    let totalFree = 0
    let subtotal = 0
    let totalDiscount = 0
    let totalDiscountAmt = 0
    let cgst = 0
    let sgst = 0
    let igst = 0
    
    const taxSummary = {}

    items.forEach(item => {
      totalQty += item.quantity
      totalFree += item.freeQuantity || 0
      
      const itemTotal = item.quantity * item.price
      const discountAmt = (itemTotal * (item.discount || 0)) / 100
      const taxableAmount = itemTotal - discountAmt
      
      subtotal += itemTotal
      totalDiscount += (item.discount || 0)
      totalDiscountAmt += discountAmt
      
      const gstRate = item.medicine.gst_percentage || 0
      const gstAmount = (taxableAmount * gstRate) / 100
      
      // For intra-state: split into CGST and SGST
      const cgstAmount = gstAmount / 2
      const sgstAmount = gstAmount / 2
      
      cgst += cgstAmount
      sgst += sgstAmount
      
      // Group by GST rate for summary
      if (!taxSummary[gstRate]) {
        taxSummary[gstRate] = { taxable: 0, cgst: 0, sgst: 0 }
      }
      taxSummary[gstRate].taxable += taxableAmount
      taxSummary[gstRate].cgst += cgstAmount
      taxSummary[gstRate].sgst += sgstAmount
    })

    const taxableValue = subtotal - totalDiscountAmt
    const totalTax = cgst + sgst + igst
    const grandTotal = taxableValue + totalTax
    const roundOff = Math.round(grandTotal) - grandTotal
    const netPayable = Math.round(grandTotal)

    return {
      totalQty,
      totalFree,
      subtotal,
      totalDiscount,
      totalDiscountAmt,
      taxableValue,
      cgst,
      sgst,
      igst,
      totalTax,
      grandTotal,
      roundOff,
      netPayable,
      taxSummary
    }
  }

  const totals = calculateTotals()
  const isWholesale = sale.sale_type === 'wholesale'
  const invoiceDate = new Date(sale.created_at)

  return (
    <div className="landscape-invoice">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm;
        }

        .landscape-invoice {
          font-family: 'Arial', sans-serif;
          background: #f5f5dc;
          color: black;
          width: 277mm;
          min-height: 190mm;
          padding: 10px;
          font-size: 10pt;
          line-height: 1.2;
          position: relative;
        }

        .landscape-invoice * {
          box-sizing: border-box;
        }

        /* Header Section */
        .invoice-header {
          border: 1px solid #000;
          background: #f5f5dc;
          padding: 6px 10px;
          margin-bottom: 2px;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 4px;
          border-bottom: 1px solid #000;
        }

        .company-section {
          flex: 1;
        }

        .company-name {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 2px;
          color: #000;
        }

        .company-info {
          font-size: 8pt;
          line-height: 1.3;
        }

        .invoice-meta-top {
          text-align: right;
          font-size: 9pt;
        }

        .invoice-meta-top div {
          margin-bottom: 2px;
        }

        .header-bottom {
          padding-top: 4px;
          display: flex;
          justify-content: space-between;
          font-size: 9pt;
        }

        .customer-section {
          flex: 1;
        }

        .info-row {
          margin-bottom: 2px;
          font-size: 9pt;
        }

        .info-label {
          font-weight: bold;
          display: inline-block;
          min-width: 90px;
        }

        /* Medicine Table */
        .medicine-table-wrapper {
          border: 1px solid #000;
          background: #f5f5dc;
          margin-top: 2px;
        }

        .medicine-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          background: #f5f5dc;
        }

        .medicine-table thead {
          background: #e8e8d0;
        }

        .medicine-table th {
          border: 1px solid #000;
          padding: 4px 2px;
          text-align: center;
          font-weight: bold;
          font-size: 8pt;
          line-height: 1.1;
        }

        .medicine-table td {
          border: 1px solid #000;
          padding: 4px 3px;
          font-size: 9pt;
          vertical-align: middle;
          background: #f5f5dc;
        }

        .medicine-table .text-left { text-align: left; }
        .medicine-table .text-center { text-align: center; }
        .medicine-table .text-right { text-align: right; }

        /* Column Widths - Matching MARG ERP */
        .col-sr { width: 35px; }
        .col-item { width: auto; min-width: 180px; }
        .col-pack { width: 50px; }
        .col-hsn { width: 60px; }
        .col-batch { width: 80px; }
        .col-exp { width: 50px; }
        .col-qty { width: 45px; }
        .col-rate { width: 60px; }
        .col-dis-pct { width: 50px; }
        .col-dis-amt { width: 65px; }
        .col-gst { width: 55px; }
        .col-amount { width: 80px; }

        .item-name {
          font-weight: 600;
          word-wrap: break-word;
          font-size: 9pt;
        }

        /* Footer Section */
        .invoice-footer {
          display: flex;
          margin-top: 4px;
          gap: 4px;
        }

        .left-footer {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .qr-section {
          border: 1px solid #000;
          background: #f5f5dc;
          padding: 8px;
          text-align: center;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        .amount-words-section {
          border: 1px solid #000;
          background: #f5f5dc;
          padding: 6px 8px;
          font-size: 9pt;
        }

        .terms-section {
          border: 1px solid #000;
          background: #f5f5dc;
          padding: 6px 8px;
          font-size: 8pt;
        }

        .tax-totals-section {
          width: 320px;
          border: 1px solid #000;
          background: #f5f5dc;
          padding: 6px 8px;
        }

        .tax-summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
        }

        .tax-summary-table td {
          padding: 2px 4px;
          font-size: 8pt;
          border: 1px solid #888;
        }

        .tax-summary-table .label-cell {
          font-weight: bold;
          text-align: right;
          padding-right: 8px;
        }

        .totals-table {
          width: 100%;
          border-collapse: collapse;
        }

        .totals-table td {
          padding: 3px 4px;
          font-size: 9pt;
          border-bottom: 1px solid #ccc;
        }

        .totals-table .label-col {
          font-weight: 600;
        }

        .totals-table .value-col {
          text-align: right;
        }

        .totals-table tr:last-child td {
          border-bottom: none;
        }

        .grand-total-row {
          background: #e8e8d0;
          font-weight: bold;
          font-size: 11pt !important;
          border: 1px solid #000 !important;
        }

        .signature-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          padding: 0 20px;
        }

        .signature-area {
          text-align: center;
          font-size: 9pt;
        }

        .signature-line {
          margin-top: 35px;
          padding-top: 2px;
        }

        .footer-note {
          text-align: center;
          margin-top: 6px;
          font-size: 8pt;
          font-style: italic;
        }

        .branding {
          text-align: center;
          margin-top: 4px;
          font-size: 7pt;
          color: #666;
        }

        @media print {
          .landscape-invoice {
            margin: 0;
            padding: 8px;
            width: 100%;
            min-height: auto;
          }

          @page {
            size: A4 landscape;
            margin: 8mm;
          }
        }
      `}</style>

      {/* Header */}
      <div className="invoice-header">
        <div className="header-top">
          {/* Logo section - Left */}
          {companyDetails.logo_url && (
            <div style={{width: '80px', marginRight: '12px', display: 'flex', alignItems: 'center'}}>
              <img 
                src={companyDetails.logo_url} 
                alt="Logo" 
                style={{
                  maxWidth: '80px', 
                  maxHeight: '80px', 
                  objectFit: 'contain'
                }} 
              />
            </div>
          )}
          
          <div className="company-section">
            <div className="company-name">{companyDetails.pharmacy_name || 'LIFESPROUTS CARE'}</div>
            <div className="company-info">
              <div>{companyDetails.address || '2-190/6 Peikaji Nagar Asifabad, Kommurum Bheem Asifabad'}, {companyDetails.state || 'TELANGANA'}</div>
              <div><strong>GSTIN:</strong> {companyDetails.gstin || '36CTUPD3541E1ZO'} | <strong>D.L NO:</strong> {companyDetails.drug_license_number || '(20B&21B)TG/AS/2025-139054'}</div>
              <div><strong>Phone:</strong> {companyDetails.phone || '9666105832'} | <strong>Email:</strong> {companyDetails.email || 'vedithapharma@gmail.com'}</div>
              {companyDetails.fssai_number && <div><strong>FSSAI:</strong> {companyDetails.fssai_number}</div>}
            </div>
          </div>
          <div className="invoice-meta-top">
            <div><strong>Date:</strong> {invoiceDate.toLocaleDateString('en-GB')}</div>
            <div><strong>Time:</strong> {invoiceDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div className="header-bottom">
          <div className="customer-section">
            <div className="info-row">
              <span className="info-label">{isWholesale ? 'Patient Mobile' : 'Customer'}:</span>
              <span>{customer?.phone || customer?.name || customer?.business_name || 'Walk-in'}</span>
            </div>
            {isWholesale && customer?.name && (
              <div className="info-row">
                <span className="info-label">Doctor Name:</span>
                <span>{customer.name}</span>
              </div>
            )}
            {!isWholesale && customer?.customer_type === 'retailer' && customer?.business_name && (
              <div className="info-row">
                <span className="info-label">Business:</span>
                <span>{customer.business_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Medicine Table */}
      <div className="medicine-table-wrapper">
        <table className="medicine-table">
          <thead>
            <tr>
              <th className="col-sr">Sr<br/>No</th>
              <th className="col-item text-left">Item Description</th>
              <th className="col-pack">Pack</th>
              <th className="col-hsn">HSN<br/>Code</th>
              <th className="col-batch">Batch</th>
              <th className="col-exp">Expiry</th>
              <th className="col-qty">Qty</th>
              <th className="col-rate">Rate</th>
              <th className="col-dis-pct">Dis%</th>
              <th className="col-dis-amt">Dis<br/>Amt</th>
              <th className="col-gst">GST%</th>
              <th className="col-amount text-right">Total<br/>Amount</th>
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
                    <div className="item-name">{item.medicine.name}</div>
                    {item.medicine.manufacturer && (
                      <div style={{fontSize: '8pt', color: '#555'}}>
                        Mfg: {item.medicine.manufacturer}
                      </div>
                    )}
                  </td>
                  <td className="text-center">{item.medicine.pack_size || '10'}</td>
                  <td className="text-center">{item.medicine.hsn_code || '3004'}</td>
                  <td className="text-center">{item.batch.batch_number}</td>
                  <td className="text-center">
                    {new Date(item.batch.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}
                  </td>
                  <td className="text-center"><strong>{item.quantity}</strong></td>
                  <td className="text-right">{item.price.toFixed(2)}</td>
                  <td className="text-center">{(item.discount || 0).toFixed(1)}</td>
                  <td className="text-right">{discountAmt.toFixed(2)}</td>
                  <td className="text-center">{gstRate.toFixed(0)}</td>
                  <td className="text-right"><strong>{totalWithGst.toFixed(2)}</strong></td>
                </tr>
              )
            })}
            
            {/* Add empty rows if there are fewer items to maintain structure */}
            {items.length < 3 && Array(3 - items.length).fill(0).map((_, i) => (
              <tr key={`empty-${i}`} style={{height: '30px'}}>
                <td colSpan="12">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with Tax Summary and Totals */}
      <div className="invoice-footer">
        {/* Left side - QR, Amount in Words, Terms */}
        <div className="left-footer">
          {/* QR Code Section */}
          <div className="qr-section">
            <div style={{fontSize: '10pt', fontWeight: 'bold', marginBottom: '4px'}}>Scan & Book</div>
            <div style={{width: '80px', height: '80px', border: '1px solid #888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8pt'}}>
              QR CODE
            </div>
            <div style={{fontSize: '8pt', marginTop: '4px'}}>Improve Your Health</div>
          </div>

          {/* Amount in Words */}
          <div className="amount-words-section">
            <div><strong>Amount in Words:</strong> {amountToWords(totals.netPayable)}</div>
          </div>

          {/* Terms & Conditions */}
          <div className="terms-section">
            <div style={{fontWeight: 'bold', marginBottom: '2px'}}>Terms & Condition</div>
            <div><strong>**GET WELL SOON**</strong></div>
            <div style={{marginTop: '4px', fontSize: '7pt'}}>For, {customer?.name || 'Customer'}</div>
          </div>
        </div>

        {/* Right side - Tax Summary and Totals */}
        <div className="tax-totals-section">
          {/* Tax Summary Table */}
          <table className="tax-summary-table">
            <tbody>
              <tr>
                <td className="label-cell">CGST :</td>
                <td style={{textAlign: 'right'}}>{totals.cgst.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="label-cell">SGST :</td>
                <td style={{textAlign: 'right'}}>{totals.sgst.toFixed(2)}</td>
              </tr>
              {totals.igst > 0 && (
                <tr>
                  <td className="label-cell">IGST :</td>
                  <td style={{textAlign: 'right'}}>{totals.igst.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals Table */}
          <table className="totals-table">
            <tbody>
              <tr>
                <td className="label-col">Gross Total</td>
                <td className="value-col">{totals.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="label-col">Total Discount</td>
                <td className="value-col">{totals.totalDiscountAmt.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="label-col">Taxable Amount</td>
                <td className="value-col">{totals.taxableValue.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="label-col">Total Tax Amount</td>
                <td className="value-col">{totals.totalTax.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="label-col">Round Off</td>
                <td className="value-col">{totals.roundOff.toFixed(2)}</td>
              </tr>
              <tr className="grand-total-row">
                <td className="label-col">Net Amount</td>
                <td className="value-col">{totals.netPayable.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom section with QR and signature */}
      <div className="signature-footer">
        <div style={{width: '120px', textAlign: 'center'}}>
          <div style={{width: '100px', height: '100px', border: '1px solid #888', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8pt'}}>
            QR CODE
          </div>
        </div>
        <div className="signature-area">
          <div className="signature-line">Authorised Sign.</div>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="footer-note">
        Get well soon. Scan the Healthcare QR Code for complete health services, insurance, and government benefits.
      </div>

      <div className="branding">
        Powered by BillSprout ERP
      </div>
    </div>
  )
}

export default LandscapeInvoice
