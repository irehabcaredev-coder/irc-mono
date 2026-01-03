'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDoctorStore } from '@/store/useDoctorStore'
import DashboardSidebar, { MobileMenuButton } from '@/components/doctor/DashboardSidebar'
import { LogOut } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const doctorAuth = useDoctorStore((state) => state.doctorAuth)
  const logout = useDoctorStore((state) => state.logout)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    // Only run auth checks after hydration
    if (!isHydrated) return
    
    if (!doctorAuth.isAuthed) {
      router.push('/auth')
    } else if (!doctorAuth.isOnboarded) {
      router.push('/onboarding')
    }
  }, [doctorAuth, router, isHydrated])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!doctorAuth.isAuthed || !doctorAuth.isOnboarded) {
    return null
  }

  return (
    <div className="min-h-screen bg-paper relative">
      <MobileMenuButton onClick={() => setSidebarOpen(true)} isOpen={sidebarOpen} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 lg:pt-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage your account and profile settings</p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Account Settings */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Account</h2>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 border-b border-gray-200 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base text-gray-900">Email</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{doctorAuth.email}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 border-b border-gray-200 gap-2">
                  <div>
                    <p className="font-medium text-sm sm:text-base text-gray-900">Sign-in Method</p>
                    <p className="text-xs sm:text-sm text-gray-600 capitalize">{doctorAuth.authProvider || 'Email'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Account Actions</h2>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4">
                <div className="flex-1">
                  <p className="font-medium text-sm sm:text-base text-gray-900">Sign out</p>
                  <p className="text-xs sm:text-sm text-gray-600">Sign out of your account</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center px-4 py-2 border border-red-300 text-accent-red rounded-lg font-semibold hover:bg-red-50 transition-colors w-full sm:w-auto"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
