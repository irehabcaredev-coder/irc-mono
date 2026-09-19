'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Award, MapPin, ArrowRight, Stethoscope } from 'lucide-react'
import { fetchAllDoctors } from '@/lib/doctorApi'
import { transformApiDoctorToCard } from '@/lib/dataTransformers'
import { usePatientStore } from '@/store/usePatientStore'

const SPECIALTY_LABEL = {
  BOTH: 'Audiologist & Speech Therapist',
  AUDIOLOGIST: 'Audiologist',
  SPEECH_THERAPIST: 'Speech Therapist',
}

export default function BestDoctors() {
  const router = useRouter()
  const isAuthed = usePatientStore((state) => state.isAuthed)
  const openAuthModal = usePatientStore((state) => state.openAuthModal)
  const openProfileDrawer = usePatientStore((state) => state.openProfileDrawer)

  const { data, isLoading } = useQuery({
    queryKey: ['landingTopDoctors'],
    queryFn: async () => {
      const response = await fetchAllDoctors({ page: 1, limit: 6, sortBy: 'experience_desc' })
      const docs = Array.isArray(response) ? response : response?.data || []
      return docs.map(transformApiDoctorToCard).filter(Boolean)
    },
  })

  const topDoctors = data || []

  const goToDoctor = (doctor) => {
    if (!isAuthed) {
      openAuthModal('login', { type: 'PROFILE', doctorId: doctor.id })
      router.push('/patients')
      return
    }
    openProfileDrawer(doctor.id)
    router.push('/patients')
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mb-10">
          <div>
            <span className="text-blue-600 font-bold tracking-wider uppercase text-xs sm:text-sm mb-2 block flex items-center gap-2">
              <span className="w-8 h-px bg-blue-600" />
              Top Rated Specialists
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900">
              Best doctors, picked by experience.
            </h2>
          </div>
          <button
            onClick={() => router.push('/patients')}
            className="hidden sm:inline-flex items-center gap-1.5 text-primary-blue font-semibold hover:underline shrink-0"
          >
            View all doctors <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex gap-5 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="min-w-[260px] h-56 rounded-2xl bg-gray-100 animate-pulse shrink-0" />
            ))}
          </div>
        ) : topDoctors.length === 0 ? (
          <p className="text-gray-500">No doctors available right now. Please check back soon.</p>
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
            {topDoctors.map((doctor) => (
              <button
                key={doctor.id}
                onClick={() => goToDoctor(doctor)}
                className="min-w-[270px] max-w-[270px] snap-start text-left bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all shrink-0"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-primary-blue">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-amber-50 text-amber-700 rounded-full">
                    <Award className="w-3.5 h-3.5" />
                    {doctor.experienceYears}+ yrs
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{doctor.name}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {SPECIALTY_LABEL[doctor.specialty] || doctor.specialty}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {[doctor.locality, doctor.city].filter(Boolean).join(', ') || 'Available online'}
                </p>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => router.push('/patients')}
          className="sm:hidden mt-6 inline-flex items-center gap-1.5 text-primary-blue font-semibold hover:underline"
        >
          View all doctors <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  )
}
