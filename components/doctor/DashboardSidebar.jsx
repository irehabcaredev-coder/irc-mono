'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User, Users, Settings, LogOut, Menu, X } from 'lucide-react'
import { useDoctorStore } from '@/store/useDoctorStore'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardSidebar({ isOpen, onClose }) {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useDoctorStore((state) => state.logout)

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      onClose()
    }
  }, [pathname, isOpen, onClose])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[99] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static
          top-0 left-0
          w-64 h-screen lg:h-auto lg:min-h-screen
          bg-white border-r border-gray-200
          z-[100] lg:z-auto
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:pt-16
        `}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <span className="text-xl font-bold">
            <span className="text-primary-blue">eCare</span>
            <span className="text-accent-red">+</span>
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1 pt-4 lg:pt-4 overflow-y-auto h-full lg:h-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    onClose()
                  }
                }}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-blue text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-accent-red transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log out</span>
          </button>
        </nav>
      </aside>
    </>
  )
}

// Mobile Menu Button Component
export function MobileMenuButton({ onClick, isOpen = false }) {
  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onClick) {
      onClick()
    }
  }

  return (
    <button
      onClick={handleClick}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
      }}
      className={`lg:hidden fixed top-4 left-4 z-[101] p-3 bg-white rounded-lg shadow-lg border-2 border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-all touch-manipulation cursor-pointer ${
        isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      type="button"
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        pointerEvents: isOpen ? 'none' : 'auto',
        position: 'fixed',
        zIndex: 101,
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      <Menu className="w-6 h-6 text-gray-700 pointer-events-none" />
    </button>
  )
}

