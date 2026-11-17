'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDoctorStore } from '@/store/useDoctorStore'
import { fetchDoctorProfile, acceptContactConsent } from '@/lib/doctorApi'

/**
 * For doctors who registered before consent was asked: their phone / WhatsApp numbers are shown on their public
 * profile, and this asks them to confirm that. Closing it does nothing (the profile stays as it is); it shows again
 * on the next sign-in until they accept.
 */
export default function ContactConsentPrompt() {
  const doctorAuth = useDoctorStore((state) => state.doctorAuth)
  const queryClient = useQueryClient()
  const [dismissed, setDismissed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data } = useQuery({
    queryKey: ['doctorProfile', doctorAuth.doctorId],
    queryFn: () => fetchDoctorProfile(doctorAuth.doctorId),
    enabled: !!doctorAuth.doctorId && doctorAuth.isAuthed,
  })

  const profile = data?.data
  if (dismissed || !profile || profile.onboardingStep !== 'COMPLETE' || profile.contactConsentAt) return null

  const accept = async () => {
    setSaving(true)
    setError('')
    try {
      await acceptContactConsent()
      await queryClient.invalidateQueries({ queryKey: ['doctorProfile', doctorAuth.doctorId] })
    } catch (e) {
      setError(e.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Confirm your public contact details</h2>
        <p className="mt-2 text-sm text-gray-600">
          Your phone / WhatsApp number is shown on your public iRehabCare profile so patients can contact you.
          Please confirm you agree. You can ask us to remove it at any time.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            onClick={accept}
            disabled={saving}
            className="flex-1 rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'I agree'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            disabled={saving}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
