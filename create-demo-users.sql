-- ============================================
-- CREATE DEMO USER ACCOUNTS
-- ============================================
-- Run this in Supabase SQL Editor to create demo users
-- These users will be created in auth.users and profiles tables
-- ============================================

-- Note: You need to create users through Supabase Auth Dashboard first,
-- then run this script to add their profiles.
-- Or use the Supabase Auth API to create them programmatically.

-- For now, let's create the profiles that will link to auth users
-- You'll need to create the auth users manually in Supabase Dashboard

-- ============================================
-- STEP 1: Create Auth Users in Supabase Dashboard
-- ============================================
-- Go to: Authentication > Users > Add User
-- Create these users:
-- 
-- 1. Email: admin@pharmacy.com, Password: admin123
-- 2. Email: pharmacist@pharmacy.com, Password: pharma123  
-- 3. Email: staff@pharmacy.com, Password: staff123
--
-- After creating, note down their User IDs, then update below
-- ============================================

-- ============================================
-- STEP 2: Insert Profiles (Run after creating auth users)
-- ============================================

-- First, let's check if profiles already exist and delete them if needed
-- DELETE FROM profiles WHERE email IN ('admin@pharmacy.com', 'pharmacist@pharmacy.com', 'staff@pharmacy.com');

-- Insert Admin Profile
-- Replace 'USER_ID_FROM_AUTH_USERS' with actual UUID from auth.users table
INSERT INTO profiles (id, full_name, email, phone, role, status, created_at, updated_at)
SELECT 
  id,
  'System Administrator',
  'admin@pharmacy.com',
  '+1234567890',
  'admin',
  'active',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'admin@pharmacy.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Insert Pharmacist Profile
INSERT INTO profiles (id, full_name, email, phone, role, status, created_at, updated_at)
SELECT 
  id,
  'Head Pharmacist',
  'pharmacist@pharmacy.com',
  '+1234567891',
  'pharmacist',
  'active',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'pharmacist@pharmacy.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Insert Staff Profile
INSERT INTO profiles (id, full_name, email, phone, role, status, created_at, updated_at)
SELECT 
  id,
  'Staff Member',
  'staff@pharmacy.com',
  '+1234567892',
  'staff',
  'active',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'staff@pharmacy.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================
-- VERIFICATION: Check if profiles were created
-- ============================================
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.status,
  CASE WHEN au.id IS NOT NULL THEN 'Yes' ELSE 'No' END as auth_user_exists
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.email IN ('admin@pharmacy.com', 'pharmacist@pharmacy.com', 'staff@pharmacy.com')
ORDER BY 
  CASE p.role
    WHEN 'admin' THEN 1
    WHEN 'pharmacist' THEN 2
    WHEN 'staff' THEN 3
  END;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Demo user profiles setup complete!';
  RAISE NOTICE '📋 You can now login with:';
  RAISE NOTICE '   Admin: admin@pharmacy.com / admin123';
  RAISE NOTICE '   Pharmacist: pharmacist@pharmacy.com / pharma123';
  RAISE NOTICE '   Staff: staff@pharmacy.com / staff123';
END $$;
