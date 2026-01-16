/**
 * Error & Session Logger
 * 
 * Captures runtime errors, promise rejections, API errors, and user interactions.
 * Sends error reports to our own API route (/api/log-error) which forwards to Google Apps Script.
 * 
 * This module is designed to be fail-safe and never throw errors itself.
 * Never captures sensitive data: passwords, OTPs, tokens, or input values.
 */

// Ring buffer for user actions (last 20)
const USER_ACTIONS_BUFFER_SIZE = 20
const userActions = []

// Flag to prevent recursion - when we're sending logs, don't log our own requests
let isLogging = false

// Flag to track if fetch has been patched (prevent double-wrapping)
let fetchPatched = false

// Known auth endpoints where 401/403 should not be logged (only recorded in userActions)
const AUTH_ENDPOINTS = [
  '/doctors/login',
  '/doctors/onboarding/auth',
  '/patients/login',
  '/auth/login',
  '/login',
]

/**
 * Check if URL is an auth endpoint
 */
function isAuthEndpoint(url) {
  if (!url || typeof url !== 'string') return false
  const urlStr = url.toLowerCase()
  return AUTH_ENDPOINTS.some(endpoint => urlStr.includes(endpoint.toLowerCase()))
}

/**
 * Get a short selector for an element (tag, id, classes)
 * Does not include innerText or any text content to avoid sensitive data
 */
function getElementSelector(element) {
  if (!element || !element.tagName) return 'unknown'
  
  const parts = [element.tagName.toLowerCase()]
  
  if (element.id) {
    parts.push(`#${element.id}`)
  }
  
  // Add first 2 classes if available
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(/\s+/).filter(Boolean).slice(0, 2)
    if (classes.length > 0) {
      parts.push(`.${classes.join('.')}`)
    }
  }
  
  return parts.join('')
}

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') return false
  
  const lowerName = fieldName.toLowerCase()
  const sensitivePatterns = [
    'password',
    'pass',
    'pwd',
    'otp',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'auth',
    'reset-token',
    'secret',
    'apikey',
    'api_key',
    'bearer',
    'cookie',
    'session',
  ]
  
  return sensitivePatterns.some(pattern => lowerName.includes(pattern))
}

/**
 * Check if a URL should be excluded from logging
 */
function shouldExcludeUrl(url) {
  if (!url || typeof url !== 'string') return false
  
  const urlStr = url.toString().toLowerCase()
  
  // Never log requests to our own logging endpoint
  if (urlStr.includes('/api/log-error')) return true
  
  // Never log requests to Google Apps Script
  if (urlStr.includes('script.google.com')) return true
  if (urlStr.includes('macros/s/')) return true
  if (urlStr.includes('/exec')) return true
  
  return false
}

/**
 * Record a user action
 * Never captures input values, only metadata
 */
function recordUserAction(type, details = {}) {
  try {
    const action = {
      type,
      timestamp: new Date().toISOString(),
      ...details,
    }
    
    // Ensure we never store input values
    delete action.value
    delete action.inputValue
    delete action.text
    
    userActions.push(action)
    
    // Keep only last N actions
    if (userActions.length > USER_ACTIONS_BUFFER_SIZE) {
      userActions.shift()
    }
  } catch (e) {
    // Silently fail - don't break the app
  }
}

/**
 * Get current route/screen
 */
function getCurrentScreen() {
  try {
    if (typeof window === 'undefined') return 'unknown'
    return window.location.pathname || 'unknown'
  } catch (e) {
    return 'unknown'
  }
}

/**
 * Get a summary of the last user action
 */
function getUserActionSummary() {
  try {
    if (userActions.length === 0) return 'none'
    
    const lastAction = userActions[userActions.length - 1]
    if (!lastAction) return 'none'
    
    const parts = [lastAction.type]
    
    if (lastAction.selector) {
      parts.push(`on ${lastAction.selector}`)
    }
    
    if (lastAction.fieldName) {
      parts.push(`field: ${lastAction.fieldName}`)
    }
    
    return parts.join(' ')
  } catch (e) {
    return 'unknown'
  }
}

/**
 * Sanitize URL by removing query parameters (client-side basic sanitization)
 * Full sanitization happens server-side
 */
function sanitizeUrlForLogging(url) {
  if (!url || typeof url !== 'string') return url
  
  try {
    const urlObj = new URL(url)
    // Only log the pathname, not query params (server will sanitize further)
    return urlObj.pathname
  } catch (e) {
    // If URL parsing fails, return as-is (server will sanitize)
    return url
  }
}

/**
 * Determine error severity and type based on status code
 */
function getErrorSeverityAndType(status) {
  if (status === 401 || status === 403) {
    return { errorType: 'api_auth', severity: 'warning' }
  }
  
  if (status >= 500) {
    return { errorType: 'api_error', severity: 'error' }
  }
  
  if (status >= 400) {
    return { errorType: 'api_error', severity: 'info' }
  }
  
  return { errorType: 'api_error', severity: 'error' }
}

/**
 * Send error report to our API route (same origin)
 * The API route will forward to Google Apps Script server-side
 * NEVER calls script.google.com directly
 */
async function sendErrorReport(errorData) {
  // Prevent recursion - don't log our own logging requests
  if (isLogging) return
  
  try {
    isLogging = true
    
    // ALWAYS use same-origin API route - NEVER call script.google.com
    const apiUrl = '/api/log-error'
    
    const payload = JSON.stringify(errorData)
    
    // Prefer sendBeacon for reliability (especially on page unload)
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: 'application/json' })
        const sent = navigator.sendBeacon(apiUrl, blob)
        if (sent) {
          isLogging = false
          return // Success
        }
      } catch (e) {
        // Continue to fetch fallback
      }
    }
    
    // Fallback to fetch - ONLY to /api/log-error (same origin)
    try {
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
        keepalive: true, // Important for reliability
      })
    } catch (e) {
      // Silently fail - don't break the app
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ErrorLogger] Failed to send error report:', e.message)
      }
    } finally {
      isLogging = false
    }
  } catch (e) {
    // Silently fail - don't break the app or create error loops
    isLogging = false
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ErrorLogger] Error sending report:', e.message)
    }
  }
}

/**
 * Log an error
 */
function logError(errorType, error, context = {}) {
  try {
    // Prevent logging if we're currently sending a log (avoid recursion)
    if (isLogging) return
    
    const errorData = {
      screen: getCurrentScreen(),
      pageUrl: typeof window !== 'undefined' ? window.location.href : 'unknown',
      errorType: context.errorType || errorType,
      severity: context.severity || 'error',
      message: error?.message || String(error) || 'Unknown error',
      stack: error?.stack || error?.error?.stack || 'No stack trace',
      apiUrl: context.apiUrl ? sanitizeUrlForLogging(context.apiUrl) : null,
      apiMethod: context.apiMethod || null,
      apiStatus: context.apiStatus || null,
      apiResponseSnippet: context.apiResponseSnippet || null,
      userAction: getUserActionSummary(),
      userActions: JSON.stringify(userActions),
      triggeredAtClient: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
      extra: JSON.stringify(context.extra || {}),
    }
    
    sendErrorReport(errorData)
  } catch (e) {
    // Silently fail - don't break the app
  }
}

/**
 * Patch window.fetch to capture API errors
 * Does NOT log request bodies or auth headers
 * Does NOT log requests to /api/log-error or script.google.com
 * Immediately returns originalFetch for excluded URLs (no logging path)
 */
function patchFetch() {
  try {
    if (typeof window === 'undefined' || !window.fetch) return
    
    // Prevent double-wrapping
    if (fetchPatched) return
    
    // Check if fetch has already been patched (has a custom property)
    if (window.fetch._errorLoggerPatched) {
      fetchPatched = true
      return
    }
    
    const originalFetch = window.fetch
    
    window.fetch = async function (...args) {
      const [url, options = {}] = args
      const method = options.method || 'GET'
      const urlString = typeof url === 'string' ? url : url?.toString() || ''
      
      // CRITICAL: Immediately return originalFetch for excluded URLs (no logging path at all)
      // This prevents any possibility of logging our own requests
      if (shouldExcludeUrl(urlString) || isLogging) {
        return originalFetch.apply(this, args)
      }
      
      try {
        const response = await originalFetch.apply(this, args)
        
        // Only log non-2xx responses, and only if not excluded
        if (response.status >= 400) {
          const isAuth = response.status === 401 || response.status === 403
          const isAuthEndpointUrl = isAuthEndpoint(urlString)
          
          // For 401/403 on auth endpoints: only record in userActions, don't send to sheet
          if (isAuth && isAuthEndpointUrl) {
            recordUserAction('api_auth_failure', {
              endpoint: sanitizeUrlForLogging(urlString),
              status: response.status,
            })
            return response // Don't log to sheet, just record locally
          }
          
          // Determine severity and error type
          const { errorType, severity } = getErrorSeverityAndType(response.status)
          
          // Only log safe metadata: path (no query), method, status
          // Do NOT log request body or headers
          let responseSnippet = null
          
          // Try to get a small response snippet ONLY if it's clearly non-sensitive
          // Skip for 401/403 to reduce noise
          if (!isAuth) {
            try {
              const contentType = response.headers.get('content-type') || ''
              // Only try to read JSON error responses (not HTML, images, etc.)
              if (contentType.includes('application/json')) {
                const text = await response.clone().text()
                // Only log if it's a small error message (likely safe)
                if (text.length < 200) {
                  // Check if it looks like a simple error message
                  try {
                    const json = JSON.parse(text)
                    // Only log if it's a simple error object with message/error fields
                    if (json.message || json.error) {
                      responseSnippet = text.substring(0, 200)
                    }
                  } catch (e) {
                    // Not JSON or parse failed, skip logging response
                  }
                }
              }
            } catch (e) {
              // Ignore errors reading response
            }
          }
          
          logError(errorType, new Error(`API ${errorType}: ${response.status} ${response.statusText}`), {
            errorType,
            severity,
            apiUrl: sanitizeUrlForLogging(urlString),
            apiMethod: method,
            apiStatus: response.status,
            apiResponseSnippet: responseSnippet, // May be null if sensitive or 401/403
          })
        }
        
        return response
      } catch (error) {
        // Network failures - only log if not excluded
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          logError('api_error', error, {
            errorType: 'api_error',
            severity: 'error',
            apiUrl: sanitizeUrlForLogging(urlString),
            apiMethod: method,
            apiStatus: 0,
            extra: { networkError: true },
          })
        }
        
        throw error
      }
    }
    
    // Mark as patched to prevent double-wrapping
    window.fetch._errorLoggerPatched = true
    fetchPatched = true
  } catch (e) {
    // Silently fail - don't break the app
  }
}

/**
 * Initialize error logger
 * HARD INIT GUARD: Only initialize once, even in React Strict Mode
 */
export function initErrorLogger() {
  try {
    // Only run in browser
    if (typeof window === 'undefined') return
    
    // HARD INIT GUARD: Prevent double-initialization in React Strict Mode
    if (window.__eCareErrorLoggerInitialized) {
      return
    }
    window.__eCareErrorLoggerInitialized = true
    
    // Patch fetch (only once)
    patchFetch()
    
    // Listen to window errors
    window.addEventListener('error', (event) => {
      logError('window.onerror', event.error || event.message, {
        errorType: 'window.onerror',
        severity: 'error',
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    })
    
    // Listen to unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logError('unhandledrejection', event.reason, {
        errorType: 'unhandledrejection',
        severity: 'error',
        extra: {
          promiseRejection: true,
        },
      })
    })
    
    // Track route changes (Next.js App Router)
    // Listen to popstate for browser back/forward
    window.addEventListener('popstate', () => {
      recordUserAction('route_change', {
        route: getCurrentScreen(),
        type: 'popstate',
      })
    })
    
    // Track hash changes
    window.addEventListener('hashchange', () => {
      recordUserAction('route_change', {
        route: getCurrentScreen(),
        type: 'hashchange',
      })
    })
    
    // Track clicks
    document.addEventListener('click', (event) => {
      const element = event.target
      recordUserAction('click', {
        selector: getElementSelector(element),
        tagName: element?.tagName?.toLowerCase(),
      })
    }, true) // Use capture phase to catch all clicks
    
    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target
      recordUserAction('submit', {
        selector: getElementSelector(form),
        formId: form?.id || null,
        formAction: form?.action ? sanitizeUrlForLogging(form.action) : null,
      })
    }, true)
    
    // Track input changes (but NEVER the values)
    document.addEventListener('input', (event) => {
      const element = event.target
      const fieldName = element?.name || element?.id || ''
      
      // Skip sensitive fields entirely
      if (isSensitiveField(fieldName) || 
          element?.type === 'password' || 
          element?.autocomplete === 'off' ||
          element?.type === 'email') {
        // Don't record sensitive input events at all
        return
      }
      
      // For non-sensitive fields, only record metadata
      recordUserAction('input', {
        selector: getElementSelector(element),
        fieldName: fieldName || 'unknown',
        fieldType: element?.type || 'text',
        changed: true, // Just indicate that it changed, NEVER the value
      })
    }, true)
    
  } catch (e) {
    // Silently fail - don't break the app
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorLogger] Initialization error:', e)
    }
  }
}

// Export for manual logging if needed
export { logError, recordUserAction }
