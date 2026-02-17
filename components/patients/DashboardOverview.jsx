'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Video, MapPin, Calendar, Clock } from 'lucide-react'
import { usePatientStore } from '@/store/usePatientStore'
import Image from 'next/image'

// Mock Data for "Your Doctors"
const consultedDoctors = [
    {
        id: '1',
        name: 'Dr. Sarah Wilson',
        specialty: 'Audiologist',
        image: null,
        lastConsult: '2 days ago'
    },
    {
        id: '2',
        name: 'Dr. James Carter',
        specialty: 'Speech Therapist',
        image: null,
        lastConsult: '1 month ago'
    }
]

// Mock Data for Appointments - integrated into calendar
const upcomingAppointments = [
    {
        id: 1,
        doctorName: 'Dr. Sarah Wilson',
        specialty: 'Audiologist',
        date: new Date(2024, 3, 22), // April 22, 2024
        time: '11:00 AM',
        mode: 'ONLINE',
        status: 'CONFIRMED',
    },
    {
        id: 2,
        doctorName: 'Dr. James Carter',
        specialty: 'Speech Therapist',
        date: new Date(2024, 3, 25), // April 25, 2024
        time: '2:00 PM',
        mode: 'CLINIC',
        clinicAddress: 'Health Plus Clinic, Indiranagar',
        status: 'CONFIRMED',
    }
]


export default function DashboardOverview() {
    const userProfile = usePatientStore((state) => state.userProfile)
    const userName = userProfile?.name || 'Patient'

    const [currentDate, setCurrentDate] = useState(new Date())

    const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const firstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const renderCalendar = () => {
        const totalDays = daysInMonth(currentDate)
        const startDay = firstDayOfMonth(currentDate)
        const days = []

        // Empty cells for days before start of month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/30 border border-gray-100 rounded-lg"></div>)
        }

        // Days of the month
        for (let i = 1; i <= totalDays; i++) {
            const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
            const appointmentsForDay = upcomingAppointments.filter(apt =>
                apt.date.getDate() === i &&
                apt.date.getMonth() === currentDate.getMonth() &&
                apt.date.getFullYear() === currentDate.getFullYear()
            )

            days.push(
                <div key={i} className={`h-24 border border-gray-100 rounded-lg p-2 relative ${appointmentsForDay.length > 0 ? 'bg-blue-50/30' : 'bg-white'}`}>
                    <span className={`text-sm font-medium ${new Date().toDateString() === currentDayDate.toDateString()
                            ? 'bg-primary-blue text-white w-6 h-6 flex items-center justify-center rounded-full'
                            : 'text-gray-700'
                        }`}>{i}</span>

                    {appointmentsForDay.map(apt => (
                        <div key={apt.id} className="mt-1 p-1 bg-white border border-blue-100 rounded text-[10px] shadow-sm truncate border-l-2 border-l-primary-blue">
                            {apt.time} - {apt.doctorName}
                        </div>
                    ))}
                </div>
            )
        }
        return days
    }

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                    Welcome back, {userName}
                </h1>
                <p className="text-gray-600 mt-1">Here's what's happening today.</p>
            </div>

            {/* Your Doctors Banner */}
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    Your Doctors
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Recently Consulted</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {consultedDoctors.map((doctor) => (
                        <div key={doctor.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-primary-blue font-bold text-xl group-hover:scale-105 transition-transform">
                                {doctor.name.charAt(4)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 group-hover:text-primary-blue transition-colors">{doctor.name}</h3>
                                <p className="text-xs text-gray-500">{doctor.specialty}</p>
                                <p className="text-[10px] text-gray-400 mt-1">Last consulted: {doctor.lastConsult}</p>
                            </div>
                        </div>
                    ))}
                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-100 hover:text-primary-blue transition-colors cursor-pointer min-h-[88px]">
                        <span className="text-sm font-medium">+ Find new doctor</span>
                    </div>
                </div>
            </section>

            {/* Upcoming Appointments Calendar */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
                        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-md text-gray-600">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-medium w-32 text-center">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-md text-gray-600">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-px bg-gray-200 p-px">
                        {renderCalendar()}
                    </div>
                </div>

                {/* List View for Mobile / Quick Access */}
                <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-medium text-gray-900">Next Up</h3>
                    {upcomingAppointments.map(apt => (
                        <div key={apt.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-4 shadow-sm">
                            <div className="bg-blue-50 text-primary-blue p-3 rounded-lg flex flex-col items-center justify-center min-w-[60px]">
                                <span className="text-xs font-bold uppercase">{apt.date.toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-xl font-bold">{apt.date.getDate()}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{apt.doctorName}</h4>
                                        <p className="text-xs text-gray-500">{apt.specialty}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-[10px] font-medium rounded-full ${apt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {apt.status}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {apt.time}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {apt.mode === 'ONLINE' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                                        {apt.mode === 'ONLINE' ? 'Video Call' : 'In-Clinic'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
