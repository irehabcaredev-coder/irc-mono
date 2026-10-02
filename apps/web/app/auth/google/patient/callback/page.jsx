'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePatientStore } from '@/store/usePatientStore'

function GoogleOAuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setAuthSuccess = usePatientStore((state) => state.setAuthSuccess)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract token and other data from URL query parameters
        // Backend might send: ?token=xxx&patientId=xxx&email=xxx&onboardingStep=xxx
        // Or in hash: #token=xxx&patientId=xxx&email=xxx&onboardingStep=xxx
        let token = searchParams.get('token')
        let patientId = searchParams.get('patientId')
        let email = searchParams.get('email')
        let name = searchParams.get('name') || null
        let onboardingStep = searchParams.get('onboardingStep') || null
        let errorParam = searchParams.get('error')

        // If not in query params, check hash fragment (some OAuth flows use hash)
        if (!token && typeof window !== 'undefined') {
          const hash = window.location.hash.substring(1) // Remove #
          const hashParams = new URLSearchParams(hash)
          token = hashParams.get('token') || token
          patientId = hashParams.get('patientId') || patientId
          email = hashParams.get('email') || email
          name = hashParams.get('name') || name
          onboardingStep = hashParams.get('onboardingStep') || onboardingStep
          errorParam = hashParams.get('error') || errorParam
        }

        // Check for error from backend
        if (errorParam) {
          setError(errorParam || 'Authentication failed')
          setTimeout(() => {
            router.push('/patients')
          }, 3000)
          return
        }

        // Validate required parameters
        if (!token || !patientId || !email) {
          setError('Missing authentication data. Please try again.')
          setTimeout(() => {
            router.push('/patients')
          }, 3000)
          return
        }

        // Store token in localStorage FIRST (before Zustand update)
        if (typeof window !== 'undefined') {
          localStorage.setItem('patient_token', token)
        }

        // Create profile object
        const profile = {
          patientId,
          email,
          name: name || email.split('@')[0], // Use name from backend or fallback to email prefix
          onboardingStep,
        }

        // Store auth in Zustand store
        // This will persist to localStorage via Zustand's persist middleware
        setAuthSuccess(email, profile)

        // Small delay to ensure state is saved before navigation
        setTimeout(() => {
          // Redirect to patients page (main patient interface)
          router.push('/patients')
        }, 100)
      } catch (err) {
        console.error('OAuth callback error:', err)
        setError('An error occurred during authentication. Please try again.')
        setTimeout(() => {
          router.push('/patients')
        }, 3000)
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [searchParams, router, setAuthSuccess])

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
          <p className="text-gray-600 text-sm">Redirecting to home page...</p>
        </div>
      </div>
    )
  }

  return null
}

export default function GoogleOAuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mb-4"></div>
            <p className="text-gray-600">Completing authentication...</p>
          </div>
        </div>
      }
    >
      <GoogleOAuthCallbackInner />
    </Suspense>
  )
}
