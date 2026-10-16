/**
 * Database Schema Checker
 * Verifies required database columns exist
 */

import { supabase } from '../lib/supabase'

/**
 * Check if payment columns exist in customer_orders table
 */
export const checkPaymentColumns = async () => {
  try {
    // Try to query a single row with payment columns
    const { data, error } = await supabase
      .from('customer_orders')
      .select('payment_method, payment_status')
      .limit(1)

    if (error) {
      // Check if error is due to missing column
      if (error.code === '42703' || error.message?.includes('column')) {
        console.warn('⚠️ Payment columns not found in database')
        return {
          exists: false,
          message: 'Payment columns missing. Migration required.'
        }
      }
      
      // Some other error
      console.error('Error checking payment columns:', error)
      return {
        exists: false,
        error: error.message
      }
    }

    // Columns exist
    return {
      exists: true,
      message: 'Payment columns exist'
    }
  } catch (error) {
    console.error('Error in checkPaymentColumns:', error)
    return {
      exists: false,
      error: error.message
    }
  }
}

/**
 * Show migration warning banner if needed
 */
export const showMigrationWarningIfNeeded = async () => {
  const result = await checkPaymentColumns()
  
  if (!result.exists) {
    console.warn('============================================')
    console.warn('🚨 DATABASE MIGRATION REQUIRED')
    console.warn('============================================')
    console.warn('Payment features require database update.')
    console.warn('')
    console.warn('TO FIX:')
    console.warn('1. Open: https://supabase.com/dashboard')
    console.warn('2. Go to SQL Editor')
    console.warn('3. Run: migration-add-payment-fields.sql')
    console.warn('4. Refresh this page')
    console.warn('============================================')
    
    return false
  }
  
  return true
}
