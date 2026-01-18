import { apiPost, apiGet, ApiError } from './apiClient'

/**
 * Doctor Onboarding API Functions
 * All functions follow the API spec from apis.md
 */

/**
 * Step 1: Create doctor account with email and password
 * @param {string} email - Doctor email
 * @param {string} password - Doctor password (must meet requirements)
 * @returns {Promise<{success: boolean, data: {doctorId: string, mockOtp?: string}}>}
 */
export async function createDoctorAccount(email, password) {
  try {
    const response = await apiPost('/doctors/onboarding/auth', {
      email: email.trim(),
      password,
    })
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to create account', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * Step 2: Verify OTP code
 * @param {string} email - Doctor email
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, data: {doctorId: string, token: string, onboardingStep: string}}>}
 */
export async function verifyOTP(email, otp) {
  try {
    const response = await apiPost('/doctors/onboarding/verify-otp', {
      email: email.trim(),
      otp: otp.trim(),
    })

    // Store token in localStorage for subsequent requests
    if (response.data?.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('doctor_token', response.data.token)
      }
    }

    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to verify OTP', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * Step 3: Submit personal information
 * @param {string} doctorId - Doctor UUID
 * @param {object} personalInfo - Personal information object
 * @param {string} personalInfo.name - Doctor name
 * @param {number} personalInfo.age - Doctor age (18-100)
 * @param {string} personalInfo.gender - Gender (MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY)
 * @param {string[]} personalInfo.languages - Array of languages
 * @param {string} personalInfo.contactNumber - Contact phone number
 * @param {string} personalInfo.whatsappNumber - WhatsApp phone number
 * @returns {Promise<{success: boolean, data: {doctorId: string, onboardingStep: string}}>}
 */
export async function submitPersonalInfo(doctorId, personalInfo) {
  try {
    const response = await apiPost(
      '/doctors/onboarding/personal-info',
      {
        doctorId,
        name: personalInfo.name.trim(),
        age: personalInfo.age,
        gender: personalInfo.gender,
        languages: personalInfo.languages,
        contactNumber: personalInfo.contactNumber,
        whatsappNumber: personalInfo.whatsappNumber,
      },
      { skipAuth: false } // Requires auth token
    )
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to save personal information', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * Step 4: Submit professional information
 * @param {string} doctorId - Doctor UUID
 * @param {object} professionalInfo - Professional information object
 * @param {string} professionalInfo.specialty - Doctor specialty
 * @param {number} professionalInfo.yearsOfExperience - Years of experience (0-50)
 * @param {string} professionalInfo.latestQualification - Latest qualification/degree
 * @returns {Promise<{success: boolean, data: {doctorId: string, onboardingStep: string}}>}
 */
export async function submitProfessionalInfo(doctorId, professionalInfo) {
  try {
    const response = await apiPost(
      '/doctors/onboarding/professional-info',
      {
        doctorId,
        specialty: professionalInfo.specialty.trim(),
        yearsOfExperience: professionalInfo.yearsOfExperience,
        latestQualification: professionalInfo.latestQualification.trim(),
      },
      { skipAuth: false } // Requires auth token
    )
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to save professional information', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * Step 5: Submit availability and location (final onboarding step)
 * @param {string} doctorId - Doctor UUID
 * @param {object} availabilityInfo - Availability information object
 * @param {string} availabilityInfo.address - Practice address
 * @param {string} availabilityInfo.city - City
 * @param {string} availabilityInfo.state - State
 * @param {string[]} availabilityInfo.availableDays - Array of days (MONDAY, TUESDAY, etc.)
 * @param {string} availabilityInfo.availableTiming - Timing in format "HH:MM-HH:MM"
 * @returns {Promise<{success: boolean, data: {doctorId: string, onboardingStep: string, email: string, name: string}}>}
 */
export async function submitAvailability(doctorId, availabilityInfo) {
  try {
    const response = await apiPost(
      '/doctors/onboarding/availability',
      {
        doctorId,
        address: availabilityInfo.address.trim(),
        city: availabilityInfo.city.trim(),
        state: availabilityInfo.state.trim(),
        locality: null,
        availableDays: availabilityInfo.availableDays,
        availableTiming: availabilityInfo.availableTiming,
      },
      { skipAuth: false } // Requires auth token
    )
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to save availability information', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * Doctor Login
 * Login with email and password for existing doctors
 * @param {string} email - Doctor email
 * @param {string} password - Doctor password
 * @returns {Promise<{success: boolean, data: {doctorId: string, token: string, email: string, name: string, onboardingStep: string}}>}
 */
export async function loginDoctor(email, password) {
  try {
    const response = await apiPost(
      '/doctors/login',
      {
        email: email.trim(),
        password,
      },
      { skipAuth: true } // Login doesn't require auth token
    )

    // Store token in localStorage for subsequent requests
    if (response.data?.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('doctor_token', response.data.token)
      }
    }

    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to login', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * Fetch Doctor by ID
 * Get a specific doctor by their ID
 * @param {string} doctorId - Doctor UUID
 * @returns {Promise<{success: boolean, data: object}>}
 */
export async function fetchDoctorProfile(doctorId) {
  try {
    const response = await apiGet(`/doctors/${doctorId}`, {
      skipAuth: false, // May or may not require auth, but include token if available
    })
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to fetch doctor profile', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * Fetch All Doctors
 * Get a list of all doctors
 * @returns {Promise<{success: boolean, data: array, count: number}>}
 */
export async function fetchAllDoctors() {
  try {
    const response = await apiGet('/doctors', {
      skipAuth: false, // May or may not require auth, but include token if available
    })
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to fetch doctors', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * View Doctor Profile
 * View a doctor's profile and increment the view count
 * This endpoint should be called when a patient views a doctor's profile
 * @param {string} doctorId - Doctor UUID
 * @param {string} patientId - Patient UUID (optional)
 * @returns {Promise<{success: boolean, data: object}>}
 */
export async function viewDoctorProfile(doctorId, patientId = null) {
  try {
    const body = patientId ? { patientId } : {}
    const response = await apiPost(
      `/doctors/${doctorId}/view`,
      body,
      { skipAuth: false } // May or may not require auth, but include token if available
    )
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to view doctor profile', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * TODO: Update doctor profile
 * This endpoint is not documented in apis.md
 * When available, implement PATCH/PUT /doctors/:id or /doctors/profile or similar
 */
export async function updateDoctorProfile(doctorId, updates) {
  // TODO: Implement when API endpoint is available
  // For now, throw error to indicate it's not implemented
  throw new ApiError('Profile update endpoint not yet available', 501, 'NOT_IMPLEMENTED')
}

/**
 * Fetch leads/events (people who viewed profile)
 * Get all lead events for a doctor (profile views, saves, clicks, etc.)
 * @param {string} doctorId - Doctor UUID
 * @returns {Promise<{success: boolean, data: array}>}
 */
export async function fetchLeadEvents(doctorId) {
  try {
    const response = await apiGet(`/doctors/${doctorId}/leads`, {
      skipAuth: false, // Requires auth token
    })
    // Return the data array directly for easier consumption
    return response.data || []
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to fetch lead events', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * Schedule an appointment
 * @param {string} patientId - Patient UUID
 * @param {string} scheduledAt - ISO Date string for start time
 * @param {string} scheduledEnd - ISO Date string for end time
 * @param {string} meetingName - Name of the meeting
 * @returns {Promise<{success: boolean, data: object}>}
 */
export async function scheduleAppointment(patientId, scheduledAt, scheduledEnd, meetingName) {
  try {
    const response = await apiPost(
      '/appointments/schedule',
      {
        patientId,
        scheduledAt,
        scheduledEnd,
        meetingName
      },
      { skipAuth: false }
    )
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to schedule appointment', 0, 'UNKNOWN_ERROR')
  }
}


