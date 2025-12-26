/**
 * Data transformation functions to map UI fields to API format
 * and vice versa
 */

/**
 * Maps UI gender format to API format
 * UI: "Male", "Female", "Other", "Prefer not to say"
 * API: "MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"
 */
export function mapGenderToAPI(gender) {
  const mapping = {
    Male: 'MALE',
    Female: 'FEMALE',
    Other: 'OTHER',
    'Prefer not to say': 'PREFER_NOT_TO_SAY',
  }
  return mapping[gender] || gender.toUpperCase()
}

/**
 * Maps API gender format to UI format
 */
export function mapGenderFromAPI(gender) {
  const mapping = {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other',
    PREFER_NOT_TO_SAY: 'Prefer not to say',
  }
  return mapping[gender] || gender
}

/**
 * Maps UI day format to API format
 * UI: "Mon", "Tue", "Wed", etc.
 * API: "MONDAY", "TUESDAY", "WEDNESDAY", etc.
 */
export function mapDaysToAPI(days) {
  const dayMapping = {
    Mon: 'MONDAY',
    Tue: 'TUESDAY',
    Wed: 'WEDNESDAY',
    Thu: 'THURSDAY',
    Fri: 'FRIDAY',
    Sat: 'SATURDAY',
    Sun: 'SUNDAY',
  }
  return days.map((day) => dayMapping[day] || day.toUpperCase())
}

/**
 * Maps API day format to UI format
 */
export function mapDaysFromAPI(days) {
  const dayMapping = {
    MONDAY: 'Mon',
    TUESDAY: 'Tue',
    WEDNESDAY: 'Wed',
    THURSDAY: 'Thu',
    FRIDAY: 'Fri',
    SATURDAY: 'Sat',
    SUNDAY: 'Sun',
  }
  return days.map((day) => dayMapping[day] || day)
}

/**
 * Converts time inputs (from/to) to API timing format
 * UI: { from: "09:00", to: "17:00" }
 * API: "09:00-17:00"
 */
export function formatTimingToAPI(timings) {
  if (!timings?.from || !timings?.to) {
    return null
  }
  // Time inputs already return "HH:MM" format in 24-hour
  const from = timings.from.trim()
  const to = timings.to.trim()
  // Validate format (should be HH:MM)
  if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) {
    return null
  }
  return `${from}-${to}`
}

/**
 * Converts API timing format to time inputs
 * API: "09:00-17:00"
 * UI: { from: "09:00", to: "17:00" }
 */
export function formatTimingFromAPI(timing) {
  if (!timing) {
    return { from: '', to: '' }
  }
  const [from, to] = timing.split('-')
  return { from: from || '', to: to || '' }
}

/**
 * Formats phone number for API
 * API accepts various formats, but we'll normalize to include country code if missing
 */
export function formatPhoneForAPI(phone) {
  if (!phone) return ''
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  // If it's 10 digits, assume Indian number and add +91
  if (digits.length === 10) {
    return `+91${digits}`
  }
  // If it already has country code, add + if missing
  if (digits.length > 10 && !phone.startsWith('+')) {
    return `+${digits}`
  }
  return phone
}

/**
 * Transforms UI basic details to API personal info format
 */
export function transformBasicDetailsToAPI(basicData) {
  return {
    name: basicData.name || '',
    age: basicData.age,
    gender: mapGenderToAPI(basicData.gender),
    languages: basicData.languages || [],
    contactNumber: formatPhoneForAPI(basicData.phone),
    whatsappNumber: formatPhoneForAPI(basicData.phone), // Use same number for both if only one provided
  }
}

/**
 * Transforms UI professional details to API professional info format
 * Note: API expects latestQualification (string), but UI has recentGraduation (year)
 * We'll convert graduation year to a qualification string
 */
export function transformProfessionalDetailsToAPI(professionalData) {
  // If recentGraduation is provided, convert to qualification string
  // Otherwise, use specialty as qualification
  let latestQualification = professionalData.specialty || ''
  if (professionalData.recentGraduation) {
    latestQualification = `${professionalData.specialty} (${professionalData.recentGraduation})`
  }

  return {
    specialty: professionalData.specialty || '',
    yearsOfExperience: professionalData.yearsOfExperience || 0,
    latestQualification: latestQualification,
  }
}

/**
 * Transforms UI practice details to API availability format
 */
export function transformPracticeDetailsToAPI(practiceData) {
  return {
    address: practiceData.address || '',
    city: practiceData.city || '',
    locality: practiceData.locality || '',
    availableDays: mapDaysToAPI(practiceData.availableDays || []),
    availableTiming: formatTimingToAPI(practiceData.timings),
  }
}

/**
 * Transforms API doctor profile to UI format
 * @param {object} apiProfile - Profile from GET /doctors/:id
 * @returns {object} UI-formatted profile
 */
export function transformApiProfileToUI(apiProfile) {
  if (!apiProfile) return null

  // Extract graduation year from latestQualification if possible
  let recentGraduation = null
  if (apiProfile.latestQualification) {
    const yearMatch = apiProfile.latestQualification.match(/\b(19|20)\d{2}\b/)
    if (yearMatch) {
      recentGraduation = parseInt(yearMatch[0])
    }
  }

  return {
    basic: {
      name: apiProfile.name || '',
      age: apiProfile.age || null,
      gender: mapGenderFromAPI(apiProfile.gender || ''),
      languages: apiProfile.languages || [],
      phone: apiProfile.contactNumber || apiProfile.whatsappNumber || '',
    },
    professional: {
      specialty: apiProfile.specialty || '',
      yearsOfExperience: apiProfile.yearsOfExperience || null,
      recentGraduation: recentGraduation,
    },
    practice: {
      address: apiProfile.address || '',
      city: apiProfile.city || '',
      locality: apiProfile.locality || '',
      availableDays: mapDaysFromAPI(apiProfile.availableDays || []),
      timings: formatTimingFromAPI(apiProfile.availableTiming),
    },
  }
}

