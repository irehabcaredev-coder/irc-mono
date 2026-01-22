'use client'

import { usePatientStore } from '@/store/usePatientStore'

const tabs = [
  { id: 'FIND_SPECIALIST', label: 'Find Specialist' },
  { id: 'AUDIOLOGIST', label: 'Audiologist' },
  { id: 'SPEECH_THERAPIST', label: 'Speech Therapist' },
  { id: 'CHILD_SPEECH', label: 'Child Speech' },
  { id: 'ADULT_SPEECH', label: 'Adult Speech' },
  { id: 'HEARING_TEST', label: 'Hearing Test' },
  { id: 'APPOINTMENTS', label: 'My Appointments' },
  { id: 'SAVED_DOCTORS', label: 'Saved Doctors' },
]

export default function Sidebar() {
  const activeTab = usePatientStore((state) => state.activeTab)
  const setActiveTab = usePatientStore((state) => state.setActiveTab)

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-16 bottom-0 w-56 bg-white border-r border-gray-200 overflow-y-auto">
        <nav className="p-4 space-y-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 text-sm font-medium rounded-md transition-colors relative ${
                  isActive
                    ? 'bg-blue-50 text-primary-blue border-l-4 border-accent-red pl-3'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {isActive && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-1 bg-accent-red rounded-full"></span>
                )}
                {tab.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Horizontal Tabs */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 overflow-x-auto h-14">
        <nav className="flex space-x-2 px-4 py-2 h-full items-center">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors relative ${
                  isActive
                    ? 'bg-primary-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent-red"></span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}

