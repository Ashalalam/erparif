/**
 * Notification Service
 * Handles email and SMS notifications using Resend and Twilio
 */

import { supabase } from '../lib/supabase'

// Template placeholder replacement helper
const replacePlaceholders = (template, data) => {
  let result = template
  
  // Simple placeholder replacement: {{key}} -> value
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, data[key] || '')
  })
  
  // Handle conditional blocks: {{#if_key}}...{{else}}...{{/if_key}}
  const conditionalRegex = /{{#if_(\w+)}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if_\1}}/g
  result = result.replace(conditionalRegex, (match, key, ifContent, elseContent) => {
    return data[key] ? ifContent : (elseContent || '')
  })
  
  return result.trim()
}

// Get notification template from database
const getTemplate = async (templateKey) => {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('template_key', templateKey)
    .eq('is_active', true)
    .single()
  
  if (error) {
    console.error('Failed to fetch template:', error)
    return null
  }
  
  return data
}

// Get customer notification preferences
const getCustomerPreferences = async (customerId) => {
  const { data, error } = await supabase
    .from('customer_notification_preferences')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle()
  
  if (error) {
    console.error('Failed to fetch preferences:', error)
    return null
  }
  
  // If no preferences exist, create default ones
  if (!data) {
    const { data: user } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, phone')
      .eq('id', customerId)
      .single()
    
    const { data: newPrefs } = await supabase
      .from('customer_notification_preferences')
      .insert({
        customer_id: customerId,
        email_address: profile?.email || user?.user?.email,
        phone_number: profile?.phone
      })
      .select()
      .single()
    
    return newPrefs
  }
  
  return data
}

// Log notification attempt
const logNotification = async (logData) => {
  const { error } = await supabase
    .from('notification_logs')
    .insert(logData)
  
  if (error) {
    console.error('Failed to log notification:', error)
  }
}

// =====================================================
// EMAIL SERVICE (Resend)
// =====================================================

/**
 * Send email using Resend API
 * Docs: https://resend.com/docs/send-with-nodejs
 */
const sendEmail = async ({
  to,
  subject,
  html,
  customerId,
  orderId,
  eventType,
  attachment = null // { filename, content (base64), type }
}) => {
  const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY
  const BUSINESS_EMAIL = import.meta.env.VITE_BUSINESS_EMAIL || 'noreply@billsprout.com'
  const BUSINESS_NAME = import.meta.env.VITE_BUSINESS_NAME || 'BillSprout Pharmacy'
  
  if (!RESEND_API_KEY) {
    console.warn('⚠️ Resend API key not configured - email not sent')
    await logNotification({
      customer_id: customerId,
      order_id: orderId,
      notification_type: 'email',
      event_type: eventType,
      recipient: to,
      subject,
      message: html,
      status: 'failed',
      error_message: 'Resend API key not configured'
    })
    return { success: false, error: 'Email service not configured' }
  }
  
  try {
    const emailData = {
      from: `${BUSINESS_NAME} <${BUSINESS_EMAIL}>`,
      to: [to],
      subject,
      html
    }
    
    // Add attachment if provided
    if (attachment) {
      emailData.attachments = [{
        filename: attachment.filename,
        content: attachment.content
      }]
    }
    
    // Call Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to send email')
    }
    
    // Log success
    await logNotification({
      customer_id: customerId,
      order_id: orderId,
      notification_type: 'email',
      event_type: eventType,
      recipient: to,
      subject,
      message: html,
      status: 'sent',
      provider: 'resend',
      provider_message_id: result.id,
      sent_at: new Date().toISOString()
    })
    
    console.log('✅ Email sent successfully:', result.id)
    return { success: true, messageId: result.id }
    
  } catch (error) {
    console.error('❌ Email send failed:', error)
    
    // Log failure
    await logNotification({
      customer_id: customerId,
      order_id: orderId,
      notification_type: 'email',
      event_type: eventType,
      recipient: to,
      subject,
      message: html,
      status: 'failed',
      provider: 'resend',
      error_message: error.message
    })
    
    return { success: false, error: error.message }
  }
}

// =====================================================
// SMS SERVICE (Twilio)
// =====================================================

/**
 * Send SMS using Twilio API
 * Docs: https://www.twilio.com/docs/sms/api
 */
const sendSMS = async ({
  to,
  message,
  customerId,
  orderId,
  eventType
}) => {
  const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID
  const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN
  const TWILIO_PHONE_NUMBER = import.meta.env.VITE_TWILIO_PHONE_NUMBER
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('⚠️ Twilio credentials not configured - SMS not sent')
    await logNotification({
      customer_id: customerId,
      order_id: orderId,
      notification_type: 'sms',
      event_type: eventType,
      recipient: to,
      message,
      status: 'failed',
      error_message: 'Twilio credentials not configured'
    })
    return { success: false, error: 'SMS service not configured' }
  }
  
  try {
    // Encode credentials for Basic Auth
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
    
    // Call Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: to,
          From: TWILIO_PHONE_NUMBER,
          Body: message
        })
      }
    )
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to send SMS')
    }
    
    // Log success
    await logNotification({
      customer_id: customerId,
      order_id: orderId,
      notification_type: 'sms',
      event_type: eventType,
      recipient: to,
      message,
      status: 'sent',
      provider: 'twilio',
      provider_message_id: result.sid,
      sent_at: new Date().toISOString()
    })
    
    console.log('✅ SMS sent successfully:', result.sid)
    return { success: true, messageId: result.sid }
    
  } catch (error) {
    console.error('❌ SMS send failed:', error)
    
    // Log failure
    await logNotification({
      customer_id: customerId,
      order_id: orderId,
      notification_type: 'sms',
      event_type: eventType,
      recipient: to,
      message,
      status: 'failed',
      provider: 'twilio',
      error_message: error.message
    })
    
    return { success: false, error: error.message }
  }
}

// =====================================================
// HIGH-LEVEL NOTIFICATION FUNCTION
// =====================================================

/**
 * Send notification based on order status change
 * Automatically checks preferences and sends email/SMS as configured
 */
export const sendOrderNotification = async ({
  customerId,
  orderId,
  eventType, // 'order_confirmed', 'order_processing', etc.
  orderData, // Order details for template placeholders
  attachInvoice = false // Whether to attach PDF invoice
}) => {
  try {
    // Get customer preferences
    const preferences = await getCustomerPreferences(customerId)
    if (!preferences) {
      console.warn('No preferences found for customer:', customerId)
      return { success: false, error: 'Customer preferences not found' }
    }
    
    // Check if customer wants this type of notification
    const emailEnabled = preferences.email_enabled && 
                        preferences[`email_${eventType}`]
    const smsEnabled = preferences.sms_enabled && 
                      preferences[`sms_${eventType}`]
    
    if (!emailEnabled && !smsEnabled) {
      console.log('Customer has disabled notifications for:', eventType)
      return { success: true, message: 'Notifications disabled by user' }
    }
    
    const results = {}
    
    // Generate invoice PDF if requested
    let invoiceAttachment = null
    if (attachInvoice && orderId) {
      try {
        const { generateInvoicePDF } = await import('./invoiceService.js')
        const pdfBlob = await generateInvoicePDF(orderId)
        
        // Convert blob to base64 for email attachment
        const reader = new FileReader()
        const base64Promise = new Promise((resolve) => {
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1]
            resolve(base64)
          }
        })
        reader.readAsDataURL(pdfBlob)
        const base64Content = await base64Promise
        
        invoiceAttachment = {
          filename: `Invoice_${orderData.order_number}.pdf`,
          content: base64Content,
          type: 'application/pdf'
        }
      } catch (error) {
        console.error('Failed to generate invoice attachment:', error)
        // Continue without attachment
      }
    }
    
    // Send Email
    if (emailEnabled && preferences.email_address) {
      const emailTemplate = await getTemplate(`${eventType}_email`)
      if (emailTemplate) {
        const subject = replacePlaceholders(emailTemplate.subject, orderData)
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #4F46E5; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">${import.meta.env.VITE_BUSINESS_NAME || 'BillSprout Pharmacy'}</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb;">
              <div style="background: white; padding: 20px; border-radius: 8px;">
                ${replacePlaceholders(emailTemplate.body, orderData).replace(/\n/g, '<br>')}
              </div>
              ${invoiceAttachment ? '<p style="margin-top: 20px; color: #666;"><strong>📎 Invoice attached</strong></p>' : ''}
            </div>
            <div style="background: #374151; color: white; padding: 20px; text-align: center; font-size: 12px;">
              <p>© ${new Date().getFullYear()} ${import.meta.env.VITE_BUSINESS_NAME || 'BillSprout Pharmacy'}. All rights reserved.</p>
              <p>You received this email because you placed an order with us.</p>
            </div>
          </div>
        `
        
        results.email = await sendEmail({
          to: preferences.email_address,
          subject,
          html,
          customerId,
          orderId,
          eventType,
          attachment: invoiceAttachment
        })
      }
    }
    
    // Send SMS
    if (smsEnabled && preferences.phone_number) {
      const smsTemplate = await getTemplate(`${eventType}_sms`)
      if (smsTemplate) {
        const message = replacePlaceholders(smsTemplate.body, orderData)
        
        results.sms = await sendSMS({
          to: preferences.phone_number,
          message,
          customerId,
          orderId,
          eventType
        })
      }
    }
    
    return { 
      success: true, 
      results,
      message: `Notifications sent successfully`
    }
    
  } catch (error) {
    console.error('Failed to send notification:', error)
    return { success: false, error: error.message }
  }
}

// Export individual services for direct use if needed
export { sendEmail, sendSMS, getCustomerPreferences, getTemplate }
