'use client'

import { useEffect } from 'react'
import { X, Phone, MessageCircle } from 'lucide-react'
import { usePatientStore } from '@/store/usePatientStore'
import { mockDoctors } from '@/lib/mockData'

export default function DoctorProfile() {
  const { profileDrawerOpen, selectedDoctorId, closeProfileDrawer, isAuthed, openAuthModal, addViewedDoctor } =
    usePatientStore()

  useEffect(() => {
    if (profileDrawerOpen && selectedDoctorId && isAuthed) {
      addViewedDoctor(selectedDoctorId)
    }
  }, [profileDrawerOpen, selectedDoctorId, isAuthed, addViewedDoctor])

  if (!profileDrawerOpen || !selectedDoctorId) return null

  const doctor = mockDoctors.find((d) => d.id === selectedDoctorId)
  if (!doctor) return null

  const handleCall = () => {
    if (!isAuthed) {
      openAuthModal('login', { type: 'CALL', doctorId: doctor.id })
      return
    }
    window.location.href = `tel:${doctor.phone}`
  }

  const handleWhatsApp = () => {
    if (!isAuthed) {
      openAuthModal('login', { type: 'WHATSAPP', doctorId: doctor.id })
      return
    }
    window.open(`https://wa.me/${doctor.whatsapp.replace(/[^0-9]/g, '')}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="bg-white border border-gray-200 rounded-sm shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Doctor Profile</h2>
          <button
            onClick={closeProfileDrawer}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">{doctor.name}</h3>
            <p className="text-sm text-gray-600 mb-1">
              {doctor.specialty === 'BOTH'
                ? 'Audiologist & Speech Therapist'
                : doctor.specialty === 'AUDIOLOGIST'
                ? 'Audiologist'
                : 'Speech Therapist'}
              , {doctor.qualification}
            </p>
            <p className="text-sm font-medium text-gray-700">{doctor.clinic}</p>
            <p className="text-sm text-gray-600">
              {doctor.locality}, {doctor.city}
            </p>
          </div>

          {/* Experience */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Experience</h4>
            <p className="text-sm text-gray-700">{doctor.experienceYears}+ years</p>
          </div>

          {/* Languages */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Languages</h4>
            <div className="flex flex-wrap gap-2">
              {doctor.languages.map((lang) => (
                <span
                  key={lang}
                  className="px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>

          {/* Consult Modes */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Consultation Modes</h4>
            <div className="flex flex-wrap gap-2">
              {doctor.consultModes.map((mode) => (
                <span
                  key={mode}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {mode === 'CLINIC' ? 'Clinic' : mode === 'HOME_VISIT' ? 'Home Visit' : 'Online'}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCall}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-blue text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-green-600 text-green-600 text-sm font-medium rounded-md hover:bg-green-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

