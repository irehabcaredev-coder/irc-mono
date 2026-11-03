'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, LogOut } from 'lucide-react'
import {
  fetchRciSubmissions,
  fetchRciSubmissionFile,
  approveRciSubmission,
  rejectRciSubmission,
  ApiError,
} from '@/lib/adminApi'

const TABS = [
  { status: 'PENDING', label: 'Pending' },
  { status: 'APPROVED', label: 'Approved' },
  { status: 'REJECTED', label: 'Rejected' },
]

// The card is fetched with the admin token (an <img> tag cannot send it) and shown from a blob URL
function CardPreview({ submission }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let revoked = false
    let objectUrl = null
    fetchRciSubmissionFile(submission.id)
      .then((blob) => {
        if (revoked) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => !revoked && setFailed(true))
    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [submission.id])

  if (failed) return <p className="text-sm text-accent-red">Could not load the card.</p>
  if (!url) return <p className="text-sm text-gray-500">Loading card...</p>
  return submission.mimeType === 'application/pdf' ? (
    <iframe src={url} title="RCI card" className="w-full h-96 border border-gray-200 rounded" />
  ) : (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="RCI card" className="max-h-96 rounded border border-gray-200" />
    </a>
  )
}

function SubmissionCard({ submission, onChanged }) {
  const { doctor } = submission
  const [showCard, setShowCard] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (action) => {
    setBusy(true)
    setError('')
    try {
      await action()
      await onChanged()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">{doctor.name || 'Name not provided yet'}</h3>
          <p className="text-sm text-gray-600 break-all">{doctor.email}</p>
          <p className="text-sm text-gray-600">
            {[doctor.contactNumber, doctor.city, doctor.specialty].filter(Boolean).join(' · ') || 'No other details yet'}
          </p>
          <p className="mt-2 text-sm text-gray-900">
            Number entered: <span className="font-mono">{submission.registrationNo || 'none'}</span>
          </p>
        </div>
        <div className="text-sm text-gray-500 sm:text-right">
          <p>Uploaded {new Date(submission.createdAt).toLocaleString()}</p>
          {submission.reviewedAt && (
            <p>
              {submission.status === 'APPROVED' ? 'Approved' : 'Rejected'} {new Date(submission.reviewedAt).toLocaleString()} by {submission.reviewedBy}
            </p>
          )}
        </div>
      </div>

      {submission.reviewNote && <p className="mt-3 text-sm text-gray-700">Reason: {submission.reviewNote}</p>}

      <div className="mt-4">
        <button type="button" onClick={() => setShowCard((v) => !v)} className="text-sm text-primary-blue font-medium hover:underline">
          {showCard ? 'Hide card' : 'View card'}
        </button>
        {showCard && <div className="mt-3"><CardPreview submission={submission} /></div>}
      </div>

      {error && <p className="mt-3 text-sm text-accent-red">{error}</p>}

      {submission.status === 'PENDING' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {rejecting ? (
            <div className="space-y-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Reason shown to the doctor, e.g. the photo is blurry"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={busy || !note.trim()}
                  onClick={() => run(() => rejectRciSubmission(submission.id, note))}
                  className="px-4 py-2 bg-accent-red text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  Confirm reject
                </button>
                <button type="button" disabled={busy} onClick={() => setRejecting(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => approveRciSubmission(submission.id))}
                className="inline-flex items-center px-4 py-2 bg-primary-blue text-white rounded-lg text-sm font-semibold hover:bg-[#155a7a] disabled:opacity-50"
              >
                <BadgeCheck className="w-4 h-4 mr-1.5" />
                {busy ? 'Approving...' : 'Approve'}
              </button>
              <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="px-4 py-2 border border-red-300 text-accent-red rounded-lg text-sm font-semibold hover:bg-red-50">
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('PENDING')

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) router.replace('/admin/login')
    else setReady(true)
  }, [router])

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminRciSubmissions', status],
    queryFn: () => fetchRciSubmissions(status),
    enabled: ready,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['adminRciSubmissions'] })

  const signOut = () => {
    localStorage.removeItem('admin_token')
    router.replace('/admin/login')
  }

  if (!ready) return null

  const submissions = data?.data || []

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">RCI card review</h1>
            <p className="text-sm text-gray-600">Doctors whose registration was not found and who uploaded their card</p>
          </div>
          <button type="button" onClick={signOut} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <LogOut className="w-4 h-4 mr-1.5" />
            Sign out
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.status}
              type="button"
              onClick={() => setStatus(tab.status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${status === tab.status ? 'bg-primary-blue text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-gray-600">Loading...</p>
        ) : error ? (
          <p className="text-accent-red">{error instanceof ApiError ? error.message : 'Could not load submissions.'}</p>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">Nothing here.</div>
        ) : (
          <div className="space-y-4">
            {submissions.map((s) => (
              <SubmissionCard key={s.id} submission={s} onChanged={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
