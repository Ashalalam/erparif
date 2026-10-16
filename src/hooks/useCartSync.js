/**
 * Hook to sync cart with database on user authentication
 */
import { useEffect } from 'react'
import useAuthStore from '../store/authStore'
import useCartStore from '../store/cartStore'

export const useCartSync = () => {
  const { user, profile } = useAuthStore()
  const { loadCart, initialized } = useCartStore()

  useEffect(() => {
    // Only load cart for authenticated customers
    if (user && profile && profile.role === 'patient' && !initialized) {
      console.log('🔄 User authenticated, loading cart...')
      loadCart(user.id)
    } else if (!user && !initialized) {
      // User logged out, clear cart
      console.log('👋 User logged out, clearing cart')
      useCartStore.setState({ items: [], initialized: true })
    }
  }, [user, profile, initialized, loadCart])
}
