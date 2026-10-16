# AuthStore Comprehensive Fix - Testing Guide

## Fixed Issues Summary

### A. Profile Lookup Error Handling ✅
- **Before**: `.single()` threw HTTP 406 when profile missing
- **After**: `.maybeSingle()` returns null for missing profiles, distinguishes from genuine errors
- **Security**: Genuine database errors now fail closed (sign out user, deny access)

### B. Missing Profile Recovery ✅
- **New Feature**: `recoverProfile()` method with race condition protection
- **Default Role**: Always creates with `role='patient'` (never 'admin')
- **Lock Mechanism**: Prevents concurrent recovery attempts for same user
- **Double-Check**: Verifies profile doesn't exist before creating (prevents duplicates)
- **UI**: New ProfileRecoveryPage for user-friendly recovery experience

### C. Role-Based Access Control ✅
- **Never Admin**: Profile recovery ONLY creates 'patient' roles
- **Fail Closed**: No profile = no access (redirect to recovery)
- **Role Validation**: Rejects invalid/missing roles, signs out user
- **Permission Checks**: Returns false if no profile loaded

### D. Repeated Profile Creation Prevention ✅
- **Lock Map**: `profileRecoveryLock` prevents concurrent attempts
- **Double Check**: Verifies non-existence before INSERT
- **Single Recovery**: Recovery only runs once per user session

### E. Async Race Conditions ✅
- **Lock Mechanism**: Map-based lock per userId
- **Atomic Checks**: Profile existence verified before creation
- **State Flags**: `needsProfileRecovery` prevents repeated attempts
- **Sign-in Flow**: Properly handles missing profiles without creating access

### F. Enhanced Security ✅
- **updateProfile()**: Blocks role and id changes entirely
- **Error Handling**: Uses `.maybeSingle()` consistently, checks for null vs error
- **Fail Closed**: Any database error = sign out + deny access
- **Valid Roles**: Only allows: admin, pharmacist, staff, patient, retailer, wholesaler

---

## Test Scenarios

### Test 1: Admin Login (Normal Flow)
**Purpose**: Verify existing admin can log in without issues

**Steps**:
1. Navigate to `/login`
2. Enter credentials: `admin@pharmacy.com` / `admin123`
3. Click "Sign In"

**Expected Result**:
- ✅ Successfully logs in
- ✅ Profile loaded with role='admin'
- ✅ Redirected to `/admin` dashboard
- ✅ No errors in console
- ✅ Console shows: "✅ Profile loaded: admin"

---

### Test 2: Customer Registration (New User)
**Purpose**: Verify new customers get 'patient' role, never 'admin'

**Steps**:
1. Navigate to `/register`
2. Fill in form:
   - Full Name: Test Customer
   - Email: testcustomer@test.com
   - Phone: 1234567890
   - Password: Test@123
   - Confirm Password: Test@123
3. Click "Register"
4. Check Supabase Database → profiles table

**Expected Result**:
- ✅ Registration succeeds
- ✅ New profile created with `role='patient'`
- ✅ **Never** role='admin'
- ✅ User redirected to `/customer` dashboard
- ✅ Email confirmation sent (if enabled in Supabase)

---

### Test 3: Missing Profile Recovery (Manual Test)
**Purpose**: Test profile recovery when profile is missing but auth exists

**Setup** (Requires Supabase Dashboard Access):
1. Create auth user via Supabase SQL:
```sql
-- This creates auth but NO profile
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'missing-profile@test.com',
  crypt('Test@123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  ''
);
```

**Steps**:
1. Log in with `missing-profile@test.com` / `Test@123`
2. Observe redirect to `/profile-recovery`
3. Click "Setup Profile" button
4. Check Supabase profiles table

**Expected Result**:
- ✅ No 406 error (uses `.maybeSingle()`)
- ✅ Redirected to `/profile-recovery` page
- ✅ Page shows "Profile Setup Required"
- ✅ After clicking "Setup Profile":
  - Profile created with role='patient'
  - Never role='admin'
  - Redirected to `/customer`
- ✅ Console shows: "📝 Creating new profile with role: patient"

---

### Test 4: Database Error Handling (Fail Closed)
**Purpose**: Verify genuine errors deny access, not grant it

**Setup** (Requires Supabase Access):
1. Temporarily disable RLS on profiles table:
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

**Steps**:
1. Log in with valid credentials
2. Observe behavior

**Expected Result**:
- ✅ If fetch fails: User signed out automatically
- ✅ Error message shown (not silent failure)
- ✅ No access granted on error
- ✅ Console shows: "❌ Profile fetch error: ..."

**Cleanup**:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

---

### Test 5: Invalid Role Rejection
**Purpose**: Ensure invalid roles are rejected

**Setup** (Requires Supabase Dashboard):
1. Manually corrupt a profile:
```sql
UPDATE profiles 
SET role = 'hacker' 
WHERE email = 'testuser@test.com';
```

**Steps**:
1. Log in with corrupted account
2. Observe behavior

**Expected Result**:
- ✅ Login fails after profile load
- ✅ User signed out automatically
- ✅ Error: "Invalid user role. Please contact support."
- ✅ Console shows: "❌ Invalid role in profile"

**Cleanup**:
```sql
UPDATE profiles 
SET role = 'patient' 
WHERE email = 'testuser@test.com';
```

---

### Test 6: updateProfile Security
**Purpose**: Verify role changes blocked in updateProfile()

**Setup**: Log in as any user

**Steps**:
1. Open browser console
2. Run:
```javascript
const authStore = window.useAuthStore?.getState?.()
if (authStore) {
  authStore.updateProfile({ role: 'admin' }).then(console.log)
}
```

**Expected Result**:
- ✅ Update fails
- ✅ Returns: `{ success: false, error: 'Role changes are not permitted' }`
- ✅ Console shows: "⛔ Attempted to change role through updateProfile"
- ✅ User role unchanged in database

---

### Test 7: Concurrent Profile Recovery
**Purpose**: Test race condition protection

**Setup**: Requires code modification for testing
1. Add delay to `recoverProfile()` to simulate slow network:
```javascript
await new Promise(resolve => setTimeout(resolve, 2000))
```

**Steps**:
1. Log in with missing-profile user
2. On recovery page, rapidly click "Setup Profile" 5 times
3. Check database after completion

**Expected Result**:
- ✅ Only ONE profile created (not 5)
- ✅ Console shows: "⏳ Profile recovery already in progress" for subsequent attempts
- ✅ No duplicate profiles
- ✅ Lock released after completion

---

### Test 8: Permission Checks Without Profile
**Purpose**: Ensure hasPermission() fails closed

**Steps**:
1. Log in with missing-profile user (before recovery)
2. Open console
3. Run:
```javascript
const authStore = window.useAuthStore?.getState?.()
console.log(authStore.hasPermission('staff'))
```

**Expected Result**:
- ✅ Returns `false`
- ✅ Console shows: "⛔ Permission denied: No profile loaded"
- ✅ User cannot access protected routes

---

### Test 9: Staff/Pharmacist Login
**Purpose**: Verify other roles still work correctly

**Steps**:
1. Log in with `pharmacist@pharmacy.com` / `pharma123`
2. Log out
3. Log in with `staff@pharmacy.com` / `staff123`

**Expected Result**:
- ✅ Pharmacist redirected to `/pharmacist`
- ✅ Staff redirected to `/staff`
- ✅ Profiles loaded correctly
- ✅ Role-based permissions work

---

### Test 10: Sign Out Clears State
**Purpose**: Ensure sign out resets all auth state

**Steps**:
1. Log in with any account
2. Note profile and user data
3. Sign out
4. Check auth store state

**Expected Result**:
- ✅ `user` = null
- ✅ `profile` = null
- ✅ `loading` = false
- ✅ `needsProfileRecovery` = false
- ✅ Redirected to `/login`

---

## Console Logging Guide

### Successful Login Flow
```
🔄 Starting auth initialization...
🔍 Getting session from Supabase...
📋 Session data: User found
👤 User ID: <uuid>
📧 User email: <email>
🔍 Fetching user profile...
✅ Profile loaded: <role>
```

### Missing Profile Flow
```
🔄 Starting auth initialization...
🔍 Getting session from Supabase...
📋 Session data: User found
👤 User ID: <uuid>
📧 User email: <email>
🔍 Fetching user profile...
⚠️ No profile found - flagging for recovery
```

### Profile Recovery Flow
```
🔧 Starting secure profile recovery for user: <uuid>
📝 Creating new profile with role: patient
✅ Profile recovered successfully
```

### Error Flow (Fail Closed)
```
🔄 Starting auth initialization...
🔍 Getting session from Supabase...
📋 Session data: User found
👤 User ID: <uuid>
📧 User email: <email>
🔍 Fetching user profile...
❌ Profile fetch error: <error message>
```

---

## Security Checklist

- [ ] Test 1: Admin login works
- [ ] Test 2: New registrations get 'patient' role (never 'admin')
- [ ] Test 3: Missing profiles redirect to recovery
- [ ] Test 4: Database errors deny access (fail closed)
- [ ] Test 5: Invalid roles rejected
- [ ] Test 6: updateProfile blocks role changes
- [ ] Test 7: Concurrent recovery prevented
- [ ] Test 8: Permissions fail closed without profile
- [ ] Test 9: All roles work correctly
- [ ] Test 10: Sign out clears state

---

## Common Issues & Solutions

### Issue: Profile recovery page loops infinitely
**Cause**: Recovery failing silently
**Solution**: Check console for error messages, verify database permissions

### Issue: Admin can't log in
**Cause**: RLS policies too restrictive
**Solution**: Verify profiles table RLS allows users to read own profile

### Issue: New registrations don't create profiles
**Cause**: Database trigger missing or RLS blocking insert
**Solution**: Check `handle_new_user()` trigger exists and RLS policies

### Issue: "Supabase not configured" error
**Cause**: .env file missing or invalid
**Solution**: Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in .env

---

## Next Steps After Testing

Once all tests pass:
1. ✅ Commit changes: `git add . && git commit -m "Security: Comprehensive authStore fixes"`
2. ✅ Push to repository: `git push`
3. ✅ Continue to Phase 4: Shopping Cart & Checkout
4. ✅ Monitor production logs for any auth issues

---

## Support

If tests fail or unexpected behavior occurs:
1. Check browser console for error messages
2. Check Supabase logs in dashboard
3. Verify database schema matches migration files
4. Test with fresh user accounts (not existing corrupted data)
