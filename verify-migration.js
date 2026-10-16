/**
 * Verify Payment Migration Applied
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kkcugqqohxfegdjipllo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrY3VncXFvaHhmZWdkamlwbGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0ODAxMTksImV4cCI6MjEwNzA1NjExOX0.VNh0oJLaCK_mdBGYQ4KNwahRqubdtNFvx5ECLyMyn0Y'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔍 Verifying migration...\n')

// Check if payment columns exist
const { data, error } = await supabase
  .from('customer_orders')
  .select('payment_method, payment_status')
  .limit(1)

if (error) {
  if (error.code === '42703') {
    console.log('❌ MIGRATION NOT APPLIED')
    console.log('Payment columns not found\n')
    console.log('Please run the migration again in Supabase SQL Editor')
  } else {
    console.log('⚠️  Error checking:', error.message)
  }
} else {
  console.log('✅ MIGRATION SUCCESSFUL!')
  console.log('✅ Payment columns exist')
  console.log('✅ Online payment is now enabled!\n')
  console.log('🎉 Next steps:')
  console.log('1. Refresh your app (F5)')
  console.log('2. Go to checkout')
  console.log('3. Online payment option will be enabled!')
  console.log('4. Test with card: 4111 1111 1111 1111\n')
}
