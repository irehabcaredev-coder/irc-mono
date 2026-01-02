'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { usePatientStore } from '@/store/usePatientStore'
import { fetchDoctorProfile } from '@/lib/doctorApi'
import { transformApiDoctorToCard } from '@/lib/dataTransformers'
import { createPatientAccount, verifyPatientOTP, submitPatientPersonalInfo, loginPatient } from '@/lib/patientApi'
import { ApiError } from '@/lib/apiClient'
import { mapGenderToAPI } from '@/lib/dataTransformers'

const cities = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Lucknow', 'Jaipur']

export default function AuthModal() {
  const {
    authModalOpen,
    authMode,
    authStep,
    pendingAction,
    closeAuthModal,
    setAuthStep,
    setAuthMode,
    setAuthSuccess,
    clearPendingAction,
  } = usePatientStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [ageError, setAgeError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [patientId, setPatientId] = useState(null)
  const [mockOtp, setMockOtp] = useState(null) // For dev mode

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  // Fetch doctor data if we have a pending action
  // This hook must be called before any early returns to follow Rules of Hooks
  const { data: doctorData } = useQuery({
    queryKey: ['doctor', pendingAction?.doctorId],
    queryFn: () => fetchDoctorProfile(pendingAction.doctorId),
    enabled: !!pendingAction?.doctorId,
  })

  if (!authModalOpen) return null

  const handleSendOTP = async () => {
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address')
      return
    }

    if (authMode === 'register' && !password) {
      setPasswordError('Password is required')
      return
    }

    if (authMode === 'register' && password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    setEmailError('')
    setPasswordError('')
    setIsLoading(true)

    try {
      if (authMode === 'register') {
        // Registration: Create account and send OTP
        const result = await createPatientAccount(email, password)
        if (result.success && result.data) {
          setPatientId(result.data.patientId)
          if (result.data.mockOtp) {
            setMockOtp(result.data.mockOtp)
          }
          setOtpSent(true)
          setAuthStep(2)
          setResendTimer(30)
          setOtpError('')
        }
      } else {
        // Login: For now, we'll use password-based login, but if OTP is needed, handle here
        // Actually, login should use password directly, not OTP
        // This function might not be needed for login mode
        setOtpError('Please use password to login')
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setEmailError('An account with this email already exists')
        } else {
          setEmailError(error.message || 'Failed to send OTP')
        }
      } else {
        setEmailError('An error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return

    setIsLoading(true)
    setOtpError('')

    try {
      if (authMode === 'register') {
        // Registration: Verify OTP
        const result = await verifyPatientOTP(email, otp)
        if (result.success && result.data) {
          setPatientId(result.data.patientId)
          // Token is already stored in localStorage by verifyPatientOTP
          setAuthStep(3) // Move to personal info step
        }
      } else {
        // Login mode shouldn't reach here if using password
        setOtpError('Invalid flow')
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setOtpError(error.message || 'Invalid OTP. Please try again.')
      } else {
        setOtpError('An error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address')
      return
    }

    if (!password) {
      setPasswordError('Password is required')
      return
    }

    setEmailError('')
    setPasswordError('')
    setIsLoading(true)

    try {
      const result = await loginPatient(email, password)
      if (result.success && result.data) {
        const { patientId, token, email: patientEmail, name, onboardingStep } = result.data
        // Token is already stored in localStorage by loginPatient
        // Update store with patient data
        const profile = { name, email: patientEmail, patientId, onboardingStep }
        setAuthSuccess(patientEmail, profile)
        setEmail('')
        setPassword('')
        replayPendingAction()
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setEmailError('Invalid email or password')
        } else {
          setEmailError(error.message || 'Login failed')
        }
      } else {
        setEmailError('An error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const replayPendingAction = async () => {
    if (!pendingAction) {
      clearPendingAction()
      return
    }

    // If we need doctor data (for CALL or WHATSAPP), wait for it
    if ((pendingAction.type === 'CALL' || pendingAction.type === 'WHATSAPP') && !doctorData?.data) {
      // Wait a bit and try again
      setTimeout(replayPendingAction, 200)
      return
    }

    const doctor = doctorData?.data ? transformApiDoctorToCard(doctorData.data) : null

    setTimeout(() => {
      if (pendingAction.type === 'CALL') {
        if (doctor?.phone) {
          window.location.href = `tel:${doctor.phone}`
        }
      } else if (pendingAction.type === 'WHATSAPP') {
        if (doctor?.whatsapp) {
          window.open(`https://wa.me/${doctor.whatsapp.replace(/[^0-9]/g, '')}`, '_blank')
        }
      } else if (pendingAction.type === 'PROFILE') {
        const { openProfileDrawer } = usePatientStore.getState()
        openProfileDrawer(pendingAction.doctorId)
      } else if (pendingAction.type === 'SAVE') {
        const { toggleSavedDoctor } = usePatientStore.getState()
        toggleSavedDoctor(pendingAction.doctorId)
      }
      clearPendingAction()
    }, 100)
  }

  const handleAuthSuccess = (patientEmail, patientProfile) => {
    setAuthSuccess(patientEmail, patientProfile)
    setEmail('')
    setPassword('')
    setOtp('')
    setName('')
    setAge('')
    setGender('')
    setPhone('')
    setCity('')
    setOtpSent(false)
    setPatientId(null)
    setMockOtp(null)
    replayPendingAction()
  }

  const handleCompleteRegistration = async () => {
    if (!name || !age || !gender || !phone || !city) return
    if (parseInt(age) < 0 || parseInt(age) > 120) {
      setAgeError(parseInt(age) < 0 ? 'Age cannot be negative' : 'Age must be 120 or less')
      return
    }
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      setPhoneError('Enter a valid 10-digit phone number')
      return
    }

    if (!patientId) {
      setPhoneError('Registration session expired. Please start over.')
      return
    }

    setAgeError('')
    setPhoneError('')
    setIsLoading(true)

    try {
      // Format phone number with country code
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
      
      const result = await submitPatientPersonalInfo(patientId, {
        name,
        phone: formattedPhone,
        gender: mapGenderToAPI(gender),
        age: parseInt(age),
        city,
      })

      if (result.success && result.data) {
        const { patientId: finalPatientId, email: patientEmail, name: patientName } = result.data
        const profile = {
          patientId: finalPatientId,
          name: patientName,
          email: patientEmail,
          age: parseInt(age),
          gender,
          phone: formattedPhone,
          city,
        }
        handleAuthSuccess(patientEmail, profile)
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setPhoneError(error.message || 'Failed to complete registration')
      } else {
        setPhoneError('An error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = () => {
    if (resendTimer > 0) return
    setOtp('')
    setOtpError('')
    handleSendOTP()
  }

  const handleChangeEmail = () => {
    setOtp('')
    setOtpSent(false)
    setOtpError('')
    setAuthStep(1)
  }

  const handleAgeChange = (value) => {
    setAge(value)
    if (value) {
      const ageNum = parseInt(value)
      if (ageNum < 0) {
        setAgeError('Age cannot be negative')
      } else if (ageNum > 120) {
        setAgeError('Age must be 120 or less')
      } else {
        setAgeError('')
      }
    } else {
      setAgeError('')
    }
  }

  const handlePhoneChange = (value) => {
    // Only allow numeric input, max 10 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 10)
    setPhone(numericValue)
    if (numericValue.length > 0 && numericValue.length !== 10) {
      setPhoneError('Enter a valid 10-digit phone number')
    } else {
      setPhoneError('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="bg-white border border-gray-200 rounded-sm shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setAuthMode('login')
                setAuthStep(1)
                setEmail('')
                setPassword('')
                setOtp('')
                setOtpError('')
                setEmailError('')
                setPasswordError('')
                setOtpSent(false)
                setPatientId(null)
                setMockOtp(null)
              }}
              className={`px-3 py-1 text-sm font-medium ${
                authMode === 'login'
                  ? 'text-primary-blue border-b-2 border-primary-blue'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => {
                setAuthMode('register')
                setAuthStep(1)
                setEmail('')
                setPassword('')
                setOtp('')
                setOtpError('')
                setEmailError('')
                setPasswordError('')
                setOtpSent(false)
                setPatientId(null)
                setMockOtp(null)
              }}
              className={`px-3 py-1 text-sm font-medium ${
                authMode === 'register'
                  ? 'text-primary-blue border-b-2 border-primary-blue'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Register
            </button>
          </div>
          <button
            onClick={closeAuthModal}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {authStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError('')
                  }}
                  placeholder="Enter your email"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent ${
                    emailError ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {emailError && (
                  <p className="text-xs text-accent-red mt-1">{emailError}</p>
                )}
              </div>
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setPasswordError('')
                      }}
                      placeholder="Enter your password"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent ${
                        passwordError ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {passwordError && (
                      <p className="text-xs text-accent-red mt-1">{passwordError}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Must be at least 8 characters with uppercase, lowercase, and number
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    We'll send a one-time password to your email.
                  </p>
                  <button
                    onClick={handleSendOTP}
                    disabled={!email || !email.includes('@') || !password || isLoading}
                    className="w-full px-4 py-2 bg-primary-blue text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Sending...' : 'Send OTP'}
                  </button>
                </>
              )}
              {authMode === 'login' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setPasswordError('')
                      }}
                      placeholder="Enter your password"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent ${
                        passwordError ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {passwordError && (
                      <p className="text-xs text-accent-red mt-1">{passwordError}</p>
                    )}
                  </div>
                  <button
                    onClick={handleLogin}
                    disabled={!email || !email.includes('@') || !password || isLoading}
                    className="w-full px-4 py-2 bg-primary-blue text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Logging in...' : 'Log in'}
                  </button>
                </>
              )}
            </div>
          )}

          {authStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtp(value)
                    setOtpError('')
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                    setOtp(pasted)
                    setOtpError('')
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-center text-lg tracking-widest"
                />
                {otpError && (
                  <p className="text-xs text-accent-red mt-1">{otpError}</p>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <button
                  onClick={handleChangeEmail}
                  className="text-primary-blue hover:underline"
                >
                  Change email
                </button>
                <button
                  onClick={handleResendOTP}
                  disabled={resendTimer > 0}
                  className="text-primary-blue hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP'}
                </button>
              </div>
              {mockOtp && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <strong>Dev Mode:</strong> Use OTP: {mockOtp}
                </div>
              )}
              <button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 6 || isLoading}
                className="w-full px-4 py-2 bg-primary-blue text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          )}

          {authStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  placeholder="Enter your age"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                />
                {ageError && (
                  <p className="text-xs text-accent-red mt-1">{ageError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="Enter 10-digit phone number"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                />
                {phoneError && (
                  <p className="text-xs text-accent-red mt-1">{phoneError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                >
                  <option value="">Select city</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCompleteRegistration}
                disabled={!name || !age || !gender || !phone || !city || isLoading || parseInt(age) < 0 || parseInt(age) > 120 || phone.length !== 10}
                className="w-full px-4 py-2 bg-primary-blue text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Completing...' : 'Complete'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

