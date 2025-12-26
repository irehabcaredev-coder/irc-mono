'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useDoctorStore } from '@/store/useDoctorStore'
import { fetchLeadEvents } from '@/lib/mockDoctorData'
import DashboardSidebar from '@/components/doctor/DashboardSidebar'
import { Eye, Heart, MessageCircle, Phone } from 'lucide-react'

export default function LeadsPage() {
  const router = useRouter()
  const doctorAuth = useDoctorStore((state) => state.doctorAuth)

  useEffect(() => {
    if (!doctorAuth.isAuthed) {
      router.push('/auth')
    } else if (!doctorAuth.isOnboarded) {
      router.push('/onboarding')
    }
  }, [doctorAuth, router])

  const { data: leadEvents = [], isLoading } = useQuery({
    queryKey: ['leadEvents', doctorAuth.doctorId],
    queryFn: () => fetchLeadEvents(doctorAuth.doctorId),
    enabled: !!doctorAuth.doctorId,
  })

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

  if (!doctorAuth.isAuthed || !doctorAuth.isOnboarded) {
    return null
  }

  return (
    <div className="min-h-screen bg-paper">
      <DashboardSidebar />
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
            <p className="text-gray-600">Track patient interest and engagement with your profile</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
                <p className="mt-4 text-gray-600">Loading leads...</p>
              </div>
            ) : leadEvents.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {leadEvents.map((event) => {
                  const Icon = getEventIcon(event.type)
                  const colorClass = getEventColor(event.type)

                  return (
                    <div
                      key={event.eventId}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className={`w-12 h-12 ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{event.type}</h3>
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                                {event.type === 'Profile View' && 'View'}
                                {event.type === 'Saved' && 'Interest'}
                                {event.type === 'Clicked WhatsApp' && 'Contact'}
                                {event.type === 'Clicked Call' && 'Contact'}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {event.patientName ? (
                                <>
                                  <p className="text-gray-900 font-medium">
                                    {event.patientName}
                                  </p>
                                  {event.patientCity && (
                                    <p className="text-sm text-gray-600">
                                      {event.patientCity}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-gray-600 italic">Anonymous visitor</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(event.createdAt)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getTimeAgo(event.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads yet</h3>
                <p className="text-gray-600">
                  When patients view, save, or contact you, those interactions will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(date) {
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `${minutes} minutes ago`
  if (hours < 24) return `${hours} hours ago`
  return `${days} days ago`
}

