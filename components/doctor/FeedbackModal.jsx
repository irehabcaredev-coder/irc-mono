'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { useDoctorStore } from '@/store/useDoctorStore'
import { submitDoctorFeedback } from '@/lib/feedbackApi'
import { getDoctorScreenName } from '@/lib/screenName'
import { MessageSquare, AlertCircle, CheckCircle, X } from 'lucide-react'

export default function FeedbackModal({ isOpen, onClose }) {
  const pathname = usePathname()
  const doctorProfile = useDoctorStore((state) => state.doctorProfile)
  
  // Form state
  const [name, setName] = useState('')
  const [feedback, setFeedback] = useState('')
  const [validationError, setValidationError] = useState('')

  // Auto-detect screen name from current pathname
  const screenName = getDoctorScreenName({ pathname })

  // Auto-fill name from doctor profile when modal opens
  useEffect(() => {
    if (isOpen && doctorProfile?.basic?.name) {
      setName(doctorProfile.basic.name)
    }
  }, [isOpen, doctorProfile])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset after a short delay to allow close animation
      setTimeout(() => {
        setFeedback('')
        setValidationError('')
      }, 300)
    }
  }, [isOpen])

  // Mutation with retry logic
  const mutation = useMutation({
    mutationFn: async ({ name, screen, feedback }) => {
      // First attempt
      try {
        return await submitDoctorFeedback({ name, screen, feedback })
      } catch (error) {
        // Only retry on transient failures (network errors or 5xx server errors)
        const isTransientError = 
          error.message?.includes('Network error') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('HTTP error! status: 5')
        
        if (isTransientError) {
          // Wait ~800ms before retry
          await new Promise(resolve => setTimeout(resolve, 800))
          // Retry once
          return await submitDoctorFeedback({ name, screen, feedback })
        }
        // Re-throw non-transient errors
        throw error
      }
    },
    onSuccess: () => {
      // Clear only feedback textarea, keep name
      setFeedback('')
      setValidationError('')
    },
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setValidationError('')

    // Client-side validation
    if (!name || !name.trim()) {
      setValidationError('Name is required')
      return
    }

    if (!feedback || feedback.trim().length < 10) {
      setValidationError('Feedback must be at least 10 characters')
      return
    }

    if (feedback.length > 1500) {
      setValidationError('Feedback must not exceed 1500 characters')
      return
    }

    // Note: Webhook URL is configured server-side only (not exposed to client)
    // The API route will handle the configuration check

    // Submit feedback with auto-detected screen name
    mutation.mutate({ 
      name: name.trim(), 
      screen: screenName,
      feedback: feedback.trim() 
    })
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[200] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[201] w-[calc(100vw-2rem)] sm:w-full sm:max-w-md bg-white rounded-xl shadow-2xl transform transition-all duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-primary-blue rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Send Feedback</h2>
              <p className="text-xs text-white/80">Help us improve iRehabCare</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Success Message */}
          {mutation.isSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">Thank you for your feedback.</p>
            </div>
          )}

          {/* Error Message */}
          {(mutation.isError || validationError) && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                {validationError || mutation.error?.message || 'Something went wrong. Please try again.'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="feedback-name" className="block text-sm font-medium text-gray-900 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="feedback-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={mutation.isPending}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="Your name"
                required
              />
            </div>

            {/* Feedback Field */}
            <div>
              <label htmlFor="feedback-text" className="block text-sm font-medium text-gray-900 mb-2">
                Feedback <span className="text-red-500">*</span>
              </label>
              <textarea
                id="feedback-text"
                value={feedback}
                onChange={(e) => {
                  setFeedback(e.target.value)
                  setValidationError('')
                }}
                disabled={mutation.isPending}
                rows={6}
                minLength={10}
                maxLength={1500}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-colors resize-y disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="Share your thoughts, suggestions, or report any issues..."
                required
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Minimum 10 characters required
                </p>
                <p className={`text-xs ${
                  feedback.length > 1500 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {feedback.length} / 1500
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={mutation.isPending || !name.trim() || feedback.trim().length < 10}
              className="w-full px-4 py-3 bg-primary-blue text-white font-semibold rounded-lg hover:bg-primary-blue/90 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {mutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
