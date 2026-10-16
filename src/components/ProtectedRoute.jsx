import React from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, profile, loading, hasPermission, needsProfileRecovery } = useAuthStore()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If profile recovery is needed, redirect to recovery page
  if (needsProfileRecovery || !profile) {
    return <Navigate to="/profile-recovery" replace />
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    // Redirect to user's appropriate dashboard
    const redirectPath = useAuthStore.getState().getRedirectPath()
    return <Navigate to={redirectPath} replace />
  }

  return children
}

export default ProtectedRoute