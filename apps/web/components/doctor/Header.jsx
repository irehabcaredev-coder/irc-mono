'use client'

import Link from 'next/link'
import { useDoctorStore } from '@/store/useDoctorStore'
import BrandWordmark from '@/components/BrandWordmark'

export default function Header() {
  const doctorAuth = useDoctorStore((state) => state.doctorAuth)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-1">
            <BrandWordmark size="lg" />
          </Link>

          <nav className="flex items-center space-x-4 sm:space-x-6 text-sm font-medium">
            <Link
              href="/patients"
              className="text-gray-700 hover:text-primary-blue transition-colors"
            >
              Find Specialists
            </Link>
            <Link
              href="/for-doctors"
              className="text-gray-700 hover:text-primary-blue transition-colors hidden sm:inline-block"
            >
              For Doctors
            </Link>
            {doctorAuth.isAuthed ? (
              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 bg-primary-blue text-white rounded-full hover:bg-blue-700 transition-colors text-xs sm:text-sm font-semibold"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth"
                className="px-3.5 py-1.5 text-primary-blue border border-primary-blue rounded-full hover:bg-blue-50 transition-colors text-xs sm:text-sm font-semibold"
              >
                Doctor Login
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

