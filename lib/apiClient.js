// Base API client for making authenticated requests
// Reads from NEXT_PUBLIC_BASE_ENDPOINT environment variable
// In your .env.local file, set: NEXT_PUBLIC_BASE_ENDPOINT=https://irehabcare-be.onrender.com

// Helper to safely get error logger function
// Uses lazy evaluation to avoid SSR issues and potential circular dependencies
function getErrorLogger() {
  if (typeof window === 'undefined') return null
  
  try {
    // Try to access the errorLogger module
    // Using a function to delay evaluation until needed
    const errorLoggerModule = require('./errorLogger')
    return errorLoggerModule?.logError || null
  } catch (e) {
    // Module not available or not yet initialized - that's okay
    return null
  }
}

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
 * @param {boolean} options.skipAuth - Skip adding Authorization header
 * @param {boolean} options.usePatientToken - Use patient_token instead of doctor_token
 * @returns {Promise<object>} Parsed JSON response
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  
  // Determine which token to use
  let token = null
  if (typeof window !== 'undefined') {
    if (options.usePatientToken) {
      token = localStorage.getItem('patient_token')
    } else {
      token = localStorage.getItem('doctor_token')
    }
  }

  // Public endpoints that should NEVER receive a token
  const PUBLIC_ENDPOINTS = [
    '/doctors/login',
    '/patients/login',
    '/doctors/onboarding/auth',
    '/patients/onboarding/auth',
    '/doctors/onboarding/verify-otp',
    '/patients/onboarding/verify-otp',
  ]

  // Check if endpoint is public
  const isPublicEndpoint = 
    PUBLIC_ENDPOINTS.includes(endpoint) || 
    endpoint.includes('/auth/google')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Add Authorization header if token exists and not explicitly disabled, AND not a public endpoint
  if (token && !options.skipAuth && !isPublicEndpoint) {
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
      const apiError = new ApiError(
        data.message || 'An error occurred',
        response.status,
        data.error || 'UNKNOWN_ERROR'
      )
      
      // Log API error with context (DO NOT log request body or auth headers)
      // Classify 401/403 as "api_auth" warnings, not errors
      const errorLoggerFn = getErrorLogger()
      if (errorLoggerFn && typeof window !== 'undefined') {
        try {
          // Determine severity and error type
          const status = response.status
          const isAuthError = status === 401 || status === 403
          const errorType = isAuthError ? 'api_auth' : 'api_error'
          const severity = isAuthError ? 'warning' : (status >= 500 ? 'error' : 'info')
          
          // Sanitize URL: only log path, not query params or full URL
          let safeUrl = endpoint || url
          try {
            const urlObj = new URL(url)
            safeUrl = urlObj.pathname // Only path, no query params
          } catch (e) {
            // If URL parsing fails, use endpoint (which is already just a path)
            safeUrl = endpoint || url
          }
          
          // Only log response snippet if it's a small, simple error message
          // Skip for 401/403 to reduce noise
          let responseSnippet = null
          if (!isAuthError) {
            try {
              const dataStr = JSON.stringify(data)
              // Only log if it's a small error message (likely safe)
              if (dataStr.length < 200 && (data.message || data.error)) {
                responseSnippet = dataStr.substring(0, 200)
              }
            } catch (e) {
              // Ignore
            }
          }
          
          errorLoggerFn(errorType, apiError, {
            errorType,
            severity,
            apiUrl: safeUrl, // Only path, no query params
            apiMethod: config.method || 'GET',
            apiStatus: status,
            apiResponseSnippet: responseSnippet, // May be null if sensitive or 401/403
            extra: {
              endpoint, // Safe: just the path
              errorCode: apiError.errorCode,
              // DO NOT include: request body, headers, tokens, cookies
            },
          })
        } catch (e) {
          // Silently fail - don't break error handling
        }
      }
      
      throw apiError
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    // Network or other errors
    const networkError = new ApiError(
      error.message || 'Network error. Please check your connection.',
      0,
      'NETWORK_ERROR'
    )
    
    // Log network errors (fetch patch will also catch these, but this provides more context)
    // DO NOT log request body or auth headers
    const errorLoggerFn = getErrorLogger()
    if (errorLoggerFn && typeof window !== 'undefined') {
      try {
        // Sanitize URL: only log path, not query params
        let safeUrl = endpoint || url
        try {
          const urlObj = new URL(url)
          safeUrl = urlObj.pathname // Only path, no query params
        } catch (e) {
          safeUrl = endpoint || url
        }
        
        errorLoggerFn('api_error', networkError, {
          apiUrl: safeUrl, // Only path, no query params
          apiMethod: config.method || 'GET',
          apiStatus: 0,
          extra: {
            endpoint, // Safe: just the path
            networkError: true,
            originalError: error.message,
            // DO NOT include: request body, headers, tokens, cookies
          },
        })
      } catch (e) {
        // Silently fail
      }
    }
    
    throw networkError
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

/**
 * DELETE request helper
 */
export async function apiDelete(endpoint, body, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  })
}

export { ApiError }

