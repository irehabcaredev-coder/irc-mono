'use client'

import { usePatientStore } from '@/store/usePatientStore'
import { MoreVertical, ChevronLeft, ChevronRight, MessageSquare as MessageIcon, ArrowRight } from 'lucide-react'
import DoctorCard from '@/components/patients/DoctorCard'

export default function DashboardHome({ doctors = [], isLoading = false }) {
    const userProfile = usePatientStore((state) => state.userProfile)
    const userName = userProfile?.name || 'Patient'

    const currentDate = new Date()
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' })
    const currentYear = currentDate.getFullYear()

    // Mock data for calendar days - simplified for display
    const calendarDays = Array.from({ length: 30 }, (_, i) => i + 1)
    const startDayOffset = 3 // Random offset for visual matching

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                    Welcome, {userName}
                </h1>
                <p className="text-gray-600 mt-1">
                    Find and book your next appointment.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Left Column - Doctor List */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-semibold text-gray-900">Recommended Doctors</h2>

                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="bg-gray-100 border border-gray-200 rounded-md p-5 animate-pulse"
                                >
                                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                                    <div className="h-10 bg-gray-200 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : doctors.length > 0 ? (
                        <div className="space-y-4">
                            {doctors.map((doctor) => (
                                <DoctorCard key={doctor.id} doctor={doctor} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <p className="text-gray-600">No doctors found matching your criteria.</p>
                        </div>
                    )}
                </div>

                {/* Right Column - Calendar & Mini-list */}
                <div className="space-y-6">

                    {/* Calendar Widget */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <button className="text-gray-400 hover:text-gray-600 p-1">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h2 className="font-semibold text-gray-900">{currentMonth} {currentYear}</h2>
                            <button className="text-gray-400 hover:text-gray-600 p-1">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                <div key={day} className="text-gray-400 text-xs font-medium py-1">{day}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-sm">
                            {Array.from({ length: startDayOffset }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {calendarDays.map(day => {
                                const isSelected = day === 9 || day === 13; // Mock selected days
                                return (
                                    <div
                                        key={day}
                                        className={`
                                    w-8 h-8 flex items-center justify-center rounded-full mx-auto cursor-pointer text-xs sm:text-sm
                                    ${isSelected ? 'bg-primary-blue text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'}
                                `}
                                    >
                                        {day}
                                    </div>
                                )
                            })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-medium text-gray-900 mb-3">Upcoming Appointments</h3>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0">
                                        22
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900">Dr. Smith</h4>
                                        <p className="text-xs text-gray-500">11:00 AM - Consultation</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0">
                                        25
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900">Dr. Johnson</h4>
                                        <p className="text-xs text-gray-500">2:00 PM - Follow up</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
