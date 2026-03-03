'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useDoctorStore } from '@/store/useDoctorStore'
import DashboardSidebar, { MobileMenuButton } from '@/components/doctor/DashboardSidebar'
import DoctorChatInterface from '@/components/doctor/DoctorChatInterface'

function AIChatContent() {
    const router = useRouter()
    const doctorAuth = useDoctorStore((state) => state.doctorAuth)
    const [isHydrated, setIsHydrated] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        setIsHydrated(true)
    }, [])

    useEffect(() => {
        if (!isHydrated) return
        if (!doctorAuth.isAuthed) {
            const localToken = localStorage.getItem('doctor_token')
            if (!localToken) {
                router.push('/auth')
            }
        }
    }, [isHydrated, doctorAuth.isAuthed, router])

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

    return (
        <div className="min-h-screen bg-paper">
            <MobileMenuButton onClick={() => setSidebarOpen(true)} isOpen={sidebarOpen} />
            <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="lg:ml-64 min-h-screen">
                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="mb-4">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">AI Assistant</h1>
                        <p className="text-sm sm:text-base text-gray-600">Ask me anything — clinical guidance, patient queries, documentation help, and more.</p>
                    </div>
                    <DoctorChatInterface />
                </div>
            </div>
        </div>
    )
}

export default function DoctorAIChatPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-paper flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <AIChatContent />
        </Suspense>
    )
}
