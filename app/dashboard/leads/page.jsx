'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useDoctorStore } from '@/store/useDoctorStore'
import { fetchLeadEvents } from '@/lib/doctorApi'
import DashboardSidebar, { MobileMenuButton } from '@/components/doctor/DashboardSidebar'
import FeedbackButton from '@/components/doctor/FeedbackButton'
import { Eye, Heart, MessageCircle, Phone } from 'lucide-react'

import ScheduleMeetingModal from '@/components/doctor/ScheduleMeetingModal'
import { Video } from 'lucide-react'

export default function LeadsPage() {
  const router = useRouter()
  const doctorAuth = useDoctorStore((state) => state.doctorAuth)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    // Only run auth checks after hydration
    if (!isHydrated) return
    
    if (!doctorAuth.isAuthed) {
      router.push('/auth')
    } else if (!doctorAuth.isOnboarded) {
      router.push('/onboarding')
    }
  }, [doctorAuth, router, isHydrated])

  const { 
    data: infiniteData, 
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['leadEventsInfinite', doctorAuth.doctorId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetchLeadEvents(doctorAuth.doctorId, { page: pageParam, limit: 10 })
      
      // Normalize response
      let events = []
      let total = 0
      
      if (Array.isArray(response)) {
          events = response
      } else if (response.data && Array.isArray(response.data)) {
          events = response.data
          total = response.count || 0
      } else if (response.data) {
           events = Array.isArray(response.data) ? response.data : []
      }
      
      return { events, total }
    },
    getNextPageParam: (lastPage, allPages) => {
        const loadedCount = allPages.flatMap(p => p.events).length
        if (lastPage.total && loadedCount < lastPage.total) {
            return allPages.length + 1
        }
        return lastPage.events.length === 10 ? allPages.length + 1 : undefined
    },
    enabled: !!doctorAuth.doctorId,
  })

  const apiLeadEvents = infiniteData?.pages.flatMap(page => page.events) || []

    // Transform API data to UI format
  const leadEvents = apiLeadEvents.map(event => ({
    eventId: event.id,
    type: event.type || 'Profile View', // Default to 'Profile View' if type is missing
    patientId: event.patientId,
    patientName: event.patient?.name,
    patientCity: event.patient?.city,
    createdAt: event.createdAt || event.viewedAt // Use createdAt or fallback to viewedAt
  }))

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
        return 'text-accent-red bg-accent-red/10'
      default:
        return 'text-primary-blue bg-primary-blue/10'
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleScheduleClick = (patientId, patientName) => {
    setSelectedPatient({ id: patientId, name: patientName })
    setScheduleModalOpen(true)
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

  if (!doctorAuth.isAuthed || !doctorAuth.isOnboarded) {
    return null
  }

  return (
    <div className="min-h-screen bg-paper relative">
      <MobileMenuButton onClick={() => setSidebarOpen(true)} isOpen={sidebarOpen} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <FeedbackButton />
      <div className="lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 lg:pt-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Leads</h1>
            <p className="text-sm sm:text-base text-gray-600">Track patient interest and engagement with your profile</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {isLoading ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
                <p className="mt-4 text-sm sm:text-base text-gray-600">Loading leads...</p>
              </div>
            ) : leadEvents.length > 0 ? (
              <>
                <div className="divide-y divide-gray-200">
                  {leadEvents.map((event) => {
                    const Icon = getEventIcon(event.type)
                  const colorClass = getEventColor(event.type)

                  return (
                    <div
                      key={event.eventId}
                      className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2 gap-2">
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{event.type}</h3>
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded w-fit">
                                {event.type === 'Profile View' && 'View'}
                                {event.type === 'Saved' && 'Interest'}
                                {event.type === 'Clicked WhatsApp' && 'Contact'}
                                {event.type === 'Clicked Call' && 'Contact'}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {event.patientName ? (
                                <>
                                  <p className="text-sm sm:text-base text-gray-900 font-medium truncate">
                                    {event.patientName}
                                  </p>
                                  {event.patientCity && (
                                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                                      {event.patientCity}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs sm:text-sm text-gray-600 italic">Anonymous visitor</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2">
                            <div className="text-left sm:text-right">
                              <p className="text-xs sm:text-sm font-medium text-gray-900">
                                {formatDate(event.createdAt)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {getTimeAgo(event.createdAt)}
                              </p>
                            </div>
                            
                            {/* Schedule Button - Only show if we have patient details */}
                            {event.patientId && event.patientName && (
                              <button
                                onClick={() => handleScheduleClick(event.patientId, event.patientName)}
                                className="inline-flex items-center px-3 py-1.5 border border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white rounded-md text-xs font-medium transition-colors"
                              >
                                <Video className="w-3 h-3 mr-1.5" />
                                Schedule
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
                  <div className="p-4 text-center border-t border-gray-200">
                    <InfiniteScrollTrigger 
                        hasNextPage={hasNextPage}
                        fetchNextPage={fetchNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                    />
                  </div>
              </>
            ) : (
              <div className="p-8 sm:p-12 text-center">
                <Eye className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No leads yet</h3>
                <p className="text-sm sm:text-base text-gray-600">
                  When patients view, save, or contact you, those interactions will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ScheduleMeetingModal 
        isOpen={scheduleModalOpen}
        onClose={() => {
            setScheduleModalOpen(false)
            setSelectedPatient(null)
        }}
        patientId={selectedPatient?.id}
        patientName={selectedPatient?.name}
      />
    </div>
  )
}

function getTimeAgo(date) {
  if (!date) return ''
  const now = new Date()
  const eventDate = new Date(date)
  const diff = now - eventDate
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
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
    <div ref={sentinelRef} className="py-2 text-center w-full">
      {isFetchingNextPage ? (
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-blue"></div>
      ) : (
        <div className="h-4" /> 
      )}
    </div>
  )
}
