import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Zap, Package, FileText, RefreshCw, Database, Phone } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [logo, setLogo] = useState(null)
  const [pharmacyName, setPharmacyName] = useState('BillSprout')
  const { signIn } = useAuthStore()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('logo_url, pharmacy_name')
        .limit(1)
        .single()

      if (!error && data) {
        if (data.logo_url) setLogo(data.logo_url)
        if (data.pharmacy_name) setPharmacyName(data.pharmacy_name)
      }
    } catch (error) {
      // Silently handle - use defaults
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const result = await signIn(data.email, data.password)
      if (result.success) {
        toast.success('Login successful!')
      } else {
        toast.error(result.error || 'Login failed')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white p-12 flex-col justify-between">
        <div>
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 mb-12">
            <div className="h-14 w-14 bg-white rounded-lg flex items-center justify-center overflow-hidden">
              {logo ? (
                <img src={logo} alt="Logo" className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-2xl font-bold text-blue-900">Rx</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{pharmacyName}</h1>
              <p className="text-sm text-blue-200">Smart ERP & Fast POS Billing System</p>
              <p className="text-xs text-blue-300">Powered by BillSprout</p>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">Hybrid Offline-to-Online Zero Latency Engine</h3>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">FEFO Batch Selection & Schedule H/H1 Regulatory Logs</h3>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">Dual Thermal & PDF Printing + WhatsApp Receipt Sharing</h3>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">Over-The-Air (OTA) Enterprise Updates</h3>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">Supabase PostgreSQL Real-time Cloud Sync</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Support Info */}
        <div className="bg-blue-800/50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Phone className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-sm font-semibold">Support: +44 7747 571513</p>
              <p className="text-xs text-blue-200">Support@billsprout.online</p>
            </div>
          </div>
          <div className="text-blue-200">→</div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Portal Access Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Portal Access</h2>
            <p className="text-gray-500 text-sm">Select your portal and sign in.</p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>Email Address</span>
                  </div>
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="off"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4" />
                    <span>Password</span>
                  </div>
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="off"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Demo Accounts - For Testing */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center mb-3">Demo Accounts (Development Only):</p>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between bg-gray-50 p-2 rounded">
                  <span className="font-medium">Admin:</span>
                  <span className="font-mono">admin@pharmacy.com / admin123</span>
                </div>
                <div className="flex justify-between bg-gray-50 p-2 rounded">
                  <span className="font-medium">Pharmacist:</span>
                  <span className="font-mono">pharmacist@pharmacy.com / pharma123</span>
                </div>
                <div className="flex justify-between bg-gray-50 p-2 rounded">
                  <span className="font-medium">Staff:</span>
                  <span className="font-mono">staff@pharmacy.com / staff123</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>© 2024 BillSprout Smart ERP - LIFESPROUT Care</p>
            <p className="mt-1">Need help? Contact: <a href="mailto:support@billsprout.online" className="text-blue-900 hover:underline">support@billsprout.online</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage