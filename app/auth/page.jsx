'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { useDoctorStore } from '@/store/useDoctorStore'
import { createDoctorAccount, verifyOTP, loginDoctor } from '@/lib/doctorApi'
import { ApiError } from '@/lib/apiClient'
import Header from '@/components/doctor/Header'

export default function AuthPage() {
  const router = useRouter()
  const setAuth = useDoctorStore((state) => state.setAuth)
  const doctorAuth = useDoctorStore((state) => state.doctorAuth)

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [doctorId, setDoctorId] = useState(null)
  const [mockOtp, setMockOtp] = useState(null) // For dev mode
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    if (!password) {
      setError('Please enter your password')
      return
    }

    setLoading(true)
    try {
      const result = await loginDoctor(email, password)
      if (result.success && result.data) {
        const { doctorId, token, email: doctorEmail, name, onboardingStep } = result.data

        // Store auth in Zustand
        setAuth(doctorEmail, 'email', doctorId, token, onboardingStep)

        // Also store token in localStorage (loginDoctor handles this, but ensure it's set)
        if (typeof window !== 'undefined' && token) {
          localStorage.setItem('doctor_token', token)
        }

        setSuccess('Login successful!')
        setTimeout(() => {
          // Route based on onboarding step
          if (onboardingStep === 'COMPLETE') {
            router.push('/dashboard')
          } else {
            router.push('/onboarding')
          }
        }, 500)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'INVALID_CREDENTIALS' || err.status === 401) {
          setError('Invalid email or password. Please try again.')
        } else {
          setError(err.message || 'Login failed. Please try again.')
        }
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    // Validate password requirements
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number')
      return
    }

    setLoading(true)
    try {
      const result = await createDoctorAccount(email, password)
      if (result.success && result.data) {
        setDoctorId(result.data.doctorId)
        // In dev mode, API may return mockOtp
        if (result.data.mockOtp) {
          setMockOtp(result.data.mockOtp)
          setSuccess(`Account created! OTP: ${result.data.mockOtp} (dev mode)`)
        } else {
          setSuccess('Account created! Check your email for the verification code.')
        }
        setOtpSent(true)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('An account with this email already exists. Please sign in instead.')
        } else {
          setError(err.message || 'Failed to create account. Please try again.')
        }
      } else {
        setError('Failed to create account. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!otp || otp.length !== 6) {
      setError('Please enter a 6-digit OTP')
      return
    }

    setLoading(true)
    try {
      const result = await verifyOTP(email, otp)
      if (result.success && result.data) {
        const { doctorId: verifiedDoctorId, token, onboardingStep } = result.data
        
        // Store auth in Zustand
        setAuth(email, 'email', verifiedDoctorId, token, onboardingStep)
        
        // Also store token in localStorage (apiClient handles this, but ensure it's set)
        if (typeof window !== 'undefined' && token) {
          localStorage.setItem('doctor_token', token)
        }

        setSuccess('Email verified successfully!')
        
        setTimeout(() => {
          // Route based on onboarding step
          const auth = useDoctorStore.getState().doctorAuth
          if (onboardingStep === 'COMPLETE') {
            router.push('/dashboard')
          } else {
            router.push('/onboarding')
          }
        }, 500)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'INVALID_OTP') {
          setError('Invalid verification code. Please check and try again.')
        } else if (err.errorCode === 'OTP_EXPIRED') {
          setError('Verification code has expired. Please create a new account to get a new code.')
        } else {
          setError(err.message || 'Verification failed. Please try again.')
        }
      } else {
        setError('Verification failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    // TODO: Google sign-in endpoint not documented in apis.md
    // For now, show error message
    setError('Google sign-in is not yet available. Please use email and password to create an account.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {mode === 'login' ? 'Welcome back' : 'Join eCare+'}
              </h1>
              <p className="text-gray-600">
                {mode === 'login'
                  ? 'Sign in to your doctor account'
                  : 'Create your doctor account to get started'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={mode === 'login' ? handleLogin : handleCreateAccount} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="doctor@example.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="SecurePass123"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                      required
                    />
                  </div>
                  {mode === 'register' && (
                    <p className="mt-1 text-xs text-gray-500">
                      Must be at least 8 characters with uppercase, lowercase, and number
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-blue text-white py-3 rounded-lg font-semibold hover:bg-[#155a7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading
                    ? mode === 'login'
                      ? 'Signing in...'
                      : 'Creating account...'
                    : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
                  {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent text-center text-2xl tracking-widest"
                      required
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Enter the 6-digit code sent to {email}
                    {mockOtp && (
                      <span className="block mt-1 font-semibold text-primary-blue">
                        Dev mode OTP: {mockOtp}
                      </span>
                    )}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-blue text-white py-3 rounded-lg font-semibold hover:bg-[#155a7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                  {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false)
                    setOtp('')
                    setDoctorId(null)
                    setMockOtp(null)
                    setError('')
                    setSuccess('')
                  }}
                  className="w-full text-primary-blue py-2 text-sm font-medium hover:underline"
                >
                  Change email
                </button>
              </form>
            )}

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="mt-4 w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
            </div>

            <div className="mt-6 text-center text-sm">
              {mode === 'login' ? (
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setMode('register')
                      setOtpSent(false)
                      setOtp('')
                      setEmail('')
                      setPassword('')
                      setDoctorId(null)
                      setMockOtp(null)
                      setError('')
                      setSuccess('')
                    }}
                    className="text-primary-blue font-semibold hover:underline"
                  >
                    Register
                  </button>
                </p>
              ) : (
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setMode('login')
                      setOtpSent(false)
                      setOtp('')
                      setEmail('')
                      setPassword('')
                      setDoctorId(null)
                      setMockOtp(null)
                      setError('')
                      setSuccess('')
                    }}
                    className="text-primary-blue font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

