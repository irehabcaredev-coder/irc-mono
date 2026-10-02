'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useDoctorStore } from '@/store/useDoctorStore'
import { getDoctorAppointments } from '@/lib/doctorApi'
import DashboardSidebar, { MobileMenuButton } from '@/components/doctor/DashboardSidebar'

import { Calendar, Clock, Video, User } from 'lucide-react'
import Link from 'next/link'

export default function AppointmentsPage() {
  const router = useRouter()
  const doctorAuth = useDoctorStore((state) => state.doctorAuth)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    if (!doctorAuth.isAuthed) {
      router.push('/auth')
    } else if (!doctorAuth.isOnboarded) {
      router.push('/onboarding')
    }
  }, [doctorAuth, router, isHydrated])

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['doctorAppointments', doctorAuth.doctorId],
    queryFn: async () => {
      const response = await getDoctorAppointments({ page: 1, limit: 100 }) // Fetch all for now
      // Normalize response
      if (Array.isArray(response)) return response
      if (response.data && Array.isArray(response.data)) return response.data
      return []
    },
    enabled: !!doctorAuth.doctorId,
  })

  // Helper to check if meeting is active (e.g. within 10 mins before start time or currently ongoing)
  // For now, simpler logic: just check if it's "today" or future
  const isMeetingJoinable = (startTime) => {
    // You can add logic here to only enable button X minutes before meeting
    return true
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
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


      <div className="lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 lg:pt-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
                <p className="text-sm sm:text-base text-gray-600">Manage your upcoming consultations</p>
              </div>
              {/* <button className="bg-primary-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-blue/90 transition-colors">
                    Add Availability
                </button> */}
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
                <p className="mt-4 text-gray-600">Loading appointments...</p>
              </div>
            ) : appointments.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {appointments.map((appointment) => {
                  // Determine status logic if needed (upcoming vs past)
                  const isPast = new Date(appointment.scheduledEnd) < new Date()

                  const isOngoing = !isPast && new Date(appointment.scheduledAt) <= new Date()
                  return (
                    <div key={appointment.id} className={`bg-white rounded-xl border ${isPast ? 'border-gray-200 bg-gray-50' : isOngoing ? 'border-green-200 shadow-sm' : 'border-gray-200 shadow-sm'} p-5 flex flex-col h-full`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOngoing ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-primary-blue'}`}>
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 line-clamp-1">{appointment.meetingName || 'Consultation'}</h3>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>{formatTime(appointment.scheduledAt)} - {formatTime(appointment.scheduledEnd)}</span>
                            </div>
                          </div>
                        </div>
                        {/* Status Badge */}
                        {isOngoing ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 animate-pulse">
                            Live Now
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${isPast ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                            {isPast ? 'Completed' : 'Upcoming'}
                          </span>
                        )}
                      </div>

                      <div className="border-t border-gray-100 pt-4 mt-auto">
                        <div className="flex items-center mb-4">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{appointment.patient?.name || 'Unknown Patient'}</p>
                            <p className="text-xs text-gray-500">{formatDate(appointment.scheduledAt)}</p>
                          </div>
                        </div>

                        {!isPast && (
                          <Link
                            href={`/meeting/${appointment.id}`}
                            className={`w-full flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-colors ${isOngoing
                              ? 'bg-green-500 hover:bg-green-600 text-white'
                              : 'bg-primary-blue hover:bg-blue-700 text-white'
                            }`}
                          >
                            <Video className="w-4 h-4" />
                            <span>{isOngoing ? 'Join Now' : 'Join Call'}</span>
                          </Link>
                        )}
                        {isPast && (
                          <button disabled className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-400 py-2 rounded-lg text-sm font-medium cursor-not-allowed">
                            <span>Ended</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No appointments found</h3>
                <p className="text-gray-500 mt-2">Scheduled meetings will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
