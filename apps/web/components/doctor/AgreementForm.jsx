'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'
import { fetchProviderAgreement, acceptProviderAgreement } from '@/lib/doctorApi'
import { ApiError } from '@/lib/apiClient'
import AgreementText from './AgreementText'

// Read the full agreement, tick every statement, sign with your legal name, accept.
// Nothing can be ticked until the text has been scrolled to the end.
export default function AgreementForm({ alreadyAccepted = false, onAccepted, onContinue }) {
  const [agreement, setAgreement] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [checked, setChecked] = useState([])
  const [name, setName] = useState('')
  const [readToEnd, setReadToEnd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const boxRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    fetchProviderAgreement()
      .then((res) => {
        if (cancelled) return
        setAgreement(res.data)
        setChecked(res.data.attestations.map(() => false))
      })
      .catch(() => !cancelled && setLoadError('Could not load the agreement. Please refresh and try again.'))
    return () => { cancelled = true }
  }, [])

  const checkScroll = () => {
    const el = boxRef.current
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadToEnd(true)
  }
  useEffect(() => {
    // A short agreement (or a tall screen) never scrolls, so there is nothing more to read
    if (agreement) checkScroll()
  }, [agreement])

  if (loadError) return <p className="text-sm text-accent-red">{loadError}</p>
  if (!agreement) return <p className="text-sm text-gray-500">Loading agreement...</p>

  if (alreadyAccepted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
          <BadgeCheck className="w-5 h-5" />
          You have accepted the {agreement.title} (version {agreement.version}).
        </div>
        {onContinue && (
          <button type="button" onClick={onContinue} className="px-6 py-3 bg-primary-blue text-white rounded-lg font-semibold hover:bg-[#155a7a] transition-colors">
            Continue
          </button>
        )}
      </div>
    )
  }

  const allChecked = checked.length > 0 && checked.every(Boolean)
  const canAccept = readToEnd && allChecked && name.trim().length >= 2 && !submitting

  const submit = async () => {
    setError('')
    setSubmitting(true)
    try {
      await acceptProviderAgreement({
        version: agreement.version,
        contentHash: agreement.contentHash,
        attestations: checked,
        signatureName: name.trim(),
      })
      await onAccepted?.()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not record your acceptance. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{agreement.title}</h2>
        <p className="text-xs text-gray-500">
          Version {agreement.version} ·{' '}
          <Link href="/provider-agreement" target="_blank" className="underline hover:text-gray-700">Open in a new page</Link>
        </p>
      </div>

      <div
        ref={boxRef}
        onScroll={checkScroll}
        className="h-72 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-gray-50"
        tabIndex={0}
        aria-label="Provider agreement text"
      >
        <AgreementText content={agreement.content} />
      </div>
      {!readToEnd && <p className="text-xs text-amber-700">Scroll to the end of the agreement to continue.</p>}

      <fieldset disabled={!readToEnd} className={`space-y-3 border-0 p-0 m-0 min-w-0 ${readToEnd ? '' : 'opacity-50'}`}>
        {agreement.attestations.map((text, i) => (
          <label key={i} className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!!checked[i]}
              onChange={(e) => setChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />
            <span>{text}</span>
          </label>
        ))}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full legal name (electronic signature) *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            placeholder="Your full legal name"
          />
        </div>
      </fieldset>

      {error && <p className="text-sm text-accent-red">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canAccept}
        className="px-6 py-3 bg-primary-blue text-white rounded-lg font-semibold hover:bg-[#155a7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Saving...' : 'I accept the agreement'}
      </button>
    </div>
  )
}
