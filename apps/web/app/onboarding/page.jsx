'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ArrowLeft, BadgeCheck } from 'lucide-react'
import { useDoctorStore } from '@/store/useDoctorStore'
import {
  submitPersonalInfo,
  submitProfessionalInfo,
  submitAvailability,
  submitPaymentInfo,
  verifyRciRegistration,
} from '@/lib/doctorApi'
import { fetchDoctorProfile } from '@/lib/doctorApi'

import { ApiError } from '@/lib/apiClient'
import {
  transformBasicDetailsToAPI,
  transformProfessionalDetailsToAPI,
  transformPracticeDetailsToAPI,
  transformPaymentDetailsToAPI,
} from '@/lib/dataTransformers'
import Header from '@/components/doctor/Header'

const genders = ['Male', 'Female', 'Other', 'Prefer not to say']
const languages = ['English', 'Hindi', 'Bengali', 'Assamese', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu']
const specialties = ['Audiologist', 'Speech Therapist', 'Both']
const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const currentYear = new Date().getFullYear()
const graduationYears = Array.from({ length: currentYear - 1994 }, (_, i) => currentYear - i)

function OnboardingContent() {
  const router = useRouter()
  const doctorAuth = useDoctorStore((state) => state.doctorAuth)
  const setAuth = useDoctorStore((state) => state.setAuth)
  const doctorProfile = useDoctorStore((state) => state.doctorProfile)
  const setOnboardingStep = useDoctorStore((state) => state.setOnboardingStep)
  const setOnboarded = useDoctorStore((state) => state.setOnboarded)
  const updateBasicDetails = useDoctorStore((state) => state.updateBasicDetails)
  const updateProfessionalDetails = useDoctorStore((state) => state.updateProfessionalDetails)
  const updatePracticeDetails = useDoctorStore((state) => state.updatePracticeDetails)
  const updatePaymentDetails = useDoctorStore((state) => state.updatePaymentDetails)

  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token')

  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState({})
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)
  const hasInitialized = useRef(false)

  // RCI verification gates the whole flow: null = not yet known, false = must verify, true = verified
  const [rciVerified, setRciVerified] = useState(null)
  const [rciNumber, setRciNumber] = useState('')
  const [rciLoading, setRciLoading] = useState(false)
  const [rciError, setRciError] = useState('')

  // JWT Parser (Robust for base64url)
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("JWT Parse Error:", e);
      return null;
    }
  };

  // Step 2: Basic Details state
  const [basicData, setBasicData] = useState(doctorProfile.basic || {
    name: '',
    age: null,
    gender: '',
    languages: [],
    phone: '',
  })

  // Step 3: Professional Details state
  const [professionalData, setProfessionalData] = useState(doctorProfile.professional || {
    specialty: '',
    yearsOfExperience: null,
    recentGraduation: null,
  })

  // Step 4: Practice Details state
  const [practiceData, setPracticeData] = useState(doctorProfile.practice || {
    address: '',
    city: '',
    state: '',
    availableDays: [],
    timings: {
      from: '',
      to: '',
    },
  })

  // Step 4: Payment Info state
  const [paymentData, setPaymentData] = useState({
    consultationFee: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankBeneficiaryName: '',
  })

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated || !doctorAuth.isAuthed || !doctorAuth.doctorId) return
    let cancelled = false
    fetchDoctorProfile(doctorAuth.doctorId)
      .then((result) => {
        if (!cancelled) setRciVerified(Boolean(result?.data?.rciRegistrationId))
      })
      .catch(() => {
        // Can't tell, so keep the gate closed; the server enforces it regardless
        if (!cancelled) setRciVerified(false)
      })
    return () => { cancelled = true }
  }, [isHydrated, doctorAuth.isAuthed, doctorAuth.doctorId])

  useEffect(() => {
    if (rciVerified === false && step !== 1) setStep(1)
  }, [rciVerified, step])

  const handleVerifyRci = async () => {
    if (!rciNumber.trim()) {
      setRciError('Enter your RCI registration number')
      return
    }
    setRciError('')
    setRciLoading(true)
    try {
      await verifyRciRegistration(rciNumber)
      setRciVerified(true)
    } catch (error) {
      setRciError(error instanceof ApiError ? error.message : 'Could not verify your RCI number. Please try again.')
    } finally {
      setRciLoading(false)
    }
  }

  // Helper: map backend onboarding step to UI step number
  const getStepFromOnboardingStep = (onboardingStep) => {
    switch (onboardingStep) {
      case 'PERSONAL_INFO_COMPLETE':
        return { step: 1, redirect: null }   // Land on personal info (even if backend says complete)
      case 'PROFESSIONAL_INFO_COMPLETE':
        return { step: 2, redirect: null }   // Move to professional info
      case 'AVAILABILITY_COMPLETE':
        return { step: 3, redirect: null }   // Move to availability
      case 'PAYMENT_INFO_COMPLETE':
        return { step: 4, redirect: null }   // Move to payment info
      case 'COMPLETE':
        return { step: null, redirect: '/dashboard' }
      case 'EMAIL_VERIFIED':
      default:
        return { step: 1, redirect: null }   // Start at personal info
    }
  }

  useEffect(() => {
    // Only run auth checks after hydration
    if (!isHydrated) return

    // Skip if initial auth/step setup has already been done
    // This prevents handleSubmitStep's setOnboardingStep from re-triggering this effect
    if (hasInitialized.current) return

    const handleAuth = async () => {
      // 1. Check for token in URL (Google OAuth flow)
      if (tokenFromUrl) {
        // IMMEDIATE PRIORITY: Save token to localStorage so API calls work
        localStorage.setItem('doctor_token', tokenFromUrl)

        const decoded = parseJwt(tokenFromUrl)
        if (decoded && decoded.email && decoded.doctorId) {
          // Update store with initial auth info
          setAuth(decoded.email, 'google', decoded.doctorId, tokenFromUrl)

          let resolvedOnboardingStep = null

          // Sync with backend to get latest onboarding step and data
          try {
            const profileResult = await fetchDoctorProfile(decoded.doctorId)
            if (profileResult.success && profileResult.data) {
              const { onboardingStep, ...profileData } = profileResult.data

              resolvedOnboardingStep = onboardingStep

              // Update store with latest step
              setOnboardingStep(onboardingStep)

              // Update profile data if available
              if (profileData.personalInfo) {
                updateBasicDetails(profileData.personalInfo)
              }
              if (profileData.professionalInfo) {
                updateProfessionalDetails(profileData.professionalInfo)
              }
              if (profileData.availability) {
                updatePracticeDetails(profileData.availability)
              }

              // If complete, mark as onboarded
              if (onboardingStep === 'COMPLETE') {
                setOnboarded(profileResult.data)
              }
            }
          } catch (error) {
            console.error("Failed to sync profile:", error)
            // Continue with URL token, user might be new — start at step 1
          }

          // Determine and set the correct step for this Google OAuth user
          const { step: resolvedStep, redirect } = getStepFromOnboardingStep(resolvedOnboardingStep)
          if (redirect) {
            router.push(redirect)
          } else {
            setStep(resolvedStep)
          }
          hasInitialized.current = true
          return
        }
      }

      // 2. If no URL token, check if already authenticated
      if (!doctorAuth.isAuthed || !doctorAuth.doctorId) {
        // Double check localStorage just in case
        const localToken = localStorage.getItem('doctor_token')
        if (localToken) {
          const decoded = parseJwt(localToken)
          if (decoded) {
            setAuth(decoded.email, 'email', decoded.doctorId, localToken)
            // Don't mark initialized yet — effect will re-run once auth is set
            return
          }
        }

        router.push('/auth')
        return
      }

      // 3. Determine starting step based on onboarding step from store
      const { step: resolvedStep, redirect } = getStepFromOnboardingStep(doctorAuth.onboardingStep)
      if (redirect) {
        router.push(redirect)
      } else {
        setStep(resolvedStep)
      }
      hasInitialized.current = true
    }

    handleAuth()

  }, [isHydrated, tokenFromUrl, router, setAuth, setOnboardingStep, setOnboarded, updateBasicDetails, updateProfessionalDetails, updatePracticeDetails, doctorAuth.isAuthed, doctorAuth.doctorId, doctorAuth.onboardingStep])

  const validateStep = (stepNum) => {
    const newErrors = {}

    if (stepNum === 1) {
      // Step 1: RCI verification, then Personal Info
      if (!rciVerified) newErrors.rci = 'Verify your RCI registration number to continue'
      if (!basicData?.name?.trim()) newErrors.name = 'Name is required'
      if (!basicData?.age || basicData?.age < 18 || basicData?.age > 100) {
        newErrors.age = 'Please enter a valid age (18-100)'
      }
      if (!basicData?.gender) newErrors.gender = 'Please select gender'
      if (!basicData?.languages || basicData.languages.length === 0) {
        newErrors.languages = 'Please select at least one language'
      }
      if (!basicData?.phone || basicData.phone.trim().length === 0) {
        newErrors.phone = 'Please enter a valid phone number'
      }
    }

    if (stepNum === 2) {
      // Step 2: Professional Info
      if (!professionalData?.specialty?.trim()) {
        newErrors.specialty = 'Please select a specialty'
      }
      if (
        professionalData?.yearsOfExperience === null ||
        professionalData?.yearsOfExperience === undefined ||
        professionalData?.yearsOfExperience < 0 ||
        professionalData?.yearsOfExperience > 50
      ) {
        newErrors.yearsOfExperience = 'Please enter valid years of experience (0-50)'
      }
      if (!professionalData?.recentGraduation) {
        newErrors.recentGraduation = 'Please select graduation year'
      }
    }

    if (stepNum === 3) {
      // Step 3: Availability
      if (!practiceData?.address?.trim() || practiceData.address.trim().length < 5) {
        newErrors.address = 'Address must be at least 5 characters'
      }
      if (!practiceData?.city?.trim() || practiceData.city.trim().length < 2) {
        newErrors.city = 'City is required'
      }
      if (!practiceData?.state?.trim() || practiceData.state.trim().length < 2) {
        newErrors.state = 'State is required'
      }
      if (!practiceData?.availableDays || practiceData.availableDays.length === 0) {
        newErrors.availableDays = 'Please select at least one day'
      }
      if (!practiceData?.timings?.from || !practiceData?.timings?.to) {
        newErrors.timings = 'Please select both start and end time'
      } else {
        // Validate timing format
        const from = practiceData.timings.from
        const to = practiceData.timings.to
        if (from >= to) {
          newErrors.timings = 'Start time must be before end time'
        }
      }
    }

    if (stepNum === 4) {
      // Step 4: Payment Info
      const fee = Number(paymentData?.consultationFee)
      if (!paymentData?.consultationFee || isNaN(fee) || fee <= 0) {
        newErrors.consultationFee = 'Please enter a valid consultation fee'
      }
      const accNum = paymentData?.bankAccountNumber?.trim() || ''
      if (accNum.length < 9 || accNum.length > 18) {
        newErrors.bankAccountNumber = 'Account number must be 9-18 characters'
      }
      const ifsc = (paymentData?.bankIfsc?.trim() || '').toUpperCase()
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        newErrors.bankIfsc = 'Invalid IFSC code (e.g. SBIN0001234)'
      }
      const beneficiary = paymentData?.bankBeneficiaryName?.trim() || ''
      if (beneficiary.length < 2) {
        newErrors.bankBeneficiaryName = 'Beneficiary name must be at least 2 characters'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit handlers for each step
  const handleSubmitStep = async (stepNum) => {
    if (!validateStep(stepNum)) {
      return
    }

    setSubmitError('')
    setSubmitLoading(true)

    try {
      const doctorId = doctorAuth.doctorId

      if (stepNum === 1) {
        // Submit Personal Info
        const apiData = transformBasicDetailsToAPI(basicData)
        const result = await submitPersonalInfo(doctorId, apiData)

        if (result.success && result.data) {
          updateBasicDetails(basicData)
          setOnboardingStep(result.data.onboardingStep)
          setStep(2)
        }
      } else if (stepNum === 2) {
        // Submit Professional Info
        const apiData = transformProfessionalDetailsToAPI(professionalData)
        const result = await submitProfessionalInfo(doctorId, apiData)

        if (result.success && result.data) {
          updateProfessionalDetails(professionalData)
          setOnboardingStep(result.data.onboardingStep)
          setStep(3)
        }
      } else if (stepNum === 3) {
        // Submit Availability
        const apiData = transformPracticeDetailsToAPI(practiceData)
        const result = await submitAvailability(doctorId, apiData)

        if (result.success && result.data) {
          updatePracticeDetails(practiceData)
          setOnboardingStep(result.data.onboardingStep)
          setStep(4) // Move to payment info
        }
      } else if (stepNum === 4) {
        // Submit Payment Info (final step)
        const result = await submitPaymentInfo(doctorId, {
          consultationFee: Number(paymentData.consultationFee),
          bankAccountNumber: paymentData.bankAccountNumber,
          bankIfsc: paymentData.bankIfsc,
          bankBeneficiaryName: paymentData.bankBeneficiaryName,
        })

        if (result.success && result.data) {
          // Force COMPLETE regardless of backend response to prevent
          // dashboard from redirecting back to onboarding
          setOnboardingStep('COMPLETE')

          // Mark as onboarded and save profile
          const completeProfile = {
            basic: basicData,
            professional: professionalData,
            practice: practiceData,
            payment: paymentData,
          }
          setOnboarded(completeProfile)

          // Redirect to dashboard
          router.push('/dashboard')
        }
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errorCode === 'INVALID_ONBOARDING_STEP') {
          setSubmitError('Please complete the previous steps first.')
        } else {
          setSubmitError(error.message || 'Failed to save information. Please try again.')
        }
      } else {
        setSubmitError('An error occurred. Please try again.')
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleNext = () => {
    handleSubmitStep(step)
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      setSubmitError('')
    }
  }

  const toggleLanguage = (lang) => {
    const currentLanguages = basicData?.languages || []
    const languages = currentLanguages.includes(lang)
      ? currentLanguages.filter((l) => l !== lang)
      : [...currentLanguages, lang]
    setBasicData((prev) => ({ ...prev, languages }))
    if (errors.languages) {
      setErrors((prev) => ({ ...prev, languages: null }))
    }
  }

  const toggleDay = (day) => {
    const currentDays = practiceData?.availableDays || []
    const days = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day]
    setPracticeData((prev) => ({ ...prev, availableDays: days }))
    if (errors.availableDays) {
      setErrors((prev) => ({ ...prev, availableDays: null }))
    }
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {step === 1 && 'Personal Information'}
                {step === 2 && 'Professional Details'}
                {step === 3 && 'Practice Details'}
                {step === 4 && 'Payment Information'}
              </h1>
              <p className="text-gray-600">Step {step} of 4</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            {submitError && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {submitError}
              </div>
            )}

            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RCI Registration Number *
                  </label>
                  {rciVerified ? (
                    <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
                      <BadgeCheck className="w-5 h-5" />
                      RCI registration verified
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={rciNumber}
                          onChange={(e) => {
                            setRciNumber(e.target.value)
                            if (rciError) setRciError('')
                            if (errors.rci) setErrors((prev) => ({ ...prev, rci: null }))
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleVerifyRci()
                            }
                          }}
                          disabled={rciLoading || rciVerified === null}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent uppercase"
                          placeholder="e.g. A12345"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyRci}
                          disabled={rciLoading || rciVerified === null}
                          className="px-6 py-3 bg-primary-blue text-white rounded-lg font-semibold hover:bg-[#155a7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {rciLoading ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Your registration must be active with the Rehabilitation Council of India. Each RCI number can be linked to one account only.
                      </p>
                    </>
                  )}
                  {(rciError || errors.rci) && (
                    <p className="mt-1 text-sm text-accent-red">{rciError || errors.rci}</p>
                  )}
                </div>

                <fieldset
                  disabled={!rciVerified}
                  className={`space-y-6 min-w-0 border-0 p-0 m-0 transition-opacity ${rciVerified ? '' : 'opacity-50 pointer-events-none select-none'}`}
                >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={basicData?.name || ''}
                    onChange={(e) => {
                      setBasicData((prev) => ({ ...prev, name: e.target.value }))
                      if (errors.name) setErrors((prev) => ({ ...prev, name: null }))
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    placeholder="Dr. John Doe"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-accent-red">{errors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age *
                    </label>
                    <input
                      type="number"
                      min="18"
                      max="90"
                      value={basicData?.age || ''}
                      onChange={(e) => {
                        setBasicData((prev) => ({ ...prev, age: parseInt(e.target.value) || null }))
                        if (errors.age) setErrors((prev) => ({ ...prev, age: null }))
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                      placeholder="30"
                    />
                    {errors.age && (
                      <p className="mt-1 text-sm text-accent-red">{errors.age}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender *
                    </label>
                    <select
                      value={basicData?.gender || ''}
                      onChange={(e) => {
                        setBasicData((prev) => ({ ...prev, gender: e.target.value }))
                        if (errors.gender) setErrors((prev) => ({ ...prev, gender: null }))
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    >
                      <option value="">Select gender</option>
                      {genders.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {errors.gender && (
                      <p className="mt-1 text-sm text-accent-red">{errors.gender}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number * (10 digits)
                  </label>
                  <input
                    type="tel"
                    value={basicData?.phone || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setBasicData((prev) => ({ ...prev, phone: value }))
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }))
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    placeholder="9876543210"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-accent-red">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Languages Spoken * (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${basicData?.languages?.includes(lang)
                          ? 'bg-primary-blue text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                  {errors.languages && (
                    <p className="mt-2 text-sm text-accent-red">{errors.languages}</p>
                  )}
                </div>
                </fieldset>
              </div>
            )}

            {/* Step 2: Professional Details */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialty *
                  </label>
                  <select
                    value={professionalData?.specialty || ''}
                    onChange={(e) => {
                      setProfessionalData((prev) => ({ ...prev, specialty: e.target.value }))
                      if (errors.specialty) setErrors((prev) => ({ ...prev, specialty: null }))
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                  >
                    <option value="">Select specialty</option>
                    {specialties.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                  {errors.specialty && (
                    <p className="mt-1 text-sm text-accent-red">{errors.specialty}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={professionalData?.yearsOfExperience || ''}
                      onChange={(e) => {
                        setProfessionalData((prev) => ({ ...prev, yearsOfExperience: parseInt(e.target.value) || 0 }))
                        if (errors.yearsOfExperience) setErrors((prev) => ({ ...prev, yearsOfExperience: null }))
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                      placeholder="0"
                    />
                    {errors.yearsOfExperience && (
                      <p className="mt-1 text-sm text-accent-red">{errors.yearsOfExperience}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Graduation Year *
                    </label>
                    <select
                      value={professionalData?.recentGraduation || ''}
                      onChange={(e) => {
                        setProfessionalData((prev) => ({ ...prev, recentGraduation: parseInt(e.target.value) || null }))
                        if (errors.recentGraduation) setErrors((prev) => ({ ...prev, recentGraduation: null }))
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    >
                      <option value="">Select year</option>
                      {graduationYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    {errors.recentGraduation && (
                      <p className="mt-1 text-sm text-accent-red">{errors.recentGraduation}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Practice Details */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    value={practiceData?.address || ''}
                    onChange={(e) => {
                      setPracticeData((prev) => ({ ...prev, address: e.target.value }))
                      if (errors.address) setErrors((prev) => ({ ...prev, address: null }))
                    }}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    placeholder="Clinic/Hospital address"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-accent-red">{errors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={practiceData?.city || ''}
                      onChange={(e) => {
                        setPracticeData((prev) => ({ ...prev, city: e.target.value }))
                        if (errors.city) setErrors((prev) => ({ ...prev, city: null }))
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                      placeholder="Mumbai"
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-accent-red">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      value={practiceData?.state || ''}
                      onChange={(e) => {
                        setPracticeData((prev) => ({ ...prev, state: e.target.value }))
                        if (errors.state) setErrors((prev) => ({ ...prev, state: null }))
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                      placeholder="Maharashtra"
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-accent-red">{errors.state}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Days *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${practiceData?.availableDays?.includes(day)
                          ? 'bg-primary-blue text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  {errors.availableDays && (
                    <p className="mt-2 text-sm text-accent-red">{errors.availableDays}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From *
                    </label>
                    <input
                      type="time"
                      value={practiceData?.timings?.from || ''}
                      onChange={(e) => {
                        setPracticeData((prev) => ({
                          ...prev,
                          timings: { ...prev.timings, from: e.target.value },
                        }))
                        if (errors.timings) setErrors((prev) => ({ ...prev, timings: null }))
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To *
                    </label>
                    <input
                      type="time"
                      value={practiceData?.timings?.to || ''}
                      onChange={(e) => {
                        setPracticeData((prev) => ({
                          ...prev,
                          timings: { ...prev.timings, to: e.target.value },
                        }))
                        if (errors.timings) setErrors((prev) => ({ ...prev, timings: null }))
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    />
                  </div>
                </div>
                {errors.timings && (
                  <p className="text-sm text-accent-red">{errors.timings}</p>
                )}
              </div>
            )}

            {/* Step 4: Payment Information */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Final Step!</strong> Please enter your payment details to receive consultation payments. Your information is used to create a secure payment account.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consultation Fee (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                    <input
                      type="number"
                      min="1"
                      value={paymentData.consultationFee}
                      onChange={(e) => {
                        setPaymentData((prev) => ({ ...prev, consultationFee: e.target.value }))
                        if (errors.consultationFee) setErrors((prev) => ({ ...prev, consultationFee: null }))
                      }}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                      placeholder="500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Amount in INR that patients will pay per consultation</p>
                  {errors.consultationFee && (
                    <p className="mt-1 text-sm text-accent-red">{errors.consultationFee}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Account Number *
                  </label>
                  <input
                    type="text"
                    value={paymentData.bankAccountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 18)
                      setPaymentData((prev) => ({ ...prev, bankAccountNumber: value }))
                      if (errors.bankAccountNumber) setErrors((prev) => ({ ...prev, bankAccountNumber: null }))
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    placeholder="Enter your bank account number"
                  />
                  <p className="mt-1 text-xs text-gray-500">9-18 digit bank account number</p>
                  {errors.bankAccountNumber && (
                    <p className="mt-1 text-sm text-accent-red">{errors.bankAccountNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={paymentData.bankIfsc}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)
                      setPaymentData((prev) => ({ ...prev, bankIfsc: value }))
                      if (errors.bankIfsc) setErrors((prev) => ({ ...prev, bankIfsc: null }))
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent font-mono tracking-wider"
                    placeholder="SBIN0001234"
                  />
                  <p className="mt-1 text-xs text-gray-500">11-character IFSC code (e.g. SBIN0001234)</p>
                  {errors.bankIfsc && (
                    <p className="mt-1 text-sm text-accent-red">{errors.bankIfsc}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beneficiary Name *
                  </label>
                  <input
                    type="text"
                    value={paymentData.bankBeneficiaryName}
                    onChange={(e) => {
                      setPaymentData((prev) => ({ ...prev, bankBeneficiaryName: e.target.value }))
                      if (errors.bankBeneficiaryName) setErrors((prev) => ({ ...prev, bankBeneficiaryName: null }))
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    placeholder="Name as per bank account"
                  />
                  <p className="mt-1 text-xs text-gray-500">Name of the account holder as per bank records</p>
                  {errors.bankBeneficiaryName && (
                    <p className="mt-1 text-sm text-accent-red">{errors.bankBeneficiaryName}</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <button
                onClick={handleBack}
                disabled={step === 1 || submitLoading}
                className="flex items-center px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={submitLoading || (step === 1 && !rciVerified)}
                className="flex items-center px-6 py-3 bg-primary-blue text-white rounded-lg font-semibold hover:bg-[#155a7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitLoading
                  ? 'Saving...'
                  : step === 4
                    ? 'Complete Setup'
                    : 'Next'}
                {!submitLoading && <ArrowRight className="w-5 h-5 ml-2" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
