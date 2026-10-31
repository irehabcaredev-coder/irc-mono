'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, ShieldAlert } from 'lucide-react'
import { useDoctorStore } from '@/store/useDoctorStore'
import { fetchDoctorProfile, verifyRciRegistration } from '@/lib/doctorApi'
import { ApiError } from '@/lib/apiClient'
import AgreementForm from './AgreementForm'

function timeLeft(deadline) {
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return null
  const hours = Math.floor(ms / 36e5)
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ${hours % 24}h`
  }
  return hours >= 1 ? `${hours}h ${Math.floor((ms % 36e5) / 6e4)}m` : `${Math.max(1, Math.floor(ms / 6e4))} min`
}

function RciForm({ onVerified }) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!value.trim()) {
      setError('Enter your RCI registration number')
      return
    }
    setError('')
    setLoading(true)
    try {
      await verifyRciRegistration(value)
      await onVerified()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not verify your RCI number. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          disabled={loading}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent uppercase bg-white"
          placeholder="RCI registration number, e.g. A12345"
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="px-6 py-3 bg-primary-blue text-white rounded-lg font-semibold hover:bg-[#155a7a] transition-colors disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-accent-red">{error}</p>}
    </div>
  )
}

// Doctors who onboarded before RCI verification and the provider agreement existed: a banner during their grace
// period, a blocking screen once it has passed. Names stay hidden from patients until they verify their RCI number.
export default function RciGate({ children }) {
  const queryClient = useQueryClient()
  const doctorAuth = useDoctorStore((state) => state.doctorAuth)
  const logout = useDoctorStore((state) => state.logout)

  const { data } = useQuery({
    queryKey: ['doctorProfile', doctorAuth.doctorId],
    queryFn: () => fetchDoctorProfile(doctorAuth.doctorId),
    enabled: !!doctorAuth.doctorId && doctorAuth.isAuthed,
  })

  const doctor = data?.data
  const missingRci = !doctor?.rciRegistrationId
  const missingAgreement = doctor?.agreementAccepted === false
  const needsAction = doctor && doctor.onboardingStep === 'COMPLETE' && (missingRci || missingAgreement)
  if (!needsAction) return children

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['doctorProfile', doctorAuth.doctorId] })
  const remaining = doctor.complianceDeadline ? timeLeft(doctor.complianceDeadline) : null
  const todo = [missingRci && 'add your RCI registration number', missingAgreement && 'read and accept the provider agreement'].filter(Boolean).join(' and ')

  // RCI first; the agreement follows once that is done
  const form = missingRci ? <RciForm onVerified={refresh} /> : <AgreementForm onAccepted={refresh} />

  if (!remaining && doctor.complianceDeadline) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-10">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-3">
            <ShieldAlert className="w-7 h-7 text-accent-red" />
            <h1 className="text-xl font-bold text-gray-900">Action required to continue</h1>
          </div>
          <p className="text-gray-600 mb-6">
            The time to {todo} has passed. Complete {missingRci && missingAgreement ? 'both' : 'it'} to get back into your
            dashboard. Until your RCI number is verified your name stays hidden from patients.
          </p>
          {form}
          <button type="button" onClick={logout} className="mt-6 text-sm text-gray-500 hover:text-gray-700 underline">
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start gap-3 mb-3">
            <BadgeCheck className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900">
              <span className="font-semibold">Please {todo}{remaining ? ` within ${remaining}` : ''}.</span>{' '}
              Both are now required for every doctor. {missingRci ? 'Until you add your RCI number your name is hidden from patients, and ' : ''}
              your dashboard locks when the time runs out.
            </p>
          </div>
          {form}
        </div>
      </div>
      {children}
    </>
  )
}
