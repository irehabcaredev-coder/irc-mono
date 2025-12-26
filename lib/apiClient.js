// Base API client for making authenticated requests
// Reads from NEXT_PUBLIC_BASE_ENDPOINT environment variable
// In your .env.local file, set: NEXT_PUBLIC_BASE_ENDPOINT=https://ecareplus-be.onrender.com
function getBaseUrl() {
  // Check for the environment variable (must be prefixed with NEXT_PUBLIC_ for client-side access)
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_ENDPOINT ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000'

  // Log in development to help debug
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.log('[API Client] Base URL:', baseUrl)
    if (baseUrl === 'http://localhost:3000') {
      console.warn(
        '[API Client] Using default localhost:3000. Set NEXT_PUBLIC_BASE_ENDPOINT in .env.local to use a different URL.'
      )
    }
  }

  return baseUrl
}

const BASE_URL = getBaseUrl()

class ApiError extends Error {
  constructor(message, status, errorCode) {
    super(message)
    this.status = status
    this.errorCode = errorCode
    this.name = 'ApiError'
  }
}

/**
 * Makes an API request with automatic token injection
 * @param {string} endpoint - API endpoint (e.g., '/doctors/onboarding/auth')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Parsed JSON response
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const token = typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Add Authorization header if token exists and not explicitly disabled
  if (token && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config = {
    ...options,
    headers,
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(
        data.message || 'An error occurred',
        response.status,
        data.error || 'UNKNOWN_ERROR'
      )
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    // Network or other errors
    throw new ApiError(
      error.message || 'Network error. Please check your connection.',
      0,
      'NETWORK_ERROR'
    )
  }
}

/**
 * GET request helper
 */
export async function apiGet(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'GET' })
}

/**
 * POST request helper
 */
export async function apiPost(endpoint, body, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * PATCH request helper
 */
export async function apiPatch(endpoint, body, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/**
 * PUT request helper
 */
export async function apiPut(endpoint, body, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export { ApiError }

