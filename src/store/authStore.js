import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// Prevent concurrent profile recovery attempts
const profileRecoveryLock = new Map()

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,
  needsProfileRecovery: false, // Flag to indicate profile recovery needed

  // Secure profile recovery - creates missing profile with safe defaults
  recoverProfile: async (userId, email) => {
    // Check if recovery already in progress for this user
    if (profileRecoveryLock.get(userId)) {
      console.log('⏳ Profile recovery already in progress for user:', userId)
      return { success: false, error: 'Recovery already in progress' }
    }

    profileRecoveryLock.set(userId, true)
    console.log('🔧 Starting secure profile recovery for user:', userId)

    try {
      // Double-check profile doesn't exist (prevent race condition)
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (checkError) {
        console.error('❌ Profile check error:', checkError)
        throw new Error('Failed to verify profile status')
      }

      if (existingProfile) {
        console.log('✅ Profile already exists, fetching full profile...')
        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (fetchError) throw fetchError

        set({ profile, needsProfileRecovery: false })
        profileRecoveryLock.delete(userId)
        return { success: true, profile }
      }

      // Create profile with safe defaults - NEVER 'admin'
      const newProfile = {
        id: userId,
        email: email,
        role: 'patient', // Always default to least privileged role
        full_name: email.split('@')[0], // Use email prefix as temporary name
        created_at: new Date().toISOString()
      }

      console.log('📝 Creating new profile with role: patient')
      
      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single()

      if (createError) {
        console.error('❌ Profile creation error:', createError)
        throw new Error(`Failed to create profile: ${createError.message}`)
      }

      console.log('✅ Profile recovered successfully')
      set({ profile: createdProfile, needsProfileRecovery: false })
      profileRecoveryLock.delete(userId)
      return { success: true, profile: createdProfile }

    } catch (error) {
      console.error('❌ Profile recovery failed:', error)
      profileRecoveryLock.delete(userId)
      set({ needsProfileRecovery: true })
      return { success: false, error: error.message }
    }
  },

  // Initialize auth state
  initialize: async () => {
    console.log('🔄 Starting auth initialization...')
    
    if (!supabase) {
      console.log('❌ Supabase not configured')
      set({ loading: false, error: 'Supabase not configured' })
      return
    }
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⏰ Auth initialization timeout - stopping loading')
      set({ loading: false, error: 'Authentication timeout. Please check your Supabase credentials.' })
    }, 10000) // 10 second timeout
    
    try {
      console.log('🔍 Getting session from Supabase...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      // Clear timeout if we get a response
      clearTimeout(timeoutId)
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        set({ loading: false, error: sessionError.message })
        return
      }
      
      console.log('📋 Session data:', session ? 'User found' : 'No user')
      
      if (session?.user) {
        console.log('👤 User ID:', session.user.id)
        console.log('📧 User email:', session.user.email)
        
        // Fetch profile with proper error handling
        console.log('🔍 Fetching user profile...')
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle() // Returns null if no rows, doesn't throw 406
        
        if (profileError) {
          // Genuine database/network error - fail closed
          console.error('❌ Profile fetch error:', profileError.message)
          set({ 
            user: null, 
            profile: null, 
            loading: false, 
            error: 'Failed to load user profile. Please contact support.' 
          })
          // Sign out user for security
          await supabase.auth.signOut()
          return
        }
        
        if (!profile) {
          // Profile missing - flag for recovery, don't grant access yet
          console.log('⚠️ No profile found - flagging for recovery')
          set({ 
            user: session.user, 
            profile: null, 
            loading: false,
            needsProfileRecovery: true
          })
        } else {
          // Profile exists - verify it has a valid role
          if (!profile.role || !['admin', 'pharmacist', 'staff', 'patient', 'retailer', 'wholesaler'].includes(profile.role)) {
            console.error('❌ Invalid or missing role in profile')
            set({ 
              user: null, 
              profile: null, 
              loading: false, 
              error: 'Invalid user role. Please contact support.' 
            })
            await supabase.auth.signOut()
            return
          }
          
          console.log('✅ Profile loaded:', profile.role)
          set({ user: session.user, profile, loading: false, needsProfileRecovery: false })
        }
      } else {
        console.log('👋 No authenticated user - showing login')
        set({ user: null, profile: null, loading: false, needsProfileRecovery: false })
      }
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('❌ Auth initialization failed:', error)
      set({ user: null, profile: null, error: error.message, loading: false })
    }
  },

  // Sign in
  signIn: async (email, password) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      // Fetch profile with proper error handling
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()
      
      if (profileError) {
        // Genuine database error - fail closed
        console.error('❌ Profile fetch error:', profileError)
        await supabase.auth.signOut()
        set({ user: null, profile: null, loading: false })
        return { success: false, error: 'Failed to load user profile. Please contact support.' }
      }
      
      if (!profile) {
        // Profile missing - flag for recovery
        console.log('⚠️ Profile missing after sign in')
        set({ user: data.user, profile: null, loading: false, needsProfileRecovery: true })
        return { success: true, needsRecovery: true }
      }

      // Verify valid role
      if (!profile.role || !['admin', 'pharmacist', 'staff', 'patient', 'retailer', 'wholesaler'].includes(profile.role)) {
        console.error('❌ Invalid role in profile')
        await supabase.auth.signOut()
        set({ user: null, profile: null, loading: false })
        return { success: false, error: 'Invalid user role. Please contact support.' }
      }
      
      set({ user: data.user, profile, loading: false, needsProfileRecovery: false })
      return { success: true }
    } catch (error) {
      set({ user: null, profile: null, error: error.message, loading: false })
      return { success: false, error: error.message }
    }
  },

  // Sign up
  signUp: async (email, password, userData) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { data: userData } 
      })
      if (error) throw error
      
      set({ loading: false })
      return { success: true, data }
    } catch (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
  },

  // Sign out
  signOut: async () => {
    if (!supabase) return
    
    set({ loading: true })
    try {
      await supabase.auth.signOut()
      set({ user: null, profile: null, loading: false, needsProfileRecovery: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  // Update profile
  updateProfile: async (updates) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    
    try {
      const { user, profile } = get()
      if (!user) {
        return { success: false, error: 'No user logged in' }
      }
      if (!profile) {
        return { success: false, error: 'Profile not loaded' }
      }

      // CRITICAL: Never allow role changes through this method
      if (updates.hasOwnProperty('role')) {
        console.error('⛔ Attempted to change role through updateProfile')
        return { success: false, error: 'Role changes are not permitted' }
      }

      // CRITICAL: Never allow id changes
      if (updates.hasOwnProperty('id')) {
        console.error('⛔ Attempted to change user ID')
        return { success: false, error: 'ID changes are not permitted' }
      }
      
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .maybeSingle()

      if (error) {
        console.error('❌ Profile update error:', error)
        return { success: false, error: error.message }
      }

      if (!updatedProfile) {
        console.error('❌ Profile not found after update')
        return { success: false, error: 'Profile not found' }
      }
      
      set({ profile: updatedProfile })
      return { success: true, profile: updatedProfile }
    } catch (error) {
      console.error('❌ Update profile failed:', error)
      return { success: false, error: error.message }
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Check permissions - fail closed if no profile
  hasPermission: (requiredRole) => {
    const { profile } = get()
    if (!profile) {
      console.log('⛔ Permission denied: No profile loaded')
      return false
    }
    
    const roleHierarchy = {
      'patient': 1,
      'staff': 2,
      'pharmacist': 3,
      'admin': 4,
      'retailer': 2,
      'wholesaler': 2
    }
    
    const userLevel = roleHierarchy[profile.role]
    const requiredLevel = roleHierarchy[requiredRole]

    if (userLevel === undefined || requiredLevel === undefined) {
      console.log('⛔ Permission denied: Invalid role')
      return false
    }
    
    return userLevel >= requiredLevel
  },

  // Get redirect path based on role
  getRedirectPath: () => {
    const { profile, needsProfileRecovery } = get()
    
    if (needsProfileRecovery) {
      return '/profile-recovery' // Could add a recovery UI page
    }
    
    if (!profile) return '/login'
    
    switch (profile.role) {
      case 'admin':
        return '/admin'
      case 'pharmacist':
        return '/pharmacist'
      case 'staff':
        return '/staff'
      case 'patient':
        return '/customer'
      case 'retailer':
        return '/retailer'
      case 'wholesaler':
        return '/wholesaler'
      default:
        console.log('⚠️ Unknown role, redirecting to login')
        return '/login'
    }
  }
}))

export default useAuthStore