'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { usePatientStore } from '@/store/usePatientStore'
import { mockDoctors } from '@/lib/mockData'

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
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [ageError, setAgeError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  if (!authModalOpen) return null

  const handleSendOTP = async () => {
    if (!email || !email.includes('@')) {
      return
    }
    setIsLoading(true)
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsLoading(false)
    setOtpSent(true)
    setAuthStep(2)
    setResendTimer(30)
    setOtpError('')
  }

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (otp === '123456') {
      setOtpError('')
      if (authMode === 'login') {
        handleAuthSuccess()
      } else {
        setAuthStep(3)
      }
    } else {
      setOtpError('Invalid OTP. Please try again.')
    }
    setIsLoading(false)
  }

  const replayPendingAction = () => {
    if (!pendingAction) {
      clearPendingAction()
      return
    }

    const doctor = mockDoctors.find((d) => d.id === pendingAction.doctorId)
    if (!doctor) {
      clearPendingAction()
      return
    }

    setTimeout(() => {
      if (pendingAction.type === 'CALL') {
        window.location.href = `tel:${doctor.phone}`
      } else if (pendingAction.type === 'WHATSAPP') {
        window.open(`https://wa.me/${doctor.whatsapp.replace(/[^0-9]/g, '')}`, '_blank')
      } else if (pendingAction.type === 'PROFILE') {
        const { openProfileDrawer } = usePatientStore.getState()
        openProfileDrawer(doctor.id)
      } else if (pendingAction.type === 'SAVE') {
        const { toggleSavedDoctor } = usePatientStore.getState()
        toggleSavedDoctor(doctor.id)
      }
      clearPendingAction()
    }, 100)
  }

  const handleAuthSuccess = () => {
    const profile = authMode === 'register' ? { name, age: parseInt(age), gender, phone, city, email } : null
    setAuthSuccess(email, profile)
    setEmail('')
    setOtp('')
    setName('')
    setAge('')
    setGender('')
    setPhone('')
    setCity('')
    setOtpSent(false)
    replayPendingAction()
  }

  const handleCompleteRegistration = () => {
    if (!name || !age || !gender || !phone || !city) return
    if (parseInt(age) < 0 || parseInt(age) > 120) {
      setAgeError(parseInt(age) < 0 ? 'Age cannot be negative' : 'Age must be 120 or less')
      return
    }
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      setPhoneError('Enter a valid 10-digit phone number')
      return
    }
    setAgeError('')
    setPhoneError('')
    handleAuthSuccess()
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
                setOtp('')
                setOtpError('')
                setOtpSent(false)
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
                setOtp('')
                setOtpError('')
                setOtpSent(false)
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500">
                We'll send a one-time password to your email.
              </p>
              <button
                onClick={handleSendOTP}
                disabled={!email || !email.includes('@') || isLoading}
                className="w-full px-4 py-2 bg-primary-blue text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
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
                Complete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

