'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, Settings, Bookmark, LogOut } from 'lucide-react'
import { usePatientStore } from '@/store/usePatientStore'
import BrandWordmark from '@/components/BrandWordmark'

const cities = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata']

export default function Header() {
  const router = useRouter()
  const [selectedCity, setSelectedCity] = useState('Bangalore')
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef(null)
  const isAuthed = usePatientStore((state) => state.isAuthed)
  const userEmail = usePatientStore((state) => state.userEmail)
  const logout = usePatientStore((state) => state.logout)
  const openAuthModal = usePatientStore((state) => state.openAuthModal)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false)
      }
    }

    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileDropdownOpen])

  // Close dropdown on ESC key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setIsProfileDropdownOpen(false)
      }
    }

    if (isProfileDropdownOpen) {
      document.addEventListener('keydown', handleEsc)
      return () => document.removeEventListener('keydown', handleEsc)
    }
  }, [isProfileDropdownOpen])

  const handleProfileSettings = () => {
    setIsProfileDropdownOpen(false)
    router.push('/patients/settings')
  }

  const handleSavedDoctors = () => {
    setIsProfileDropdownOpen(false)
    router.push('/patients/saved')
  }

  const handleLogout = () => {
    setIsProfileDropdownOpen(false)
    logout()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Centered Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
            <BrandWordmark size="lg" />
          </div>

          {/* Left: Doctor Link (Desktop only) */}
          <div className="hidden md:flex items-center absolute left-4">
            <a href="/auth" className="text-sm text-gray-600 hover:text-primary-blue transition-colors">
              Are you a doctor?
            </a>
          </div>

          {/* Right: City Selector and Login */}
          <div className="flex items-center space-x-3 ml-auto">
            {/* City Selector */}
            <div className="relative">
              <button
                onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:border-gray-400 transition-colors"
              >
                <span>{selectedCity}</span>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isCityDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsCityDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                    {cities.map((city) => (
                      <button
                        key={city}
                        onClick={() => {
                          setSelectedCity(city)
                          setIsCityDropdownOpen(false)
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Profile Icon / Login Button */}
            {isAuthed ? (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-blue text-white hover:bg-blue-700 transition-colors"
                  aria-label="Profile menu"
                >
                  <User className="w-4 h-4" />
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <button
                      onClick={handleProfileSettings}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-md transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleProfileSettings()
                      }}
                    >
                      <Settings className="w-4 h-4" />
                      Profile Settings
                    </button>
                    <button
                      onClick={handleSavedDoctors}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSavedDoctors()
                      }}
                    >
                      <Bookmark className="w-4 h-4" />
                      Saved Doctors
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-md transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLogout()
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login', null)}
                className="px-3 py-1 text-xs font-medium text-primary-blue border border-primary-blue rounded-md hover:bg-primary-blue hover:text-white transition-colors"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

