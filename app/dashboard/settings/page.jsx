'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDoctorStore } from '@/store/useDoctorStore'
import DashboardSidebar from '@/components/doctor/DashboardSidebar'
import { LogOut } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const doctorAuth = useDoctorStore((state) => state.doctorAuth)
  const logout = useDoctorStore((state) => state.logout)

  useEffect(() => {
    if (!doctorAuth.isAuthed) {
      router.push('/auth')
    } else if (!doctorAuth.isOnboarded) {
      router.push('/onboarding')
    }
  }, [doctorAuth, router])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (!doctorAuth.isAuthed || !doctorAuth.isOnboarded) {
    return null
  }

  return (
    <div className="min-h-screen bg-paper">
      <DashboardSidebar />
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Manage your account and profile settings</p>
          </div>

          <div className="space-y-6">
            {/* Account Settings */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Account</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">{doctorAuth.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">Sign-in Method</p>
                    <p className="text-sm text-gray-600 capitalize">{doctorAuth.authProvider || 'Email'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Account Actions</h2>
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-gray-900">Sign out</p>
                  <p className="text-sm text-gray-600">Sign out of your account</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-4 py-2 border border-red-300 text-accent-red rounded-lg font-semibold hover:bg-red-50 transition-colors"
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
