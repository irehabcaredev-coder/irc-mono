'use client'

import { useEffect, useState } from 'react'
import { usePatientStore } from '@/store/usePatientStore'
import { fetchPatientProfile, updateSharePreference } from '@/lib/patientApi'

/**
 * One-time question for patients who have never answered: may doctors whose profile they view see their details?
 * Both answers are recorded; nothing is shared unless they say yes.
 */
export default function ShareContactPrompt() {
  const isAuthed = usePatientStore((state) => state.isAuthed)
  const authModalOpen = usePatientStore((state) => state.authModalOpen)
  const patientId = usePatientStore((state) => state.patientProfile?.patientId)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthed || !patientId) return
    let cancelled = false
    fetchPatientProfile(patientId)
      .then((res) => {
        const p = res?.data
        if (!cancelled && p && p.onboardingStep === 'PERSONAL_INFO_COMPLETE' && p.shareContactWithDoctors == null) setOpen(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isAuthed, patientId])

  if (!open || authModalOpen) return null

  const answer = async (share) => {
    setSaving(true)
    setError('')
    try {
      await updateSharePreference(share)
      setOpen(false)
    } catch (e) {
      setError(e.message || 'Could not save your choice. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Share your details with doctors?</h2>
        <p className="mt-2 text-sm text-gray-600">
          When you view a doctor's profile, may they see your name, phone number and the health concerns you listed, so they can contact you?
        </p>
        <p className="mt-2 text-sm text-gray-600">
          If you say no, doctors only see that a patient viewed their profile. You can change this any time in Settings.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            onClick={() => answer(true)}
            disabled={saving}
            className="flex-1 rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Yes, share
          </button>
          <button
            onClick={() => answer(false)}
            disabled={saving}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            No, keep private
          </button>
        </div>
      </div>
    </div>
  )
}
