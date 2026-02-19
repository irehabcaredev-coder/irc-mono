
import { Suspense } from 'react'
import Header from '@/components/patients/Header'
import Sidebar from '@/components/patients/Sidebar'
import AuthModal from '@/components/patients/AuthModal'
import DoctorProfile from '@/components/patients/DoctorProfile'
import PatientsMain from './PatientsMain'

export default function PatientsPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <Sidebar />
      <AuthModal />
      <DoctorProfile />

      {/* Main Content Area */}
      <Suspense fallback={
        <main className="lg:pl-56 pt-[120px] lg:pt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white border border-gray-200 rounded-sm shadow-sm min-h-[calc(100vh-8rem)] p-6 sm:p-8">
              <div className="animate-pulse space-y-8">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-100 h-32 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      }>
        <PatientsMain />
      </Suspense>
    </div>
  )
}
