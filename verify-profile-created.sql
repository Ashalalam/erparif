-- Quick verification: Check if profiles were created

-- 1. Check total profiles
SELECT 
  'Total Profiles' as check,
  COUNT(*) as count
FROM profiles;

-- 2. Check admin profiles
SELECT 
  'Admin Profiles' as check,
  COUNT(*) as count
FROM profiles
WHERE role = 'admin';

-- 3. Show all profiles with details
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 4. Check if auth users match profiles
SELECT 
  'Users vs Profiles' as check,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM profiles) 
    THEN '✅ All users have profiles'
    ELSE '❌ Some users missing profiles'
  END as status;
