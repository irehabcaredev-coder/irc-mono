'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDoctorStore } from '@/store/useDoctorStore'

function GoogleOAuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setAuth = useDoctorStore((state) => state.setAuth)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract token and other data from URL query parameters
        // Backend might send: ?token=xxx&doctorId=xxx&email=xxx&onboardingStep=xxx
        // Or in hash: #token=xxx&doctorId=xxx&email=xxx&onboardingStep=xxx
        let token = searchParams.get('token')
        let doctorId = searchParams.get('doctorId')
        let email = searchParams.get('email')
        let onboardingStep = searchParams.get('onboardingStep') || null
        let errorParam = searchParams.get('error')

        // If not in query params, check hash fragment (some OAuth flows use hash)
        if (!token && typeof window !== 'undefined') {
          const hash = window.location.hash.substring(1) // Remove #
          const hashParams = new URLSearchParams(hash)
          token = hashParams.get('token') || token
          doctorId = hashParams.get('doctorId') || doctorId
          email = hashParams.get('email') || email
          onboardingStep = hashParams.get('onboardingStep') || onboardingStep
          errorParam = hashParams.get('error') || errorParam
        }

        // Check for error from backend
        if (errorParam) {
          setError(errorParam || 'Authentication failed')
          setTimeout(() => {
            router.push('/auth')
          }, 3000)
          return
        }

        // Validate required parameters
        if (!token || !doctorId || !email) {
          setError('Missing authentication data. Please try again.')
          setTimeout(() => {
            router.push('/auth')
          }, 3000)
          return
        }

        // Store token in localStorage FIRST (before Zustand update)
        if (typeof window !== 'undefined') {
          localStorage.setItem('doctor_token', token)
        }

        // Store auth in Zustand store
        // This will persist to localStorage via Zustand's persist middleware
        setAuth(email, 'google', doctorId, token, onboardingStep)

        // Small delay to ensure state is saved before navigation
        setTimeout(() => {
          // Redirect based on onboarding step
          if (onboardingStep === 'COMPLETE') {
            router.push('/dashboard')
          } else {
            router.push('/onboarding')
          }
        }, 100)
      } catch (err) {
        console.error('OAuth callback error:', err)
        setError('An error occurred during authentication. Please try again.')
        setTimeout(() => {
          router.push('/auth')
        }, 3000)
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [searchParams, router, setAuth])

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
          <p className="text-gray-600 text-sm">Redirecting to login page...</p>
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
