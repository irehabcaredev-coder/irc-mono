'use client'

import { useQuery } from '@tanstack/react-query'
import Header from '@/components/patients/Header'
import Sidebar from '@/components/patients/Sidebar'
import DoctorCard from '@/components/patients/DoctorCard'
import AuthModal from '@/components/patients/AuthModal'
import DoctorProfile from '@/components/patients/DoctorProfile'
import { usePatientStore } from '@/store/usePatientStore'
import { filterDoctors } from '@/lib/filterDoctors'
import { fetchAllDoctors } from '@/lib/doctorApi'
import { transformApiDoctorToCard } from '@/lib/dataTransformers'
import { BRAND_NAME } from '@/lib/brand'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const languages = ['English', 'Hindi', 'Assamese', 'Bengali', 'Kannada', 'Marathi', 'Tamil', 'Telugu', 'Gujarati']

export default function PatientsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token')
  const [isHydrated, setIsHydrated] = useState(false)

  const activeTab = usePatientStore((state) => state.activeTab)
  const searchQuery = usePatientStore((state) => state.searchQuery)
  const selectedConsultModes = usePatientStore((state) => state.selectedConsultModes)
  const selectedLanguage = usePatientStore((state) => state.selectedLanguage)
  const savedDoctorIds = usePatientStore((state) => state.savedDoctorIds)
  const setSearchQuery = usePatientStore((state) => state.setSearchQuery)
  const toggleConsultMode = usePatientStore((state) => state.toggleConsultMode)
  const setSelectedLanguage = usePatientStore((state) => state.setSelectedLanguage)
  const setAuthSuccess = usePatientStore((state) => state.setAuthSuccess)
  const isAuthed = usePatientStore((state) => state.isAuthed)
  const openAuthModal = usePatientStore((state) => state.openAuthModal)
  const setAuthStep = usePatientStore((state) => state.setAuthStep)
  const setTempPatientId = usePatientStore((state) => state.setTempPatientId)

  // Wait for hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // JWT Parser
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("JWT Parse Error:", e);
      return null;
    }
  };

  // Handle Auth
  useEffect(() => {
    if (!isHydrated) return

    if (tokenFromUrl) {
      localStorage.setItem('patient_token', tokenFromUrl)
      
      const decoded = parseJwt(tokenFromUrl)
      if (decoded && decoded.email) {
        const pId = decoded.patientId || decoded.id
        
        // Check user status flags from URL
        const isNewUser = searchParams.get('isNewUser') === 'true'
        const isReturningIncompleteUser = searchParams.get('isReturningIncompleteUser') === 'true'

        if ((isNewUser || isReturningIncompleteUser) && pId) {
             // Case 1 & 2: Incomplete profile - Open Modal at Step 3 (Details)
             // We must set tempPatientId so the modal knows who to update
             openAuthModal('register')
             setTempPatientId(pId)
             setAuthStep(3)
        } else if (pId) {
            // Case 3: Fully onboarded - Just login
            setAuthSuccess(decoded.email, {
                patientId: pId,
                name: decoded.name,
                email: decoded.email,
                onboardingStep: decoded.onboardingStep
            })
        }
        
        // Clear token from URL to clean up
        router.replace('/patients')
      }
    }
  }, [isHydrated, tokenFromUrl, searchParams, setAuthSuccess, router, openAuthModal, setAuthStep, setTempPatientId])

  // Fetch all doctors from API
  const { data: apiDoctorsResponse, isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['allDoctors'],
    queryFn: async () => {
      const response = await fetchAllDoctors()
      return response.data || []
    },
  })

  // Transform API doctors to card format
  const allDoctors = (apiDoctorsResponse || []).map(transformApiDoctorToCard).filter(Boolean)

  // Filter doctors based on user selections
  const { data: doctors = [], isLoading: isLoadingFiltered } = useQuery({
    queryKey: ['filteredDoctors', allDoctors, activeTab, searchQuery, selectedConsultModes, selectedLanguage, savedDoctorIds],
    queryFn: () =>
      filterDoctors(allDoctors, {
        activeTab,
        searchQuery,
        selectedConsultModes,
        selectedLanguage,
        savedDoctorIds,
      }),
    enabled: allDoctors.length > 0 || isLoadingDoctors,
  })

  const isLoading = isLoadingDoctors || isLoadingFiltered

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <Sidebar />
      <AuthModal />
      <DoctorProfile />

      {/* Main Content Area */}
      <main className="lg:pl-56 pt-[120px] lg:pt-16">
        {/* Document Sheet Container */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white border border-gray-200 rounded-sm shadow-sm min-h-[calc(100vh-8rem)] p-6 sm:p-8">
            {/* Hero Section */}
            <div className="mb-8 pb-6 border-b border-gray-200">
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
                Find the right audiologist or speech therapist near you.
              </h1>
              <p className="text-gray-600">
                Verified professionals for hearing, speech, and voice care.
              </p>
            </div>

            {/* Search and Filters */}
            <div className="mb-8 space-y-4">
              {/* Search Input */}
              <div>
                <input
                  type="text"
                  placeholder="Search by doctor name, clinic, or locality"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                />
              </div>

              {/* Consult Mode Filters */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 mr-2 self-center">Consult mode:</span>
                {['CLINIC', 'HOME_VISIT', 'ONLINE'].map((mode) => {
                  const isSelected = selectedConsultModes.includes(mode)
                  return (
                    <button
                      key={mode}
                      onClick={() => toggleConsultMode(mode)}
                      className={`px-3 py-1 text-sm font-medium rounded-full transition-colors relative ${
                        isSelected
                          ? 'bg-primary-blue text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {mode === 'CLINIC' ? 'Clinic' : mode === 'HOME_VISIT' ? 'Home Visit' : 'Online'}
                      {isSelected && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent-red rounded-full"></span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Language Filter */}
              <div>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                >
                  <option value="">All Languages</option>
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Doctor List */}
            <div className="mb-8">
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
                <div className="text-center py-12">
                  <p className="text-gray-600">No doctors found matching your criteria.</p>
                </div>
              )}
            </div>

            {/* How it Works Section */}
            <div className="mb-8 pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">How it works</h2>
              <ol className="space-y-3 list-decimal list-inside text-gray-700">
                <li>Search specialist by name, clinic, or location</li>
                <li>View profile and qualifications</li>
                <li>Call or WhatsApp to consult</li>
              </ol>
            </div>

            {/* Footer Note */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                {BRAND_NAME} does not provide medical advice. Please consult a licensed professional.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

