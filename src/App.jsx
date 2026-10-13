import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from './lib/supabase'
import useAuthStore from './store/authStore'

// Components
import LoginPage from './pages/auth/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'
import SupabaseSetup from './components/SupabaseSetup'

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/dashboard/AdminDashboard'
import MedicinesPage from './pages/admin/medicines/MedicinesPage'
import InventoryPage from './pages/admin/inventory/InventoryPage'
import POSPage from './pages/admin/pos/POSPage'
import SalesPage from './pages/admin/sales/SalesPage'
import PurchasesPage from './pages/admin/purchases/PurchasesPage'
import CustomersPage from './pages/admin/customers/CustomersPage'
import WholesalersPage from './pages/admin/wholesalers/WholesalersPage'
import UsersPage from './pages/admin/users/UsersPage'
import SettingsPage from './pages/admin/settings/SettingsPage'
import LedgerPage from './pages/admin/ledger/LedgerPage'
import SupplierLedgerPage from './pages/admin/supplier-ledger/SupplierLedgerPage'
import PrescriptionsPage from './pages/admin/prescriptions/PrescriptionsPage'
import NarcoticReportPage from './pages/admin/narcotic-report/NarcoticReportPage'

// Other Role Pages
import PharmacistDashboard from './pages/pharmacist/PharmacistDashboard'
import StaffDashboard from './pages/staff/StaffDashboard'
import PatientDashboard from './pages/patient/PatientDashboard'
import RetailerDashboard from './pages/retailer/RetailerDashboard'
import WholesalerDashboard from './pages/wholesaler/WholesalerDashboard'

function App() {
  const { user, loading, initialize } = useAuthStore()

  useEffect(() => {
    if (supabase) {
      initialize()
    }
  }, [initialize])

  // Show setup page if Supabase is not configured
  if (!supabase) {
    return <SupabaseSetup />
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={!user ? <LoginPage /> : <Navigate to="/" replace />} 
          />
          
          {/* Root redirect based on role */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <RoleBasedRedirect />
              </ProtectedRoute>
            } 
          />

          {/* Admin Routes */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <Routes>
                    <Route index element={<AdminDashboard />} />
                    <Route path="medicines" element={<MedicinesPage />} />
                    <Route path="inventory" element={<InventoryPage />} />
                    <Route path="pos" element={<POSPage />} />
                    <Route path="sales" element={<SalesPage />} />
                    <Route path="purchases" element={<PurchasesPage />} />
                    <Route path="customers" element={<CustomersPage />} />
                    <Route path="ledger" element={<LedgerPage />} />
                    <Route path="supplier-ledger" element={<SupplierLedgerPage />} />
                    <Route path="prescriptions" element={<PrescriptionsPage />} />
                    <Route path="narcotic-report" element={<NarcoticReportPage />} />
                    <Route path="wholesalers" element={<WholesalersPage />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            } 
          />

          {/* Pharmacist Routes */}
          <Route 
            path="/pharmacist" 
            element={
              <ProtectedRoute requiredRole="pharmacist">
                <PharmacistDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Staff Routes */}
          <Route 
            path="/staff" 
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Patient Routes */}
          <Route 
            path="/patient" 
            element={
              <ProtectedRoute requiredRole="patient">
                <PatientDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Retailer Routes */}
          <Route 
            path="/retailer" 
            element={
              <ProtectedRoute requiredRole="retailer">
                <RetailerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Wholesaler Routes */}
          <Route 
            path="/wholesaler" 
            element={
              <ProtectedRoute requiredRole="wholesaler">
                <WholesalerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Catch all - redirect to login if not authenticated */}
          <Route 
            path="*" 
            element={<Navigate to={user ? "/" : "/login"} replace />} 
          />
        </Routes>

        {/* Global Toast Notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </Router>
  )
}

// Component to redirect based on user role
function RoleBasedRedirect() {
  const { getRedirectPath } = useAuthStore()
  return <Navigate to={getRedirectPath()} replace />
}

export default App