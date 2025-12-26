import { mockDoctors } from './mockData'

export function filterDoctors(filters) {
  const {
    activeTab,
    searchQuery,
    selectedConsultModes,
    selectedLanguage,
    savedDoctorIds,
  } = filters

  let filtered = [...mockDoctors]

  // Filter by active tab
  if (activeTab === 'SAVED_DOCTORS') {
    filtered = filtered.filter((doctor) => savedDoctorIds.includes(doctor.id))
  } else if (activeTab === 'FIND_SPECIALIST') {
    // Show all
  } else if (activeTab === 'AUDIOLOGIST') {
    filtered = filtered.filter(
      (doctor) =>
        doctor.specialty === 'AUDIOLOGIST' || doctor.specialty === 'BOTH'
    )
  } else if (activeTab === 'SPEECH_THERAPIST') {
    filtered = filtered.filter(
      (doctor) =>
        doctor.specialty === 'SPEECH_THERAPIST' || doctor.specialty === 'BOTH'
    )
  } else if (activeTab === 'CHILD_SPEECH') {
    filtered = filtered.filter((doctor) =>
      doctor.subTags.includes('CHILD_SPEECH')
    )
  } else if (activeTab === 'ADULT_SPEECH') {
    filtered = filtered.filter((doctor) =>
      doctor.subTags.includes('ADULT_SPEECH')
    )
  } else if (activeTab === 'HEARING_TEST') {
    filtered = filtered.filter((doctor) =>
      doctor.subTags.includes('HEARING_TEST')
    )
  }

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    filtered = filtered.filter(
      (doctor) =>
        doctor.name.toLowerCase().includes(query) ||
        doctor.clinic.toLowerCase().includes(query) ||
        doctor.locality.toLowerCase().includes(query) ||
        doctor.city.toLowerCase().includes(query)
    )
  }

  // Filter by consult modes
  if (selectedConsultModes.length > 0) {
    filtered = filtered.filter((doctor) =>
      selectedConsultModes.some((mode) => doctor.consultModes.includes(mode))
    )
  }

  // Filter by language
  if (selectedLanguage) {
    filtered = filtered.filter((doctor) =>
      doctor.languages.includes(selectedLanguage)
    )
  }

  return filtered
}


