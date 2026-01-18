import { apiPost, apiGet, apiDelete, ApiError } from './apiClient'

/**
 * Patient API Functions
 * All functions follow the API spec from apis.md
 */

/**
 * Step 1: Create patient account with email and password
 * @param {string} email - Patient email
 * @param {string} password - Patient password (must meet requirements)
 * @returns {Promise<{success: boolean, data: {patientId: string, mockOtp?: string}}>}
 */
export async function createPatientAccount(email, password) {
  try {
    const response = await apiPost(
      '/patients/onboarding/auth',
      {
        email: email.trim(),
        password,
      },
      { skipAuth: true, usePatientToken: false } // Registration doesn't require auth
    )
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to create account', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * Step 2: Verify OTP code for patient
 * @param {string} email - Patient email
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, data: {patientId: string, token: string, onboardingStep: string}}>}
 */
export async function verifyPatientOTP(email, otp) {
  try {
    const response = await apiPost(
      '/patients/onboarding/verify-otp',
      {
        email: email.trim(),
        otp: otp.trim(),
      },
      { skipAuth: true, usePatientToken: false } // OTP verification doesn't require auth
    )

    // Store token in localStorage for subsequent requests
    if (response.data?.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('patient_token', response.data.token)
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
 * Step 3: Submit personal information (final onboarding step)
 * @param {string} patientId - Patient UUID
 * @param {object} personalInfo - Personal information object
 * @param {string} personalInfo.name - Patient name
 * @param {string} personalInfo.phone - Phone number
 * @param {string} personalInfo.gender - Gender (MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY)
 * @param {number} personalInfo.age - Age (1-120)
 * @param {string} personalInfo.city - City
 * @param {string} [personalInfo.state] - State (optional)
 * @param {string[]} [personalInfo.issues] - Issues array (optional)
 * @returns {Promise<{success: boolean, data: {patientId: string, email: string, name: string}}>}
 */
export async function submitPatientPersonalInfo(patientId, personalInfo) {
  try {
    const requestBody = {
      patientId,
      name: personalInfo.name.trim(),
      phone: personalInfo.phone,
      gender: personalInfo.gender,
      age: personalInfo.age,
      city: personalInfo.city.trim(),
    }
    
    // Include state if provided
    if (personalInfo.state && personalInfo.state.trim()) {
      requestBody.state = personalInfo.state.trim()
    }
    
    // Include issues if provided (should be an array)
    if (personalInfo.issues && Array.isArray(personalInfo.issues) && personalInfo.issues.length > 0) {
      requestBody.issues = personalInfo.issues
    } else {
      requestBody.issues = []
    }
    
    const response = await apiPost(
      '/patients/onboarding/personal-info',
      requestBody,
      { skipAuth: false, usePatientToken: true } // Requires patient auth token
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
 * Patient Login
 * Login with email and password for existing patients
 * @param {string} email - Patient email
 * @param {string} password - Patient password
 * @returns {Promise<{success: boolean, data: {patientId: string, token: string, email: string, name: string, onboardingStep: string}}>}
 */
export async function loginPatient(email, password) {
  try {
    const response = await apiPost(
      '/patients/login',
      {
        email: email.trim(),
        password,
      },
      { skipAuth: true, usePatientToken: false } // Login doesn't require auth token
    )

    // Store token in localStorage for subsequent requests
    if (response.data?.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('patient_token', response.data.token)
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
 * Fetch Patient by ID
 * Get a specific patient by their ID
 * @param {string} patientId - Patient UUID
 * @returns {Promise<{success: boolean, data: object}>}
 */
export async function fetchPatientProfile(patientId) {
  try {
    const response = await apiGet(`/patients/${patientId}`, {
      skipAuth: false,
      usePatientToken: true, // May or may not require auth, but include token if available
    })
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to fetch patient profile', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * Get Saved Doctors
 * Get all saved doctors for a patient
 * @param {string} patientId - Patient UUID
 * @returns {Promise<{success: boolean, data: array, count: number}>}
 */
export async function fetchSavedDoctors(patientId) {
  try {
    const response = await apiGet(`/patients/${patientId}/saved-doctors`, {
      skipAuth: false,
      usePatientToken: true, // Requires patient auth token
    })
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to fetch saved doctors', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * Save Doctor
 * Save a doctor to a patient's saved list
 * @param {string} patientId - Patient UUID
 * @param {string} doctorId - Doctor UUID
 * @returns {Promise<{success: boolean, data: {patientId: string, doctorId: string}}>}
 */
export async function saveDoctor(patientId, doctorId) {
  try {
    const response = await apiPost(
      '/patients/saved-doctors',
      {
        patientId,
        doctorId,
      },
      { skipAuth: false, usePatientToken: true } // Requires patient auth token
    )
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to save doctor', 0, 'UNKNOWN_ERROR')
  }
}

/**
 * Unsave Doctor
 * Remove a doctor from a patient's saved list
 * @param {string} patientId - Patient UUID
 * @param {string} doctorId - Doctor UUID
 * @returns {Promise<{success: boolean, data: {patientId: string, doctorId: string}}>}
 */
export async function unsaveDoctor(patientId, doctorId) {
  try {
    // Note: DELETE requests typically don't have a body, but the API docs show a body
    const response = await apiDelete(
      '/patients/saved-doctors',
      {
        patientId,
        doctorId,
      },
      { skipAuth: false, usePatientToken: true } // Requires patient auth token
    )
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Failed to unsave doctor', 0, 'UNKNOWN_ERROR')
  }
}

