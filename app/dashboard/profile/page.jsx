'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useDoctorStore } from '@/store/useDoctorStore'
import { fetchDoctorProfile, updateDoctorProfile } from '@/lib/doctorApi'
import { ApiError } from '@/lib/apiClient'
import { transformApiProfileToUI } from '@/lib/dataTransformers'
import DashboardSidebar, { MobileMenuButton } from '@/components/doctor/DashboardSidebar'
import FeedbackButton from '@/components/doctor/FeedbackButton'
import { Edit2, Save, X } from 'lucide-react'

const genders = ['Male', 'Female', 'Other', 'Prefer not to say']
const languages = ['English', 'Hindi', 'Bengali', 'Assamese', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu']
const specialties = ['Audiologist', 'Speech Therapist', 'Both']
const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const currentYear = new Date().getFullYear()
const graduationYears = Array.from({ length: currentYear - 1994 }, (_, i) => currentYear - i)

export default function ProfilePage() {
  const router = useRouter()
  const doctorAuth = useDoctorStore((state) => state.doctorAuth)
  const doctorProfile = useDoctorStore((state) => state.doctorProfile)
  const updateBasicDetails = useDoctorStore((state) => state.updateBasicDetails)
  const updateProfessionalDetails = useDoctorStore((state) => state.updateProfessionalDetails)
  const updatePracticeDetails = useDoctorStore((state) => state.updatePracticeDetails)

  const [isEditing, setIsEditing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [basicData, setBasicData] = useState(doctorProfile.basic || {
    name: '',
    age: null,
    gender: '',
    languages: [],
    phone: '',
  })
  const [professionalData, setProfessionalData] = useState(doctorProfile.professional || {
    specialty: '',
    yearsOfExperience: null,
    recentGraduation: null,
  })
  const [practiceData, setPracticeData] = useState(doctorProfile.practice || {
    address: '',
    city: '',
    locality: '',
    availableDays: [],
    timings: {
      from: '',
      to: '',
    },
  })

  const setOnboarded = useDoctorStore((state) => state.setOnboarded)

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    // Only run auth checks after hydration
    if (!isHydrated) return
    
    if (!doctorAuth.isAuthed) {
      router.push('/auth')
    } else if (doctorAuth.onboardingStep !== 'COMPLETE') {
      router.push('/onboarding')
    }
  }, [doctorAuth, router, isHydrated])

  // Fetch doctor profile from API
  const { data: apiProfile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['doctorProfile', doctorAuth.doctorId],
    queryFn: () => fetchDoctorProfile(doctorAuth.doctorId),
    enabled: !!doctorAuth.doctorId && doctorAuth.isAuthed && doctorAuth.onboardingStep === 'COMPLETE',
  })

  // Update store when API profile is fetched
  useEffect(() => {
    if (apiProfile?.success && apiProfile?.data) {
      const uiProfile = transformApiProfileToUI(apiProfile.data)
      if (uiProfile) {
        setOnboarded(uiProfile)
      }
    }
  }, [apiProfile, setOnboarded])

  useEffect(() => {
    setBasicData(doctorProfile.basic || {
      name: '',
      age: null,
      gender: '',
      languages: [],
      phone: '',
    })
    setProfessionalData(doctorProfile.professional || {
      specialty: '',
      yearsOfExperience: null,
      recentGraduation: null,
    })
    setPracticeData(doctorProfile.practice || {
      address: '',
      city: '',
      locality: '',
      availableDays: [],
      timings: {
        from: '',
        to: '',
      },
    })
  }, [doctorProfile])

  const handleSave = async () => {
    // TODO: Update doctor profile via API when endpoint is available
    // For now, save to local store only
    try {
      // const doctorId = doctorAuth.doctorId
      // await updateDoctorProfile(doctorId, {
      //   basic: basicData,
      //   professional: professionalData,
      //   practice: practiceData,
      // })
      // After successful update, refetch profile
      // await refetchProfile()

      // Save to local store
      updateBasicDetails(basicData)
      updateProfessionalDetails(professionalData)
      updatePracticeDetails(practiceData)
      setIsEditing(false)
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === 'NOT_IMPLEMENTED') {
        // API not available, save to local store only
        updateBasicDetails(basicData)
        updateProfessionalDetails(professionalData)
        updatePracticeDetails(practiceData)
        setIsEditing(false)
      } else {
        console.error('Failed to update profile:', error)
        alert('Failed to save profile. Please try again.')
      }
    }
  }

  const handleCancel = () => {
    setBasicData(doctorProfile.basic || {})
    setProfessionalData(doctorProfile.professional || {})
    setPracticeData(doctorProfile.practice || {})
    setIsEditing(false)
  }

  const toggleLanguage = (lang) => {
    const languages = basicData.languages?.includes(lang)
      ? basicData.languages.filter((l) => l !== lang)
      : [...(basicData.languages || []), lang]
    setBasicData((prev) => ({ ...prev, languages }))
  }

  const toggleDay = (day) => {
    const days = practiceData.availableDays?.includes(day)
      ? practiceData.availableDays.filter((d) => d !== day)
      : [...(practiceData.availableDays || []), day]
    setPracticeData((prev) => ({ ...prev, availableDays: days }))
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

  if (!doctorAuth.isAuthed || doctorAuth.onboardingStep !== 'COMPLETE') {
    return null
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-paper">
        <MobileMenuButton onClick={() => setSidebarOpen(true)} isOpen={sidebarOpen} />
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 lg:pt-8">
            <div className="text-center py-12">
              <p className="text-gray-600">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper relative">
      <FeedbackButton />
      <MobileMenuButton onClick={() => setSidebarOpen(true)} isOpen={sidebarOpen} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 lg:pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Profile</h1>
              <p className="text-sm sm:text-base text-gray-600">Manage your professional profile information</p>
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center px-4 py-2 bg-primary-blue text-white rounded-lg font-semibold hover:bg-[#155a7a] transition-colors w-full sm:w-auto"
              >
                <Edit2 className="w-5 h-5 mr-2" />
                Edit Profile
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <button
                  onClick={handleCancel}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors w-full sm:w-auto"
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center justify-center px-4 py-2 bg-primary-blue text-white rounded-lg font-semibold hover:bg-[#155a7a] transition-colors w-full sm:w-auto"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Save Changes
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Basic Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 lg:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Basic Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={basicData.name || ''}
                      onChange={(e) => setBasicData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{basicData.name || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min="18"
                      max="90"
                      value={basicData.age || ''}
                      onChange={(e) => setBasicData((prev) => ({ ...prev, age: parseInt(e.target.value) || null }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{basicData.age || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  {isEditing ? (
                    <select
                      value={basicData.gender || ''}
                      onChange={(e) => setBasicData((prev) => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    >
                      <option value="">Select gender</option>
                      {genders.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{basicData.gender || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={basicData.phone || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setBasicData((prev) => ({ ...prev, phone: value }))
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                      placeholder="9876543210"
                    />
                  ) : (
                    <p className="text-gray-900">{basicData.phone || 'Not set'}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Languages Spoken</label>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      {languages.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleLanguage(lang)}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
                            basicData.languages?.includes(lang)
                              ? 'bg-primary-blue text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base text-gray-900">
                      {basicData.languages?.length > 0 ? basicData.languages.join(', ') : 'Not set'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 lg:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Professional Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
                  {isEditing ? (
                    <select
                      value={professionalData.specialty || ''}
                      onChange={(e) => setProfessionalData((prev) => ({ ...prev, specialty: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    >
                      <option value="">Select specialty</option>
                      {specialties.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{professionalData.specialty || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={professionalData.yearsOfExperience || ''}
                      onChange={(e) => setProfessionalData((prev) => ({ ...prev, yearsOfExperience: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {professionalData.yearsOfExperience !== null && professionalData.yearsOfExperience !== undefined
                        ? `${professionalData.yearsOfExperience} years`
                        : 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year</label>
                  {isEditing ? (
                    <select
                      value={professionalData.recentGraduation || ''}
                      onChange={(e) => setProfessionalData((prev) => ({ ...prev, recentGraduation: parseInt(e.target.value) || null }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    >
                      <option value="">Select year</option>
                      {graduationYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{professionalData.recentGraduation || 'Not set'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Practice Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 lg:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Practice Details</h2>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  {isEditing ? (
                    <textarea
                      value={practiceData.address || ''}
                      onChange={(e) => setPracticeData((prev) => ({ ...prev, address: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{practiceData.address || 'Not set'}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={practiceData.city || ''}
                        onChange={(e) => setPracticeData((prev) => ({ ...prev, city: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{practiceData.city || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Locality</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={practiceData.locality || ''}
                        onChange={(e) => setPracticeData((prev) => ({ ...prev, locality: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{practiceData.locality || 'Not set'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available Days</label>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
                            practiceData.availableDays?.includes(day)
                              ? 'bg-primary-blue text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base text-gray-900">
                      {practiceData.availableDays?.length > 0
                        ? practiceData.availableDays.join(', ')
                        : 'Not set'}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                    {isEditing ? (
                      <input
                        type="time"
                        value={practiceData.timings?.from || ''}
                        onChange={(e) =>
                          setPracticeData((prev) => ({
                            ...prev,
                            timings: { ...prev.timings, from: e.target.value },
                          }))
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{practiceData.timings?.from || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                    {isEditing ? (
                      <input
                        type="time"
                        value={practiceData.timings?.to || ''}
                        onChange={(e) =>
                          setPracticeData((prev) => ({
                            ...prev,
                            timings: { ...prev.timings, to: e.target.value },
                          }))
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{practiceData.timings?.to || 'Not set'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
