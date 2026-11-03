'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Upload, Clock, XCircle } from 'lucide-react'
import { useDoctorStore } from '@/store/useDoctorStore'
import { fetchRciCardStatus, uploadRciCard } from '@/lib/doctorApi'
import { ApiError } from '@/lib/apiClient'

const ACCEPTED = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_BYTES = 5 * 1024 * 1024

// For doctors whose (older) RCI card is not in our register: upload a photo or PDF and an admin approves it.
// `expanded` opens the form straight away (e.g. after the number lookup failed); `onApproved` lets the parent
// refresh the profile once an admin has approved the card.
export default function RciCardUpload({ registrationNo = '', expanded = false, onApproved }) {
  const queryClient = useQueryClient()
  const doctorId = useDoctorStore((state) => state.doctorAuth.doctorId)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(expanded)
  const [replacing, setReplacing] = useState(false)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (expanded) setOpen(true)
  }, [expanded])

  const { data: submission } = useQuery({
    queryKey: ['rciCardStatus', doctorId],
    queryFn: fetchRciCardStatus,
    enabled: !!doctorId,
    // While a card is waiting for review, check back so the doctor can continue as soon as it is approved
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? 30000 : false),
  })

  useEffect(() => {
    if (submission?.status === 'APPROVED') onApproved?.()
  }, [submission?.status])

  // Revoke the preview's object URL when it changes or the component goes away
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pick = (candidate) => {
    setError('')
    if (!candidate) return
    if (!ACCEPTED.includes(candidate.type)) {
      setError('Upload a JPG, PNG or PDF file.')
      return
    }
    if (candidate.size > MAX_BYTES) {
      setError('The file is too large. The limit is 5 MB.')
      return
    }
    setFile(candidate)
  }

  const submit = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      await uploadRciCard(file, registrationNo)
      setFile(null)
      setReplacing(false)
      await queryClient.invalidateQueries({ queryKey: ['rciCardStatus', doctorId] })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not upload your card. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (submission?.status === 'PENDING' && !replacing) {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
        <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Your RCI card is under review</p>
          <p className="mt-1">We will verify it shortly and let you know by email. You can continue as soon as it is approved.</p>
          <button type="button" onClick={() => { setReplacing(true); setOpen(true) }} className="mt-2 underline">
            Upload a different card
          </button>
        </div>
      </div>
    )
  }

  if (!open && submission?.status !== 'REJECTED') {
    return (
      <p className="text-sm text-gray-600">
        Older RCI card that is not in our records?{' '}
        <button type="button" onClick={() => setOpen(true)} className="text-primary-blue font-medium hover:underline">
          Upload your card instead
        </button>
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {submission?.status === 'REJECTED' && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">We could not verify your previous upload</p>
            {submission.reviewNote && <p className="mt-1">{submission.reviewNote}</p>}
          </div>
        </div>
      )}

      <p className="text-sm text-gray-700">
        We could not match your number automatically. Upload a clear photo or scan of your RCI registration card and our team will verify it.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]) }}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragging ? 'border-primary-blue bg-primary-blue/5' : 'border-gray-300 bg-white'}`}
      >
        {file ? (
          <div className="flex flex-col items-center gap-2">
            {previewUrl ? (
              <img src={previewUrl} alt="RCI card preview" className="max-h-48 rounded border border-gray-200" />
            ) : (
              <FileText className="w-10 h-10 text-gray-400" />
            )}
            <p className="text-sm font-medium text-gray-900 break-all">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-600">
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm">Drag and drop your card here</p>
            <p className="text-xs text-gray-500">JPG, PNG or PDF, up to 5 MB</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-3 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {file ? 'Choose a different file' : 'Open file'}
        </button>
      </div>

      {error && <p className="text-sm text-accent-red">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!file || uploading}
        className="px-6 py-3 bg-primary-blue text-white rounded-lg font-semibold hover:bg-[#155a7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? 'Uploading...' : 'Submit for review'}
      </button>
    </div>
  )
}
