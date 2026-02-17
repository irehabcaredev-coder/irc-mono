'use client'

import { Video, Calendar, Clock, MapPin } from 'lucide-react'

// Mock Data
const appointments = [
    {
        id: 1,
        doctorName: 'Dr. Smith',
        specialty: 'Audiologist',
        date: 'Monday, April 22, 2024',
        time: '11:00 AM',
        mode: 'ONLINE',
        status: 'CONFIRMED',
        image: null, // In real app, this would be a URL
    },
    {
        id: 2,
        doctorName: 'Dr. Johnson',
        specialty: 'Speech Therapist',
        date: 'Thursday, April 25, 2024',
        time: '2:00 PM',
        mode: 'CLINIC',
        clinicAddress: 'Health Plus Clinic, Indiranagar',
        status: 'CONFIRMED',
        image: null,
    },
    {
        id: 3,
        doctorName: 'Dr. Emily Chen',
        specialty: 'Child Speech Specialist',
        date: 'Friday, May 10, 2024',
        time: '10:30 AM',
        mode: 'HOME_VISIT',
        status: 'UPCOMING',
        image: null,
    },
]

export default function AppointmentsList() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Your Appointments</h1>
                <p className="text-gray-600 mt-1">Manage your upcoming and past consultations.</p>
            </div>

            <div className="space-y-4">
                {appointments.map((apt) => (
                    <div
                        key={apt.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between"
                    >
                        {/* Left: Doctor Info & Time */}
                        <div className="flex gap-4">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center text-primary-blue font-bold text-lg sm:text-xl flex-shrink-0">
                                {apt.doctorName.charAt(4)}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{apt.doctorName}</h3>
                                <p className="text-primary-blue text-sm font-medium mb-3">{apt.specialty}</p>

                                <div className="space-y-1.5 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span>{apt.date}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span>{apt.time}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {apt.mode === 'ONLINE' ? <Video className="w-4 h-4 text-gray-400" /> : <MapPin className="w-4 h-4 text-gray-400" />}
                                        <span>
                                            {apt.mode === 'ONLINE' ? 'Video Consultation' : apt.mode === 'HOME_VISIT' ? 'Home Visit' : apt.clinicAddress}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-row sm:flex-col justify-end sm:justify-center gap-3 mt-2 sm:mt-0 w-full sm:w-auto">
                            <div className="hidden sm:block text-right mb-auto">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${apt.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {apt.status}
                                </span>
                            </div>

                            {apt.mode === 'ONLINE' && (
                                <button className="flex-1 sm:flex-none px-4 py-2 bg-primary-blue text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap">
                                    Join Call
                                </button>
                            )}
                            <button className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap">
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
