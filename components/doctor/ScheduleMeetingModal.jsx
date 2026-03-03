'use client'

import { useState } from 'react'
import { X, Calendar, Clock, Video } from 'lucide-react'
import { scheduleAppointment } from '@/lib/doctorApi'

export default function ScheduleMeetingModal({ isOpen, onClose, patientId, patientName }) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [meetingName, setMeetingName] = useState('Initial Consultation')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [meetingLink, setMeetingLink] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validate dates
      const start = new Date(scheduledAt)
      const end = new Date(scheduledEnd)

      if (start >= end) {
        throw new Error('End time must be after start time')
      }

      const response = await scheduleAppointment(
        patientId,
        start.toISOString(),
        end.toISOString(),
        meetingName
      )

      if (response && response.success) {
        setSuccess(true)
        // Store the meeting ID from the response to show the link
        const meetingId = response.data.id
        setMeetingLink(`${window.location.origin}/meeting/${meetingId}`)
      } else {
         setError(response?.message || 'Failed to schedule meeting')
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[200]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Schedule Meeting</h2>
            <p className="text-sm text-gray-600">with {patientName || 'Patient'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {success ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg">
             <div className="flex items-center justify-center mb-4">
                <p className="font-semibold">Meeting scheduled successfully!</p>
             </div>
             
             {meetingLink && (
                 <div className="mt-4">
                    <p className="text-sm text-green-800 mb-2 font-medium">Meeting Link:</p>
                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-green-200">
                        <code className="text-xs text-gray-600 flex-1 truncate">{meetingLink}</code>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(meetingLink)
                                alert('Link copied!')
                            }}
                            className="text-xs text-primary-blue hover:underline whitespace-nowrap px-2"
                        >
                            Copy
                        </button>
                    </div>
                 </div>
             )}
             
             <div className="mt-6 flex justify-end">
                <button 
                    onClick={() => {
                        onClose()
                        setSuccess(false)
                        setMeetingLink('')
                        setScheduledAt('')
                        setScheduledEnd('')
                        setMeetingName('Initial Consultation')
                    }}
                    className="text-sm text-green-700 hover:text-green-800 font-medium"
                >
                    Close
                </button>
             </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meeting Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={meetingName}
                onChange={(e) => setMeetingName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                 <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-blue text-white py-3 rounded-lg font-semibold hover:bg-primary-blue/90 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Scheduling...</span>
                  </>
              ) : (
                  <>
                    <Video className="w-5 h-5" />
                    <span>Schedule</span>
                  </>
              )}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
