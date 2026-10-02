'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Video, MapPin, Calendar, Clock } from 'lucide-react'
import { usePatientStore } from '@/store/usePatientStore'
import { fetchPatientAppointments } from '@/lib/appointmentApi'
import { fetchSavedDoctors } from '@/lib/patientApi'
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
    const patientProfile = usePatientStore((state) => state.patientProfile)
    const userName = patientProfile?.name || 'Patient'
    const router = useRouter()

    const [currentDate, setCurrentDate] = useState(new Date())

    // Fetch appointments
    const { data: appointmentsResponse, isLoading: isAptsLoading } = useQuery({
        queryKey: ['patientAppointments'],
        queryFn: () => fetchPatientAppointments(1, 100), // Fetch up to 100 appointments
        select: (data) => data?.data || [],
        refetchInterval: 30000,
    })

    // Fetch saved doctors
    const { data: savedDoctorsResponse, isLoading: isSavedLoading } = useQuery({
        queryKey: ['savedDoctors', patientProfile?.patientId],
        queryFn: () => fetchSavedDoctors(patientProfile?.patientId),
        enabled: !!patientProfile?.patientId,
        select: (data) => data?.data || [],
    })

    const isLoading = isAptsLoading || isSavedLoading

    // Transform appointments for calendar and list
    const appointments = useMemo(() => (appointmentsResponse || []).map(apt => ({
        id: apt.id,
        doctorName: apt.doctor?.name || 'Unknown Doctor',
        specialty: apt.doctor?.specialty || 'General',
        date: new Date(apt.scheduledAt),
        scheduledEnd: apt.scheduledEnd ? new Date(apt.scheduledEnd) : null,
        time: new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: 'ONLINE', // All app-scheduled meetings are video calls
        status: apt.status,
    })), [appointmentsResponse])

    // Filter upcoming/ongoing appointments (not yet ended)
    const upcomingAppointments = useMemo(() => appointments.filter(apt => {
        const endTime = apt.scheduledEnd || apt.date
        return endTime >= new Date()
    }).sort((a, b) => a.date - b.date), [appointments])

    // Saved doctors for display
    const savedDoctors = useMemo(() => {
        return (savedDoctorsResponse || []).map(doc => ({
            id: doc.id,
            name: doc.name,
            specialty: doc.specialty,
            image: doc.profileImage,
            experience: doc.experienceYears
        })).slice(0, 4);
    }, [savedDoctorsResponse])


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
                        <div
                            key={apt.id}
                            onClick={() => router.push(`/meeting/${apt.id}`)}
                            className="mt-1 p-1 bg-white border border-blue-100 rounded text-[10px] shadow-sm truncate border-l-2 border-l-primary-blue cursor-pointer hover:bg-blue-50 transition-colors"
                            title={`${apt.time} - ${apt.doctorName} (click to join)`}
                        >
                            {apt.time} - {apt.doctorName}
                        </div>
                    ))}
                </div>
            )
        }
        return days
    }

    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8 flex items-center justify-center min-h-[50vh]">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
            {/* Header with Background Gradient */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-blue to-blue-600 p-8 sm:p-12 text-white shadow-xl shadow-blue-200/50">
                <div className="absolute top-0 right-0 -transtion-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 transtion-y-1/2 -translate-x-1/2 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl"></div>

                <div className="relative z-10">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                        Welcome back, {userName}
                    </h1>
                    <p className="text-blue-100 mt-2 text-lg font-medium opacity-90">
                        {upcomingAppointments.length > 0
                            ? `You have ${upcomingAppointments.length} upcoming appointments. Keep it up!`
                            : "Your health journey is looking good today."}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <button
                            onClick={() => usePatientStore.getState().setActiveTab('FIND_SPECIALIST')}
                            className="bg-white text-primary-blue px-6 py-2.5 rounded-full font-semibold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2"
                        >
                            <Calendar className="w-4 h-4" />
                            Book Appointment
                        </button>
                        <button
                            onClick={() => usePatientStore.getState().setActiveTab('CHAT_AI')}
                            className="bg-blue-500/30 backdrop-blur-md border border-white/30 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-blue-500/40 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Video className="w-4 h-4" />
                            AI Health Chat
                        </button>
                    </div>
                </div>
            </div>

            {/* Saved Doctors Section */}
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    Saved Doctors
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{savedDoctors.length} Saved</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {savedDoctors.length > 0 ? savedDoctors.map((doctor) => (
                        <div
                            key={doctor.id}
                            onClick={() => usePatientStore.getState().openProfileDrawer(doctor.id)}
                            className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer group border-b-4 border-b-transparent hover:border-b-primary-blue"
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-primary-blue font-bold text-xl group-hover:scale-110 transition-transform relative overflow-hidden">
                                {doctor.image ? (
                                    <Image src={doctor.image} alt={doctor.name} fill className="object-cover" />
                                ) : (
                                    <span>{doctor.name.startsWith('Dr. ') ? doctor.name.charAt(4) : doctor.name.charAt(0)}</span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 group-hover:text-primary-blue transition-colors text-sm">{doctor.name}</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{doctor.specialty}</p>
                                {doctor.experience && (
                                    <p className="text-[10px] text-gray-400 mt-1">{doctor.experience} yrs experience</p>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full sm:col-span-2 lg:col-span-3 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-500 text-sm">You haven't saved any doctors yet.</p>
                        </div>
                    )}
                    <div
                        onClick={() => usePatientStore.getState().setActiveTab('FIND_SPECIALIST')}
                        className="bg-primary-blue/5 border-2 border-dashed border-primary-blue/20 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-primary-blue hover:bg-primary-blue/10 transition-colors cursor-pointer min-h-[140px]"
                    >
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <span className="text-xl">+</span>
                        </div>
                        <span className="text-xs font-semibold">Find Doctors</span>
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

                <div className="bg-white border border-gray-100 rounded-3xl shadow-xl shadow-gray-100/50 overflow-hidden transition-all hover:shadow-2xl hover:shadow-gray-200/50 group">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 bg-gray-50/50 backdrop-blur-sm border-b border-gray-100">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-px bg-gray-100 p-px">
                        {renderCalendar()}
                    </div>
                </div>

                {/* List View for Mobile / Quick Access */}
                <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-medium text-gray-900">Next Up</h3>
                    {upcomingAppointments.length > 0 ? upcomingAppointments.map(apt => {
                        const isOngoing = apt.date <= new Date()
                        return (
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
                                    {isOngoing ? (
                                        <span className="px-2 py-1 text-[10px] font-medium rounded-full bg-green-100 text-green-700 animate-pulse">
                                            Live
                                        </span>
                                    ) : (
                                        <span className={`px-2 py-1 text-[10px] font-medium rounded-full ${apt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {apt.status}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {apt.time}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Video className="w-3.5 h-3.5" />
                                        Video Call
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push(`/meeting/${apt.id}`)}
                                    className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${isOngoing
                                        ? 'bg-green-500 hover:bg-green-600 text-white'
                                        : 'bg-primary-blue hover:bg-blue-700 text-white'
                                    }`}
                                >
                                    <Video className="w-3.5 h-3.5" />
                                    {isOngoing ? 'Join Now' : 'Join Call'}
                                </button>
                            </div>
                        </div>
                        )
                    }) : (
                        <p className="text-gray-500 text-sm">No upcoming appointments.</p>
                    )}
                </div>
            </section>
        </div>
    )
}
