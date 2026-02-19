'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useDoctorStore } from '@/store/useDoctorStore'
import { fetchDoctorProfile } from '@/lib/doctorApi'
import { transformApiProfileToUI } from '@/lib/dataTransformers'
// import { fetchLeadEvents } from '@/lib/doctorApi' // TODO: Uncomment when API endpoint is available
import DashboardSidebar, { MobileMenuButton } from '@/components/doctor/DashboardSidebar'
import FeedbackButton from '@/components/doctor/FeedbackButton'
import { Eye, Heart, MessageCircle, Phone, TrendingUp } from 'lucide-react'

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token')

  const doctorAuth = useDoctorStore((state) => state.doctorAuth)
  const setAuth = useDoctorStore((state) => state.setAuth)
  const doctorProfile = useDoctorStore((state) => state.doctorProfile)
  const setOnboarded = useDoctorStore((state) => state.setOnboarded)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

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

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Fetch doctor profile from API
  const { data: apiProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['doctorProfile', doctorAuth.doctorId],
    queryFn: () => fetchDoctorProfile(doctorAuth.doctorId),
    enabled: !!doctorAuth.doctorId && doctorAuth.isAuthed,
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

  // Handle URL token and Auth
  useEffect(() => {
    if (!isHydrated) return

    const handleAuth = () => {
      // 1. Check for token in URL
      if (tokenFromUrl) {
        localStorage.setItem('doctor_token', tokenFromUrl)

        const decoded = parseJwt(tokenFromUrl)
        if (decoded && decoded.email && decoded.doctorId) {
          // Update store with initial auth info so useQuery can run
          setAuth(decoded.email, 'google', decoded.doctorId, tokenFromUrl)
          return
        }
      }

      // 2. Regular auth check
      if (!doctorAuth.isAuthed) {
        // Double check localStorage
        const localToken = localStorage.getItem('doctor_token')
        if (localToken) {
          const decoded = parseJwt(localToken)
          if (decoded) {
            setAuth(decoded.email, 'email', decoded.doctorId, localToken)
            return
          }
        }
        router.push('/auth')
      } else if (doctorAuth.onboardingStep !== 'COMPLETE' && !doctorAuth.isOnboarded) {
        // If we have a token from URL, let the profile fetch (useQuery) determine the true step
        // instead of redirecting immediately based on potentially stale local state
        if (!tokenFromUrl) {
          router.push('/onboarding')
        }
      }
    }

    handleAuth()
  }, [isHydrated, tokenFromUrl, doctorAuth.isAuthed, doctorAuth.onboardingStep, router, setAuth])

  // TODO: Fetch lead events from API when endpoint is available
  // const { data: leadEvents = [] } = useQuery({
  //   queryKey: ['leadEvents', doctorAuth.doctorId],
  //   queryFn: () => fetchLeadEvents(doctorAuth.doctorId),
  //   enabled: !!doctorAuth.doctorId,
  // })
  const leadEvents = [] // Placeholder until API is available

  const recentEvents = leadEvents.slice(0, 5)

  const getEventIcon = (type) => {
    switch (type) {
      case 'Profile View':
        return Eye
      case 'Saved':
        return Heart
      case 'Clicked WhatsApp':
        return MessageCircle
      case 'Clicked Call':
        return Phone
      default:
        return Eye
    }
  }

  const getEventColor = (type) => {
    switch (type) {
      case 'Saved':
        return 'text-accent-red'
      default:
        return 'text-primary-blue'
    }
  }

  const calculateProfileCompleteness = () => {
    const fields = [
      doctorProfile.basic?.name,
      doctorProfile.basic?.age,
      doctorProfile.basic?.gender,
      doctorProfile.basic?.languages?.length > 0,
      doctorProfile.basic?.phone,
      doctorProfile.professional?.specialty,
      doctorProfile.professional?.yearsOfExperience,
      doctorProfile.professional?.recentGraduation,
      doctorProfile.practice?.address,
      doctorProfile.practice?.city,
      doctorProfile.practice?.availableDays?.length > 0,
      doctorProfile.practice?.timings?.from,
      doctorProfile.practice?.timings?.to,
    ]
    const filled = fields.filter(Boolean).length
    return Math.round((filled / fields.length) * 100)
  }

  const completeness = calculateProfileCompleteness()

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

  // Allow render if we have a token from URL to show something while syncing
  if ((!doctorAuth.isAuthed && !tokenFromUrl) || (doctorAuth.onboardingStep !== 'COMPLETE' && !doctorAuth.isOnboarded && !tokenFromUrl)) {
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
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper relative">
      <MobileMenuButton
        onClick={() => setSidebarOpen(true)}
        isOpen={sidebarOpen}
      />
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <FeedbackButton />
      <div className="lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 lg:pt-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Overview</h1>
            <p className="text-sm sm:text-base text-gray-600">Welcome back, {doctorProfile.basic?.name || 'Doctor'}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Profile Completeness Card */}
            <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Profile Completeness</h2>
                <span className="text-xl sm:text-2xl font-bold text-primary-blue">{completeness}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className="bg-primary-blue h-3 rounded-full transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <p className="text-xs sm:text-sm text-gray-600">
                {completeness < 100
                  ? 'Complete your profile to get more visibility and leads.'
                  : 'Your profile is complete! Keep it updated to maintain visibility.'}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm text-gray-600">Total Views</span>
                    <span className="text-base sm:text-lg font-bold text-gray-900">
                      {leadEvents.filter((e) => e.type === 'Profile View').length}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm text-gray-600">Saved</span>
                    <span className="text-base sm:text-lg font-bold text-gray-900">
                      {leadEvents.filter((e) => e.type === 'Saved').length}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm text-gray-600">Contact Clicks</span>
                    <span className="text-base sm:text-lg font-bold text-gray-900">
                      {leadEvents.filter((e) => e.type.includes('Clicked')).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Interest */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Interest</h2>
              <a
                href="/dashboard/leads"
                className="text-primary-blue hover:underline text-xs sm:text-sm font-medium"
              >
                View all
              </a>
            </div>
            {recentEvents.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {recentEvents.map((event) => {
                  const Icon = getEventIcon(event.type)
                  const colorClass = getEventColor(event.type)
                  const timeAgo = getTimeAgo(event.createdAt)

                  return (
                    <div
                      key={event.eventId}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-2 sm:gap-0"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 ${colorClass} bg-white rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm sm:text-base text-gray-900 truncate">{event.type}</div>
                          <div className="text-xs sm:text-sm text-gray-600 truncate">
                            {event.patientName ? (
                              <>
                                {event.patientName}
                                {event.patientCity && ` • ${event.patientCity}`}
                              </>
                            ) : (
                              'Anonymous visitor'
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 sm:ml-4">{timeAgo}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm sm:text-base">No activity yet. Your leads will appear here.</p>
              </div>
            )}
          </div>

          {/* More Features Coming Soon */}
          <div className="bg-gradient-to-r from-primary-blue/10 to-accent-red/10 rounded-xl p-4 sm:p-6 border border-primary-blue/20">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-blue rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">More features coming soon</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  We're working on adding appointment scheduling, patient messaging, analytics dashboard, and more. Stay tuned for updates!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardOverview() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

function getTimeAgo(date) {
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

