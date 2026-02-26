'use client'

import { useState, useEffect, useRef } from 'react'
import { usePatientStore } from '@/store/usePatientStore'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Calendar, MessageSquare, Settings, ChevronUp } from 'lucide-react'

const tabs = [
  { id: 'APPOINTMENTS', label: 'My Appointments' },
  { id: 'FIND_SPECIALIST', label: 'Find Specialist' },
  { id: 'AUDIOLOGIST', label: 'Audiologist' },
  { id: 'SPEECH_THERAPIST', label: 'Speech Therapist' },
  { id: 'CHILD_SPEECH', label: 'Child Speech' },
  { id: 'ADULT_SPEECH', label: 'Adult Speech' },
  { id: 'HEARING_TEST', label: 'Hearing Test' },
  { id: 'SAVED_DOCTORS', label: 'Saved Doctors' },
]

export default function Sidebar() {
  const activeTab = usePatientStore((state) => state.activeTab)
  const setActiveTab = usePatientStore((state) => state.setActiveTab)
  const isAuthed = usePatientStore((state) => state.isAuthed)
  const logout = usePatientStore((state) => state.logout)
  const isSidebarOpen = usePatientStore((state) => state.isSidebarOpen)
  const closeSidebar = usePatientStore((state) => state.closeSidebar)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const settingsRef = useRef(null)
  const router = useRouter()

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false)
      }
    }

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSettingsOpen])

  const handleUpdateProfile = () => {
    setIsSettingsOpen(false)
    router.push('/patients/profile') // Assuming this route or we can use a modal
  }

  const handleDeleteAccount = () => {
    setIsSettingsOpen(false)
    // Add delete account logic or modal
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Call delete API
      console.log('Delete account requested')
    }
  }

  const displayedTabs = isAuthed
    ? [
      { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'FIND_SPECIALIST', label: 'Find Doctors', icon: Calendar },
      { id: 'CHAT_AI', label: 'Chat with AI', icon: MessageSquare },
    ]
    : tabs

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 z-30">
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {displayedTabs.map((tab) => {
            const isActive = activeTab === tab.id
            // For unauthed tabs which don't have icons defined in the original array
            // we can render them simply. For authed, we use the new structure.
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors relative ${isActive
                  ? 'bg-blue-50 text-primary-blue border-l-4 border-accent-red pl-3'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-accent-red rounded-r-md"></span>
                )}
                {Icon && <Icon className="w-5 h-5" />}
                {tab.label}
              </button>
            )
          })}

        </nav>

        {/* Settings Dropdown for Authenticated Users */}
        {isAuthed && (
          <div className="p-4 border-t border-gray-200" ref={settingsRef}>
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </div>
                <ChevronUp className={`w-4 h-4 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSettingsOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                  <button
                    onClick={handleUpdateProfile}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
                  >
                    Update Account Info
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete Account
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar Drawer */}
      <div className={`lg:hidden fixed inset-0 z-50 ${isSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/20 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeSidebar}
        />

        {/* Drawer Panel */}
        <aside className={`absolute top-16 bottom-0 left-0 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto h-full flex flex-col">
            {displayedTabs.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    closeSidebar()
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors relative ${isActive
                    ? 'bg-blue-50 text-primary-blue border-l-4 border-accent-red pl-3'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-accent-red rounded-r-md"></span>
                  )}
                  {Icon && <Icon className="w-5 h-5" />}
                  {tab.label}
                </button>
              )
            })}

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Mobile Settings (Inline for drawer) */}
            {isAuthed && (
              <div className="pt-4 border-t border-gray-200 mt-auto">
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </div>
                  <ChevronUp className={`w-4 h-4 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSettingsOpen && (
                  <div className="mt-2 ml-4 space-y-1 border-l-2 border-gray-100 pl-4">
                    <button
                      onClick={handleUpdateProfile}
                      className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Update Account Info
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:text-red-700 transition-colors"
                    >
                      Delete Account
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </aside>
      </div>
    </>
  )
}

