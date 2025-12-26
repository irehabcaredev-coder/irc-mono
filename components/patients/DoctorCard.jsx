'use client'

import { Phone, MessageCircle, User, Bookmark, BookmarkCheck } from 'lucide-react'
import { usePatientStore } from '@/store/usePatientStore'

export default function DoctorCard({ doctor }) {
  const savedDoctorIds = usePatientStore((state) => state.savedDoctorIds)
  const toggleSavedDoctor = usePatientStore((state) => state.toggleSavedDoctor)
  const addIntentEvent = usePatientStore((state) => state.addIntentEvent)
  const isAuthed = usePatientStore((state) => state.isAuthed)
  const openAuthModal = usePatientStore((state) => state.openAuthModal)
  const openProfileDrawer = usePatientStore((state) => state.openProfileDrawer)
  const addViewedDoctor = usePatientStore((state) => state.addViewedDoctor)

  const isSaved = savedDoctorIds.includes(doctor.id)

  const handleCall = () => {
    addIntentEvent({ type: 'CALL', doctorId: doctor.id, doctorName: doctor.name })
    if (!isAuthed) {
      openAuthModal('login', { type: 'CALL', doctorId: doctor.id })
      return
    }
    addViewedDoctor(doctor.id)
    window.location.href = `tel:${doctor.phone}`
  }

  const handleWhatsApp = () => {
    addIntentEvent({ type: 'WHATSAPP', doctorId: doctor.id, doctorName: doctor.name })
    if (!isAuthed) {
      openAuthModal('login', { type: 'WHATSAPP', doctorId: doctor.id })
      return
    }
    addViewedDoctor(doctor.id)
    window.open(`https://wa.me/${doctor.whatsapp.replace(/[^0-9]/g, '')}`, '_blank')
  }

  const handleViewProfile = () => {
    addIntentEvent({ type: 'VIEW_PROFILE', doctorId: doctor.id, doctorName: doctor.name })
    if (!isAuthed) {
      openAuthModal('login', { type: 'PROFILE', doctorId: doctor.id })
      return
    }
    addViewedDoctor(doctor.id)
    openProfileDrawer(doctor.id)
  }

  const handleSave = () => {
    if (!isAuthed) {
      openAuthModal('login', { type: 'SAVE', doctorId: doctor.id })
      return
    }
    toggleSavedDoctor(doctor.id)
    addIntentEvent({
      type: isSaved ? 'UNSAVE_DOCTOR' : 'SAVE_DOCTOR',
      doctorId: doctor.id,
      doctorName: doctor.name,
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md p-5 hover:shadow-sm transition-shadow relative">
      {/* Bookmark Icon - Top Right */}
      <button
        onClick={handleSave}
        className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-gray-50 transition-colors"
        aria-label={isSaved ? 'Unsave doctor' : 'Save doctor'}
        title={isSaved ? 'Saved' : 'Save doctor'}
      >
        {isSaved ? (
          <BookmarkCheck className="w-5 h-5 fill-accent-red text-accent-red" />
        ) : (
          <Bookmark className="w-5 h-5 text-gray-400 hover:text-accent-red" />
        )}
      </button>

      <div className="flex items-start justify-between mb-3 pr-8">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{doctor.name}</h3>
          <p className="text-sm text-gray-600 mb-1">
            {doctor.specialty === 'BOTH'
              ? 'Audiologist & Speech Therapist'
              : doctor.specialty === 'AUDIOLOGIST'
              ? 'Audiologist'
              : 'Speech Therapist'}
            , {doctor.qualification}
          </p>
          <p className="text-sm text-gray-700 font-medium">{doctor.clinic}</p>
          <p className="text-sm text-gray-600">
            {doctor.locality}, {doctor.city}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-primary-blue rounded">
            {doctor.experienceYears}+ yrs
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {doctor.languages.map((lang) => (
          <span
            key={lang}
            className="px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded"
          >
            {lang}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {doctor.consultModes.map((mode) => (
          <span
            key={mode}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
          >
            {mode === 'CLINIC' ? 'Clinic' : mode === 'HOME_VISIT' ? 'Home Visit' : 'Online'}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleCall}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-blue text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Phone className="w-4 h-4" />
          Call
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-green-600 text-green-600 text-sm font-medium rounded-md hover:bg-green-50 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </button>
        <button
          onClick={handleViewProfile}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
        >
          <User className="w-4 h-4" />
          Profile
        </button>
      </div>
    </div>
  )
}

