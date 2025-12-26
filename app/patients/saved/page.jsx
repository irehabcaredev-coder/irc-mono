'use client'

import Header from '@/components/patients/Header'
import Sidebar from '@/components/patients/Sidebar'
import DoctorCard from '@/components/patients/DoctorCard'
import AuthModal from '@/components/patients/AuthModal'
import DoctorProfile from '@/components/patients/DoctorProfile'
import { usePatientStore } from '@/store/usePatientStore'
import { mockDoctors } from '@/lib/mockData'

export default function SavedDoctorsPage() {
  const savedDoctorIds = usePatientStore((state) => state.savedDoctorIds)
  const viewedDoctors = usePatientStore((state) => state.viewedDoctors)

  const savedDoctors = mockDoctors.filter((doctor) => savedDoctorIds.includes(doctor.id))
  const viewedDoctorsList = mockDoctors.filter((doctor) => viewedDoctors.includes(doctor.id))

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
              {savedDoctors.length > 0 ? (
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
              {viewedDoctorsList.length > 0 ? (
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

