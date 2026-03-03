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

          <nav className="hidden md:flex items-center space-x-8">
            {doctorAuth.isAuthed && (
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-primary-blue transition-colors"
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

