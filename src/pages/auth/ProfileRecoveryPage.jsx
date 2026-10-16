import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react'

export default function ProfileRecoveryPage() {
  const { user, recoverProfile, signOut } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleRecovery = async () => {
    if (!user) {
      setError('No user session found')
      return
    }

    setLoading(true)
    setError(null)

    const result = await recoverProfile(user.id, user.email)

    if (result.success) {
      // Profile recovered, redirect to appropriate page
      const redirectPath = useAuthStore.getState().getRedirectPath()
      navigate(redirectPath)
    } else {
      setError(result.error || 'Failed to recover profile')
    }

    setLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-yellow-100 p-4 rounded-full">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">Profile Setup Required</h1>
        <p className="text-gray-600 text-center mb-6">
          Your account exists but your profile needs to be set up. Click below to complete the setup.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleRecovery}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Setting up profile...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Setup Profile
              </>
            )}
          </button>

          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> If this issue persists, please contact support at support@billsprout.com
          </p>
        </div>
      </div>
    </div>
  )
}
