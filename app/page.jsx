'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Stethoscope, MapPin } from 'lucide-react'
import Header from '@/components/doctor/Header'
import LandingFooter from '@/components/LandingFooter'
import BestDoctors from '@/components/landing/BestDoctors'
import Testimonials from '@/components/landing/Testimonials'

const ISSUE_OPTIONS = [
  { value: '', label: 'Any concern' },
  { value: 'AUDIOLOGIST', label: 'Hearing loss or hearing test' },
  { value: 'SPEECH_THERAPIST', label: 'Speech & communication' },
  { value: 'CHILD_SPEECH', label: "Child's speech development" },
  { value: 'ADULT_SPEECH', label: 'Adult speech difficulty' },
]

const CITY_OPTIONS = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata']

export default function LandingPage() {
  const router = useRouter()
  const [issue, setIssue] = useState('')
  const [city, setCity] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (issue) params.set('tab', issue)
    if (city) params.set('search', city)
    const query = params.toString()
    router.push(`/patients${query ? `?${query}` : ''}`)
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Header />

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50/50 to-white overflow-hidden relative">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-blue-100/50 blur-3xl opacity-50 z-0 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-blue-50/50 blur-3xl opacity-50 z-0 pointer-events-none"></div>

        <div className="max-w-3xl mx-auto relative z-10 text-center space-y-8">
          <h1 className="whitespace-nowrap text-[clamp(0.95rem,4.6vw,3.25rem)] font-extrabold text-gray-900 tracking-tight">
            Get the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">expert hearing and speech care</span> you deserve
          </h1>

          <div>
            <Link
              href="/patients"
              className="inline-flex items-center justify-center px-10 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5"
            >
              Find a Doctor
            </Link>
          </div>

          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row sm:items-stretch gap-2 sm:gap-0 p-2 bg-white rounded-2xl sm:rounded-full shadow-xl shadow-gray-200/60 border border-gray-100 max-w-2xl mx-auto"
          >
            <label className="relative flex-1 flex items-center gap-3 px-4 py-3 sm:pr-6 text-left rounded-xl sm:rounded-full hover:bg-gray-50 transition-colors cursor-pointer">
              <Stethoscope className="w-5 h-5 text-blue-500 shrink-0" />
              <span className="flex-grow min-w-0">
                <span className="block text-xs font-semibold text-gray-500">What's the concern?</span>
                <select
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none appearance-none cursor-pointer truncate"
                >
                  {ISSUE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </span>
            </label>

            <div className="hidden sm:block w-px bg-gray-200 my-2"></div>

            <label className="relative flex-1 flex items-center gap-3 px-4 py-3 sm:pl-6 text-left rounded-xl sm:rounded-full hover:bg-gray-50 transition-colors cursor-pointer">
              <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
              <span className="flex-grow min-w-0">
                <span className="block text-xs font-semibold text-gray-500">City</span>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none appearance-none cursor-pointer truncate"
                >
                  <option value="">Any city</option>
                  {CITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </span>
            </label>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 text-white rounded-xl sm:rounded-full font-semibold hover:bg-gray-800 transition-colors shrink-0"
            >
              <Search className="w-5 h-5" />
              Search
            </button>
          </form>
        </div>
      </section>

      <BestDoctors />
      <Testimonials />

      <LandingFooter />
    </div>
  )
}
