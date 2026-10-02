/**
 * Error Logger API Route
 * 
 * Server-side proxy that forwards error logs to Google Apps Script.
 * This route sanitizes sensitive data before forwarding.
 * 
 * Environment variable (server-side only, NOT NEXT_PUBLIC_):
 * ERROR_LOGGER_WEBHOOK_URL=https://script.google.com/macros/s/...
 */

// Maximum payload size (100KB) to prevent abuse
const MAX_PAYLOAD_SIZE = 100 * 1024

// Sensitive keys to redact
const SENSITIVE_KEYS = [
  'password',
  'pass',
  'pwd',
  'otp',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'auth',
  'x-reset-token',
  'secret',
  'apiKey',
  'apikey',
  'api_key',
  'bearer',
  'cookie',
  'session',
  'sessionid',
]

/**
 * Check if a string contains sensitive patterns
 */
function containsSensitiveData(str) {
  if (!str || typeof str !== 'string') return false
  
  const lowerStr = str.toLowerCase()
  return SENSITIVE_KEYS.some(key => lowerStr.includes(key))
}

/**
 * Sanitize a string by redacting sensitive patterns
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') return str
  
  let sanitized = str
  
  // Redact common patterns like "password: xxx" or "token=xxx"
  SENSITIVE_KEYS.forEach(key => {
    const regex = new RegExp(`(${key}[=: ]+)([^\\s&"']+)`, 'gi')
    sanitized = sanitized.replace(regex, `$1[REDACTED]`)
  })
  
  // Redact JWT tokens (base64-like strings)
  sanitized = sanitized.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
  
  // Redact long hex strings that might be tokens
  sanitized = sanitized.replace(/\b[0-9a-f]{32,}\b/gi, '[REDACTED_TOKEN]')
  
  return sanitized
}

/**
 * Sanitize URL by removing ALL query parameters (privacy requirement)
 * Only keep the pathname to avoid any sensitive data in query params
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return url
  
  try {
    const urlObj = new URL(url)
    // Remove ALL query params - only keep pathname
    urlObj.search = ''
    urlObj.hash = '' // Also remove hash
    return urlObj.toString()
  } catch (e) {
    // If URL parsing fails, try to extract just the path
    try {
      const match = url.match(/^https?:\/\/[^\/]+(\/[^?#]*)/)
      if (match) {
        return match[1] // Return just the path
      }
    } catch (e2) {
      // If all else fails, sanitize as string
      return sanitizeString(url)
    }
    return sanitizeString(url)
  }
}

/**
 * Sanitize the error payload
 */
function sanitizePayload(data) {
  if (!data || typeof data !== 'object') return data
  
  const sanitized = { ...data }
  
  // Sanitize message
  if (sanitized.message) {
    sanitized.message = sanitizeString(sanitized.message)
  }
  
  // Sanitize stack
  if (sanitized.stack) {
    sanitized.stack = sanitizeString(sanitized.stack)
  }
  
  // Sanitize pageUrl
  if (sanitized.pageUrl) {
    sanitized.pageUrl = sanitizeUrl(sanitized.pageUrl)
  }
  
  // Sanitize apiUrl
  if (sanitized.apiUrl) {
    sanitized.apiUrl = sanitizeUrl(sanitized.apiUrl)
  }
  
  // Sanitize apiResponseSnippet
  if (sanitized.apiResponseSnippet) {
    sanitized.apiResponseSnippet = sanitizeString(sanitized.apiResponseSnippet)
  }
  
  // Sanitize extra JSON if it's a string
  if (sanitized.extra && typeof sanitized.extra === 'string') {
    try {
      const extraObj = JSON.parse(sanitized.extra)
      const sanitizedExtra = {}
      for (const [key, value] of Object.entries(extraObj)) {
        const lowerKey = key.toLowerCase()
        if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
          sanitizedExtra[key] = '[REDACTED]'
        } else if (typeof value === 'string' && containsSensitiveData(value)) {
          sanitizedExtra[key] = sanitizeString(value)
        } else {
          sanitizedExtra[key] = value
        }
      }
      sanitized.extra = JSON.stringify(sanitizedExtra)
    } catch (e) {
      // If parsing fails, sanitize as string
      sanitized.extra = sanitizeString(sanitized.extra)
    }
  }
  
  // Add server timestamp
  sanitized.triggeredAtServer = new Date().toISOString()
  
  return sanitized
}

export async function POST(request) {
  try {
    const gasUrl = process.env.ERROR_LOGGER_WEBHOOK_URL
    
    if (!gasUrl) {
      // In development, log a warning but don't fail
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ErrorLogger API] ERROR_LOGGER_WEBHOOK_URL not set')
      }
      // Return success to client even if not configured (fail silently)
      return Response.json({ ok: true })
    }
    
    // Get the error data from the request
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return Response.json({ ok: false, error: 'Invalid content type' }, { status: 400 })
    }
    
    // Read body with size limit
    const text = await request.text()
    if (text.length > MAX_PAYLOAD_SIZE) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ErrorLogger API] Payload too large:', text.length)
      }
      return Response.json({ ok: false, error: 'Payload too large' }, { status: 413 })
    }
    
    let errorData
    try {
      errorData = JSON.parse(text)
    } catch (e) {
      return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
    }
    
    // Sanitize the payload
    const sanitizedPayload = sanitizePayload(errorData)
    
    // Forward to Google Apps Script
    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedPayload),
      })
      
      // Always return success to client, even if forwarding fails
      // Log server-side errors for debugging
      if (!response.ok) {
        const errorText = await response.text()
        if (process.env.NODE_ENV === 'development') {
          console.error('[ErrorLogger API] GAS request failed:', response.status, errorText)
        } else {
          console.error('[ErrorLogger API] GAS request failed:', response.status)
        }
      }
      
      return Response.json({ ok: true })
    } catch (fetchError) {
      // Log server error but return success to client
      if (process.env.NODE_ENV === 'development') {
        console.error('[ErrorLogger API] Fetch error:', fetchError.message)
      } else {
        console.error('[ErrorLogger API] Failed to forward error log')
      }
      return Response.json({ ok: true })
    }
  } catch (error) {
    // Log server error but return success to client (fail silently)
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorLogger API] Error:', error.message)
    } else {
      console.error('[ErrorLogger API] Unexpected error processing log')
    }
    return Response.json({ ok: true })
  }
}
