'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User, Users, Settings, LogOut, Menu, X, Calendar, Bot, MessageSquare } from 'lucide-react'
import { useDoctorStore } from '@/store/useDoctorStore'
import { useRouter } from 'next/navigation'
import BrandWordmark from '@/components/BrandWordmark'
import FeedbackModal from '@/components/doctor/FeedbackModal'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { href: '/dashboard/ai-chat', label: 'AI Assistant', icon: Bot },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardSidebar({ isOpen, onClose }) {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useDoctorStore((state) => state.logout)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

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
          fixed lg:fixed
          top-0 left-0
          w-64 h-screen
          bg-white border-r border-gray-200
          z-[100] lg:z-auto
          transform transition-transform duration-300 ease-in-out lg:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <BrandWordmark size="md" />
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Nav items — flex-1 so they fill available height */}
        <nav className="p-4 space-y-1 pt-4 lg:pt-4 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    onClose()
                  }
                }}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-primary-blue text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom section: Feedback + Logout */}
        <div className="p-4 border-t border-gray-100 space-y-1">
          {/* Feedback button — styled as nav item */}
          <button
            onClick={() => setFeedbackOpen(true)}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Feedback</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-accent-red transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {/* Feedback Modal — rendered at sidebar level */}
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  )
}

// Mobile Menu Button Component
export function MobileMenuButton({ onClick, isOpen = false }) {
  const handleClick = () => {
    if (onClick && !isOpen) {
      onClick()
    }
  }

  if (isOpen) return null

  return (
    <button
      onClick={handleClick}
      className="lg:hidden fixed top-4 left-4 z-[101] p-3 bg-white rounded-lg shadow-lg border-2 border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-all"
      aria-label="Open menu"
      type="button"
    >
      <Menu className="w-6 h-6 text-gray-700" />
    </button>
  )
}
