'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, Settings, Bookmark, LogOut } from 'lucide-react'
import { usePatientStore } from '@/store/usePatientStore'
import BrandWordmark from '@/components/BrandWordmark'
import Link from 'next/link'

const cities = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata']

export default function Header() {
  const router = useRouter()
  const [selectedCity, setSelectedCity] = useState('Bangalore')
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false)
  const isAuthed = usePatientStore((state) => state.isAuthed)
  const logout = usePatientStore((state) => state.logout)
  const openAuthModal = usePatientStore((state) => state.openAuthModal)
  const toggleSidebar = usePatientStore((state) => state.toggleSidebar)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-16">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left Section: Hamburger + Logo */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Hamburger Menu (Mobile Only, Authed Only) */}
          {isAuthed && (
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Logo */}
          <div className="flex-shrink-0">
            {/* Mobile: Smaller Logo, Desktop: Normal */}
            <div className="sm:hidden transform scale-75 origin-left">
              <BrandWordmark size="md" />
            </div>
            <div className="hidden sm:block">
              <BrandWordmark size="lg" />
            </div>
          </div>
        </div>

        {/* Right Section: City + Auth */}
        <div className="flex items-center gap-2 sm:gap-4">

          {/* City Selector - Hidden on Mobile */}
          <div className="relative hidden sm:block">
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

          {/* Auth Buttons */}
          {isAuthed ? (
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {/* Hide text completely on mobile */}
              <span className="hidden sm:inline">Log Out</span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('login', null)}
              className="px-3 py-1.5 text-xs font-medium text-primary-blue border border-primary-blue rounded-md hover:bg-primary-blue hover:text-white transition-colors"
            >
              Log in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

