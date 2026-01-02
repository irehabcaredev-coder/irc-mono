'use client'

import { useQuery } from '@tanstack/react-query'
import Header from '@/components/patients/Header'
import Sidebar from '@/components/patients/Sidebar'
import DoctorCard from '@/components/patients/DoctorCard'
import AuthModal from '@/components/patients/AuthModal'
import DoctorProfile from '@/components/patients/DoctorProfile'
import { usePatientStore } from '@/store/usePatientStore'
import { fetchSavedDoctors } from '@/lib/patientApi'
import { fetchAllDoctors } from '@/lib/doctorApi'
import { transformApiDoctorToCard } from '@/lib/dataTransformers'

export default function SavedDoctorsPage() {
  const { isAuthed, patientProfile } = usePatientStore()
  const viewedDoctors = usePatientStore((state) => state.viewedDoctors)
  const patientId = patientProfile?.patientId

  // Fetch saved doctors from API (only if patient is authenticated)
  const { data: savedDoctorsResponse, isLoading: isLoadingSaved } = useQuery({
    queryKey: ['savedDoctors', patientId],
    queryFn: async () => {
      if (!patientId) return { data: [], count: 0 }
      const response = await fetchSavedDoctors(patientId)
      return response
    },
    enabled: !!patientId && isAuthed,
  })

  // Fetch all doctors for recently viewed section
  const { data: apiDoctorsResponse, isLoading: isLoadingAll } = useQuery({
    queryKey: ['allDoctors'],
    queryFn: async () => {
      const response = await fetchAllDoctors()
      return response.data || []
    },
  })

  // Transform saved doctors from API to card format
  const savedDoctors = (savedDoctorsResponse?.data || []).map(transformApiDoctorToCard).filter(Boolean)

  // Transform all doctors for recently viewed
  const allDoctors = (apiDoctorsResponse || []).map(transformApiDoctorToCard).filter(Boolean)
  const viewedDoctorsList = allDoctors.filter((doctor) => viewedDoctors.includes(doctor.id))

  const isLoading = isLoadingSaved || isLoadingAll

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <Sidebar />
      <AuthModal />
      <DoctorProfile />

      {/* Main Content Area */}
      <main className="lg:pl-56 pt-[120px] lg:pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white border border-gray-200 rounded-sm shadow-sm min-h-[calc(100vh-8rem)] p-6 sm:p-8">
            {/* Saved Doctors Section */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 mb-6">Saved Doctors</h1>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-gray-100 border border-gray-200 rounded-md p-5 animate-pulse"
                    >
                      <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : savedDoctors.length > 0 ? (
                <div className="space-y-4">
                  {savedDoctors.map((doctor) => (
                    <DoctorCard key={doctor.id} doctor={doctor} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">No saved doctors yet.</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-8"></div>

            {/* Recently Viewed Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Recently Viewed</h2>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-gray-100 border border-gray-200 rounded-md p-5 animate-pulse"
                    >
                      <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : viewedDoctorsList.length > 0 ? (
                <div className="space-y-4">
                  {viewedDoctorsList.map((doctor) => (
                    <DoctorCard key={doctor.id} doctor={doctor} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">No viewed doctors yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

