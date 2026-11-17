'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { useDoctorStore } from '@/store/useDoctorStore'
import { deleteDoctorAccount } from '@/lib/doctorApi'

/** Lets a doctor erase their account. Typing DELETE guards against a stray click. */
export default function DeleteAccountSection() {
  const router = useRouter()
  const logout = useDoctorStore((state) => state.logout)
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await deleteDoctorAccount()
      logout()
      router.push('/')
    } catch (e) {
      setError(e.message || 'Could not delete your account. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Delete account</h2>
      <p className="text-xs sm:text-sm text-gray-600">
        Permanently erases your profile, contact numbers, bank details, RCI documents, patient leads and AI chats, and removes you
        from the listing. This cannot be undone. Payment records are kept without your personal details for 7 years, as the law
        requires. You cannot delete your account while you have upcoming appointments.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 flex items-center justify-center px-4 py-2 border border-red-300 text-accent-red rounded-lg font-semibold hover:bg-red-50 transition-colors w-full sm:w-auto"
        >
          <Trash2 className="w-5 h-5 mr-2" />
          Delete my account
        </button>
      ) : (
        <div className="mt-4 space-y-3 max-w-sm">
          <label className="block text-sm text-gray-700">
            Type <strong>DELETE</strong> to confirm
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || deleting}
              className="flex-1 px-4 py-2 bg-accent-red text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete permanently'}
            </button>
            <button
              onClick={() => { setOpen(false); setConfirmText(''); setError('') }}
              disabled={deleting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
