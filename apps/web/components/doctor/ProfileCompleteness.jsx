'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDoctorStore } from '@/store/useDoctorStore'
import { fetchDoctorProfile } from '@/lib/doctorApi'
import { transformApiProfileToUI } from '@/lib/dataTransformers'

const calculateProfileCompleteness = (doctorProfile) => {
  const fields = [
    doctorProfile.basic?.name,
    doctorProfile.basic?.age,
    doctorProfile.basic?.gender,
    doctorProfile.basic?.languages?.length > 0,
    doctorProfile.basic?.phone,
    doctorProfile.professional?.specialty,
    doctorProfile.professional?.yearsOfExperience,
    doctorProfile.professional?.recentGraduation,
    doctorProfile.practice?.address,
    doctorProfile.practice?.city,
    doctorProfile.practice?.availableDays?.length > 0,
    doctorProfile.practice?.timings?.from,
    doctorProfile.practice?.timings?.to,
  ]
  const filled = fields.filter(Boolean).length
  return Math.round((filled / fields.length) * 100)
}

export default function ProfileCompleteness() {
  const doctorAuth = useDoctorStore((state) => state.doctorAuth)
  const doctorProfile = useDoctorStore((state) => state.doctorProfile)
  const setOnboarded = useDoctorStore((state) => state.setOnboarded)

  const { data: apiProfile } = useQuery({
    queryKey: ['doctorProfile', doctorAuth.doctorId],
    queryFn: () => fetchDoctorProfile(doctorAuth.doctorId),
    enabled: !!doctorAuth.doctorId && doctorAuth.isAuthed,
  })

  useEffect(() => {
    if (apiProfile?.success && apiProfile?.data) {
      const uiProfile = transformApiProfileToUI(apiProfile.data)
      if (uiProfile) setOnboarded(uiProfile)
    }
  }, [apiProfile, setOnboarded])

  const completeness = calculateProfileCompleteness(doctorProfile)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Profile Completeness</h2>
        <span className="text-xl sm:text-2xl font-bold text-primary-blue">{completeness}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div
          className="bg-primary-blue h-3 rounded-full transition-all duration-500"
          style={{ width: `${completeness}%` }}
        />
      </div>
      <p className="text-xs sm:text-sm text-gray-600">
        {completeness < 100
          ? 'Complete your profile to get more visibility and leads.'
          : 'Your profile is complete! Keep it updated to maintain visibility.'}
      </p>
    </div>
  )
}
