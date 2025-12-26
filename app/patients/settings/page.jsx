'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/patients/Header'
import Sidebar from '@/components/patients/Sidebar'
import AuthModal from '@/components/patients/AuthModal'
import DoctorProfile from '@/components/patients/DoctorProfile'
import { usePatientStore } from '@/store/usePatientStore'

const cities = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Lucknow', 'Jaipur']

export default function SettingsPage() {
  const router = useRouter()
  const isAuthed = usePatientStore((state) => state.isAuthed)
  const patientProfile = usePatientStore((state) => state.patientProfile)
  const updatePatientProfile = usePatientStore((state) => state.updatePatientProfile)

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [ageError, setAgeError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!isAuthed) {
      router.push('/patients')
      return
    }

    if (patientProfile) {
      setName(patientProfile.name || '')
      setAge(patientProfile.age?.toString() || '')
      setGender(patientProfile.gender || '')
      setPhone(patientProfile.phone || '')
      setCity(patientProfile.city || '')
    }
  }, [isAuthed, patientProfile, router])

  const handleAgeChange = (value) => {
    setAge(value)
    if (value) {
      const ageNum = parseInt(value)
      if (ageNum < 0) {
        setAgeError('Age cannot be negative')
      } else if (ageNum > 120) {
        setAgeError('Age must be 120 or less')
      } else {
        setAgeError('')
      }
    } else {
      setAgeError('')
    }
  }

  const handlePhoneChange = (value) => {
    // Only allow numeric input, max 10 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 10)
    setPhone(numericValue)
    if (numericValue.length > 0 && numericValue.length !== 10) {
      setPhoneError('Enter a valid 10-digit phone number')
    } else {
      setPhoneError('')
    }
  }

  const handleSave = () => {
    if (!name || !age || !gender || !phone || !city) {
      return
    }
    if (parseInt(age) < 0 || parseInt(age) > 120) {
      setAgeError(parseInt(age) < 0 ? 'Age cannot be negative' : 'Age must be 120 or less')
      return
    }
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      setPhoneError('Enter a valid 10-digit phone number')
      return
    }

    updatePatientProfile({
      name,
      age: parseInt(age),
      gender,
      phone,
      city,
    })

    setAgeError('')
    setPhoneError('')
    setSuccessMessage('Profile updated successfully')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  if (!isAuthed) {
    return null
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <Sidebar />
      <AuthModal />
      <DoctorProfile />

      {/* Main Content Area */}
      <main className="lg:pl-56 pt-[120px] lg:pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white border border-gray-200 rounded-sm shadow-sm min-h-[calc(100vh-8rem)] p-6 sm:p-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Profile Settings</h1>

            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-md">
                {successMessage}
              </div>
            )}

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  placeholder="Enter your age"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                />
                {ageError && (
                  <p className="text-xs text-accent-red mt-1">{ageError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="Enter 10-digit phone number"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                />
                {phoneError && (
                  <p className="text-xs text-accent-red mt-1">{phoneError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                >
                  <option value="">Select city</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSave}
                disabled={!name || !age || !gender || !phone || !city || parseInt(age) < 0 || parseInt(age) > 120 || phone.length !== 10}
                className="w-full px-4 py-2 bg-primary-blue text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

