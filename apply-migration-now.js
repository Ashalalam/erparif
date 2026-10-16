/**
 * Apply Payment Migration via Supabase API
 * Run this with: node apply-migration-now.js
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase credentials from .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

console.log('🚀 Starting migration application...')
console.log('📊 Supabase URL:', SUPABASE_URL)

// Read the migration file
const migrationPath = path.join(__dirname, 'migration-add-payment-fields.sql')
const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

console.log('📄 Migration file loaded')
console.log('📝 SQL length:', migrationSQL.length, 'characters')

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('\n⚠️  IMPORTANT:')
console.log('This script cannot run SQL migrations directly via the client library.')
console.log('You need to apply the migration manually in Supabase SQL Editor.')
console.log('\n📋 STEPS:')
console.log('1. Open: https://supabase.com/dashboard/project/kkcugqqohxfegdjipllo/sql/new')
console.log('2. Copy ENTIRE content from: migration-add-payment-fields.sql')
console.log('3. Paste in SQL editor')
console.log('4. Click RUN button')
console.log('5. Wait for success message')
console.log('6. Refresh your app')
console.log('\n✨ Online payment will be enabled automatically after migration!')

// Try to check if columns already exist
;(async () => {
  try {
    console.log('\n🔍 Checking current database state...')
    const { data, error } = await supabase
      .from('customer_orders')
      .select('payment_method, payment_status')
      .limit(1)
    
    if (error) {
      if (error.code === '42703') {
        console.log('❌ Payment columns NOT found - Migration needed')
        console.log('\n📍 Current Status: MIGRATION REQUIRED')
      } else {
        console.log('⚠️  Error checking:', error.message)
      }
    } else {
      console.log('✅ Payment columns already exist!')
      console.log('📍 Current Status: MIGRATION ALREADY APPLIED')
      console.log('\nIf online payment still not working, check:')
      console.log('1. Refresh your browser (F5)')
      console.log('2. Clear browser cache')
      console.log('3. Check console for errors')
    }
  } catch (err) {
    console.error('Error:', err.message)
  }
})()
