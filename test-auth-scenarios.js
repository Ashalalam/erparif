/**
 * AuthStore Testing Script
 * 
 * Run this in browser console after loading the app to test auth scenarios
 * Usage: Copy and paste this entire script into browser console
 */

const AuthTester = {
  // Test 1: Check current auth state
  checkState: () => {
    console.log('=== AUTH STATE CHECK ===')
    const state = window.useAuthStore?.getState?.()
    if (!state) {
      console.error('❌ AuthStore not accessible')
      return
    }
    console.log('User:', state.user ? '✅ Logged in' : '❌ Not logged in')
    console.log('Profile:', state.profile ? `✅ ${state.profile.role}` : '❌ No profile')
    console.log('Loading:', state.loading ? '⏳ Loading...' : '✅ Ready')
    console.log('Needs Recovery:', state.needsProfileRecovery ? '⚠️ Yes' : '✅ No')
    console.log('Error:', state.error || '✅ None')
    return state
  },

  // Test 2: Verify permission checks fail without profile
  testPermissionsWithoutProfile: () => {
    console.log('\n=== PERMISSION CHECK TEST ===')
    const state = window.useAuthStore?.getState?.()
    if (!state) {
      console.error('❌ AuthStore not accessible')
      return
    }
    
    if (state.profile) {
      console.warn('⚠️ Profile exists, test skipped (need missing profile)')
      return
    }

    const roles = ['staff', 'admin', 'pharmacist', 'patient']
    roles.forEach(role => {
      const hasAccess = state.hasPermission(role)
      console.log(`${role}: ${hasAccess ? '❌ FAIL - should deny' : '✅ PASS - denied'}`)
    })
  },

  // Test 3: Attempt role change via updateProfile (should fail)
  testRoleChangeBlocking: async () => {
    console.log('\n=== ROLE CHANGE BLOCKING TEST ===')
    const state = window.useAuthStore?.getState?.()
    if (!state) {
      console.error('❌ AuthStore not accessible')
      return
    }

    if (!state.user || !state.profile) {
      console.error('❌ Must be logged in with profile')
      return
    }

    console.log('Current role:', state.profile.role)
    console.log('Attempting to change role to admin...')
    
    const result = await state.updateProfile({ role: 'admin' })
    
    if (result.success) {
      console.error('❌ SECURITY ISSUE: Role change succeeded')
    } else {
      console.log('✅ PASS: Role change blocked')
      console.log('Error:', result.error)
    }

    // Verify role unchanged
    const newState = window.useAuthStore?.getState?.()
    console.log('Role after attempt:', newState.profile.role)
  },

  // Test 4: Attempt ID change via updateProfile (should fail)
  testIdChangeBlocking: async () => {
    console.log('\n=== ID CHANGE BLOCKING TEST ===')
    const state = window.useAuthStore?.getState?.()
    if (!state) {
      console.error('❌ AuthStore not accessible')
      return
    }

    if (!state.user || !state.profile) {
      console.error('❌ Must be logged in with profile')
      return
    }

    console.log('Current ID:', state.profile.id)
    console.log('Attempting to change ID...')
    
    const result = await state.updateProfile({ id: '00000000-0000-0000-0000-000000000000' })
    
    if (result.success) {
      console.error('❌ SECURITY ISSUE: ID change succeeded')
    } else {
      console.log('✅ PASS: ID change blocked')
      console.log('Error:', result.error)
    }
  },

  // Test 5: Check redirect path logic
  testRedirectPaths: () => {
    console.log('\n=== REDIRECT PATH TEST ===')
    const state = window.useAuthStore?.getState?.()
    if (!state) {
      console.error('❌ AuthStore not accessible')
      return
    }

    const path = state.getRedirectPath()
    console.log('Current redirect path:', path)

    if (!state.profile && !state.needsProfileRecovery) {
      console.log(path === '/login' ? '✅ PASS: /login' : '❌ FAIL: Should be /login')
    } else if (state.needsProfileRecovery) {
      console.log(path === '/profile-recovery' ? '✅ PASS: /profile-recovery' : '❌ FAIL: Should be /profile-recovery')
    } else {
      const expectedPaths = {
        admin: '/admin',
        pharmacist: '/pharmacist',
        staff: '/staff',
        patient: '/customer',
        retailer: '/retailer',
        wholesaler: '/wholesaler'
      }
      const expected = expectedPaths[state.profile.role]
      console.log(path === expected ? `✅ PASS: ${expected}` : `❌ FAIL: Expected ${expected}, got ${path}`)
    }
  },

  // Test 6: Run all tests
  runAll: async () => {
    console.clear()
    console.log('🧪 RUNNING ALL AUTH TESTS\n')
    
    AuthTester.checkState()
    AuthTester.testPermissionsWithoutProfile()
    await AuthTester.testRoleChangeBlocking()
    await AuthTester.testIdChangeBlocking()
    AuthTester.testRedirectPaths()
    
    console.log('\n✅ ALL TESTS COMPLETE')
  },

  // Helper: Monitor auth state changes
  watchState: () => {
    console.log('👁️ Watching auth state changes (press Ctrl+C to stop)')
    const unsubscribe = window.useAuthStore?.subscribe?.(
      (state) => {
        console.log('🔄 State changed:', {
          user: state.user ? 'logged in' : 'not logged in',
          profile: state.profile?.role || 'none',
          loading: state.loading,
          needsRecovery: state.needsProfileRecovery,
          error: state.error
        })
      }
    )
    return unsubscribe
  }
}

// Make available globally
window.AuthTester = AuthTester

console.log('🧪 Auth Tester loaded!')
console.log('Available commands:')
console.log('  AuthTester.checkState() - Check current auth state')
console.log('  AuthTester.testPermissionsWithoutProfile() - Test permission checks')
console.log('  AuthTester.testRoleChangeBlocking() - Test role change security')
console.log('  AuthTester.testIdChangeBlocking() - Test ID change security')
console.log('  AuthTester.testRedirectPaths() - Test redirect logic')
console.log('  AuthTester.runAll() - Run all tests')
console.log('  AuthTester.watchState() - Monitor state changes')
console.log('\nQuick start: AuthTester.runAll()')
