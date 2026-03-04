'use client'

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import Header from '@/components/patients/Header'
import Sidebar from '@/components/patients/Sidebar'
import AuthModal from '@/components/patients/AuthModal'
import DoctorProfile from '@/components/patients/DoctorProfile'
import DashboardOverview from '@/components/patients/DashboardOverview'
import ChatInterface from '@/components/patients/ChatInterface'
import DoctorCard from '@/components/patients/DoctorCard'
import { usePatientStore } from '@/store/usePatientStore'
import { fetchAllDoctors } from '@/lib/doctorApi'
import { transformApiDoctorToCard } from '@/lib/dataTransformers'
import { BRAND_NAME } from '@/lib/brand'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'

const languages = ['English', 'Hindi', 'Assamese', 'Bengali', 'Kannada', 'Marathi', 'Tamil', 'Telugu', 'Gujarati']

import { Suspense } from 'react'

function PatientsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token')
  const [isHydrated, setIsHydrated] = useState(false)

  const activeTab = usePatientStore((state) => state.activeTab)
  const searchQuery = usePatientStore((state) => state.searchQuery)
  const selectedConsultModes = usePatientStore((state) => state.selectedConsultModes)
  const selectedLanguage = usePatientStore((state) => state.selectedLanguage)
  const savedDoctorIds = usePatientStore((state) => state.savedDoctorIds)
  const setSearchQuery = usePatientStore((state) => state.setSearchQuery)
  const toggleConsultMode = usePatientStore((state) => state.toggleConsultMode)
  const setSelectedLanguage = usePatientStore((state) => state.setSelectedLanguage)
  const setAuthSuccess = usePatientStore((state) => state.setAuthSuccess)
  const isAuthed = usePatientStore((state) => state.isAuthed)
  const openAuthModal = usePatientStore((state) => state.openAuthModal)
  const setAuthStep = usePatientStore((state) => state.setAuthStep)
  const setTempPatientId = usePatientStore((state) => state.setTempPatientId)

  // Wait for hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // JWT Parser
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

  // Handle Auth
  useEffect(() => {
    if (!isHydrated) return

    if (tokenFromUrl) {
      localStorage.setItem('patient_token', tokenFromUrl)

      const decoded = parseJwt(tokenFromUrl)
      if (decoded && decoded.email) {
        const pId = decoded.patientId || decoded.id

        // Check user status flags from URL
        const isNewUser = searchParams.get('isNewUser') === 'true'
        const isReturningIncompleteUser = searchParams.get('isReturningIncompleteUser') === 'true'

        console.log('Google Auth Debug:', {
          isNewUser,
          isReturningIncompleteUser,
          pId,
          email: decoded.email,
          decoded
        })

        const onboardingStep = decoded.onboardingStep
        const isIncomplete = onboardingStep && onboardingStep !== 'COMPLETE'

        if ((isNewUser || isReturningIncompleteUser || isIncomplete) && pId) {
          console.log('Google Auth: Incomplete User Flow Triggered', { onboardingStep })

          // Mark as authenticated first so profile is available
          setAuthSuccess(decoded.email, {
            patientId: pId,
            name: decoded.name,
            email: decoded.email,
            onboardingStep: onboardingStep || 'PERSONAL_INFO_COMPLETE'
          })

          // Ensure modal opens even if setAuthSuccess closed it
          setTimeout(() => {
            openAuthModal('register')
            setTempPatientId(pId)
            setAuthStep(3)
          }, 100)
        } else if (pId) {
          console.log('Google Auth: Complete User Flow Triggered')
          setAuthSuccess(decoded.email, {
            patientId: pId,
            name: decoded.name,
            email: decoded.email,
            onboardingStep: 'COMPLETE'
          })
        } else {
          console.error('Google Auth: No pId found in token', decoded)
        }

        // Clear token from URL to clean up
        // Use timeout to ensure state updates propagate
        setTimeout(() => {
          router.replace('/patients')
        }, 500)
      }
    }
  }, [isHydrated, tokenFromUrl, searchParams, setAuthSuccess, router, openAuthModal, setAuthStep, setTempPatientId])

  // Map activeTab to specialty or saved filter
  const getSpecialtyFromTab = (tab) => {
    switch (tab) {
      case 'AUDIOLOGIST': return 'Audiologist'
      case 'SPEECH_THERAPIST': return 'Speech Therapist'
      case 'CHILD_SPEECH': return 'Child Speech' // Adjust if backend expects different value
      case 'ADULT_SPEECH': return 'Adult Speech' // Adjust if backend expects different value
      case 'HEARING_TEST': return 'Hearing Test'
      default: return undefined
    }
  }

  // Fetch all doctors from API with pagination AND filters
  const {
    data: infiniteData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['allDoctorsInfinite', activeTab, searchQuery, selectedConsultModes, selectedLanguage, savedDoctorIds],
    queryFn: async ({ pageParam = 1 }) => {
      const specialty = getSpecialtyFromTab(activeTab)
      const saved = activeTab === 'SAVED_DOCTORS' ? 'true' : undefined

      const response = await fetchAllDoctors({
        page: pageParam,
        limit: 10,
        search: searchQuery,
        specialty,
        mode: selectedConsultModes.length > 0 ? selectedConsultModes.join(',') : undefined,
        lang: selectedLanguage || undefined,
        saved
      })

      // Normalize response structure
      let docs = []
      let total = 0

      if (Array.isArray(response)) {
        docs = response
      } else if (response.data && Array.isArray(response.data)) {
        docs = response.data
        total = response.count || 0
      } else if (response.data) {
        // Maybe response.data IS the array (if apiGet returns body directly)
        docs = Array.isArray(response.data) ? response.data : []
      }

      return { doctors: docs, total }
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.flatMap(p => p.doctors).length
      if (lastPage.total && loadedCount < lastPage.total) {
        return allPages.length + 1
      }
      // Fallback: if we got a full page, try next.
      return lastPage.doctors.length === 10 ? allPages.length + 1 : undefined
    },
    enabled: activeTab !== 'APPOINTMENTS'
  })

  // Flatten the doctors from all pages (These are ALREADY filtered by backend)
  const allDoctorsRaw = infiniteData?.pages.flatMap(page => page.doctors) || []

  // Transform API doctors to card format
  const doctors = allDoctorsRaw.map(transformApiDoctorToCard).filter(Boolean)



  const renderContent = () => {
    if (activeTab === 'DASHBOARD' && isAuthed) {
      return <DashboardOverview />
    }

    if (activeTab === 'CHAT_AI' && isAuthed) {
      return <ChatInterface />
    }

    if (activeTab === 'APPOINTMENTS') {
      return (
        <PatientAppointments
          openAuthModal={openAuthModal}
          isAuthed={isAuthed}
        />
      )
    }

    // Default: Doctor Search/List View
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-sm shadow-sm min-h-[calc(100vh-8rem)] p-6 sm:p-8">
          {/* Hero Section */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
              Find the right audiologist or speech therapist near you.
            </h1>
            <p className="text-gray-600">
              Verified professionals for hearing, speech, and voice care.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            {/* Search Input */}
            <div>
              <input
                type="text"
                placeholder="Search by doctor name, clinic, or locality"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              />
            </div>

            {/* Consult Mode Filters */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600 mr-2 self-center">Consult mode:</span>
              {['CLINIC', 'HOME_VISIT', 'ONLINE'].map((mode) => {
                const isSelected = selectedConsultModes.includes(mode)
                return (
                  <button
                    key={mode}
                    onClick={() => toggleConsultMode(mode)}
                    className={`px-3 py-1 text-sm font-medium rounded-full transition-colors relative ${isSelected
                      ? 'bg-primary-blue text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {mode === 'CLINIC' ? 'Clinic' : mode === 'HOME_VISIT' ? 'Home Visit' : 'Online'}
                    {isSelected && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent-red rounded-full"></span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Language Filter */}
            <div>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              >
                <option value="">All Languages</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Doctor List */}
          <div className="mb-8">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-gray-100 border border-gray-200 rounded-md p-5 animate-pulse"
                  >
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : doctors.length > 0 ? (
              <div className="space-y-4">
                {doctors.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}

                {/* Infinite Scroll Trigger */}
                <InfiniteScrollTrigger
                  hasNextPage={hasNextPage && !searchQuery && selectedConsultModes.length === 0 && !selectedLanguage}
                  fetchNextPage={fetchNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">No doctors found matching your criteria.</p>
                <InfiniteScrollTrigger
                  hasNextPage={hasNextPage && !searchQuery && selectedConsultModes.length === 0 && !selectedLanguage}
                  fetchNextPage={fetchNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                />
              </div>
            )}
          </div>

          <div className="mb-8 pt-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How it works</h2>
            <ol className="space-y-3 list-decimal list-inside text-gray-700">
              <li>Search specialist by name, clinic, or location</li>
              <li>View profile and qualifications</li>
              <li>Call or WhatsApp to consult</li>
            </ol>
          </div>

          {/* Footer Note */}
          <div className="pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {BRAND_NAME} does not provide medical advice. Please consult a licensed professional.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <Sidebar />
      <AuthModal />
      <DoctorProfile />

      {/* Main Content Area */}
      <main className="lg:pl-64 pt-16">
        {renderContent()}
      </main>
    </div>
  )
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper flex items-center justify-center">Loading...</div>}>
      <PatientsContent />
    </Suspense>
  )
}


function PatientAppointments({ isAuthed, openAuthModal }) {
  const router = useRouter()
  // Import dynamically inside component or use a hook to avoid circular dependency issues if any
  // But standard import is fine. We need to import API function.

  const {
    data: appointmentsData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['patientAppointments'],
    queryFn: async () => {
      const { getPatientAppointments } = await import('@/lib/patientApi')
      return getPatientAppointments({ page: 1, limit: 50 }) // Fetch up to 50 for now
    },
    enabled: !!isAuthed,
    retry: false
  })

  if (!isAuthed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-200 rounded-lg text-center">
        <div className="bg-blue-50 p-4 rounded-full mb-4">
          <svg className="w-8 h-8 text-primary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Login to view appointments</h3>
        <p className="text-gray-500 mb-6 max-w-sm">
          Please login or register to manage your scheduled video consultations and follow-ups.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-2 bg-primary-blue text-white font-medium rounded-full hover:bg-blue-700 transition-colors"
        >
          Login / Register
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 w-1/4 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 w-1/2 rounded mb-2"></div>
          </div>
        ))}
      </div>
    )
  }

  const appointments = appointmentsData?.data || []

  if (appointments.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
        <div className="bg-gray-50 p-4 rounded-full w-fit mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">No appointments scheduled</h3>
        <p className="text-gray-500 mt-2">Find a specialist to book your first consultation.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {appointments.map((apt) => {
          const isUpcoming = new Date(apt.scheduledAt) > new Date()
          const doctorName = apt.doctor?.name || 'Doctor'
          const date = new Date(apt.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
          const time = new Date(apt.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

          return (
            <div key={apt.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{apt.meetingName || 'Consultation'}</h4>
                  <p className="text-sm text-gray-600 mt-1">with Dr. {doctorName}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${isUpcoming ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {isUpcoming ? 'Upcoming' : 'Completed'}
                </span>
              </div>

              <div className="flex items-center text-sm text-gray-500 mb-6 space-x-4">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {date}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {time}
                </div>
              </div>

              {isUpcoming ? (
                <button
                  onClick={() => router.push(`/meeting/${apt.id}`)}
                  className="w-full flex items-center justify-center px-4 py-2.5 bg-primary-blue text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Join Video Call
                </button>
              ) : (
                <button disabled className="w-full px-4 py-2.5 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed">
                  Meeting Ended
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InfiniteScrollTrigger({ hasNextPage, fetchNextPage, isFetchingNextPage }) {
  const sentinelRef = useRef(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(sentinel)

    return () => {
      if (sentinel) observer.unobserve(sentinel)
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (!hasNextPage) return null

  return (
    <div ref={sentinelRef} className="py-8 text-center w-full">
      {isFetchingNextPage ? (
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-blue"></div>
      ) : (
        <div className="h-4" /> // Spacer for triggering
      )}
    </div>
  )
}
