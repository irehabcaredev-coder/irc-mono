// Rehab AI Chat API Client
// Separate from main apiClient.js as it uses a different base URL and auth mechanism

const SESSION_TIMEOUT_MS = 10_000

function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_REHAB_AI_ENDPOINT || ''

  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    if (!baseUrl) {
      console.warn('[Rehab AI Client] NEXT_PUBLIC_REHAB_AI_ENDPOINT is not set')
    }
  }

  return baseUrl
}

const BASE_URL = getBaseUrl()

class RehabAIError extends Error {
  constructor(message, status, errorCode) {
    super(message)
    this.status = status
    this.errorCode = errorCode
    this.name = 'RehabAIError'
  }
}

/**
 * Makes a request to the Rehab AI API
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @param {string} options.sessionId - Session ID for x-session-id header
 * @param {boolean} options.stream - Whether to return raw response for streaming
 * @param {AbortSignal} options.signal - Optional AbortSignal for timeout/cancellation
 * @returns {Promise<object|Response>} Parsed JSON or raw Response for streaming
 */
async function rehabAIRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`

  const headers = {
    ...options.headers,
  }

  // Only set Content-Type for requests that carry a body
  if (options.method && options.method !== 'GET') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  // Add session ID header if provided
  if (options.sessionId) {
    headers['x-session-id'] = options.sessionId
  }

  const config = {
    ...options,
    headers,
  }

  // Remove custom options from config
  delete config.sessionId
  delete config.stream

  try {
    const response = await fetch(url, config)

    // For streaming responses, return the raw response
    if (options.stream) {
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new RehabAIError(
          data.message || 'An error occurred',
          response.status,
          data.error || 'UNKNOWN_ERROR'
        )
      }
      return response
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new RehabAIError(
        data.message || 'An error occurred',
        response.status,
        data.error || 'UNKNOWN_ERROR'
      )
    }

    return data
  } catch (error) {
    if (error instanceof RehabAIError) {
      throw error
    }

    // AbortError from timeout
    if (error.name === 'AbortError') {
      throw new RehabAIError(
        'Session request timed out. Please try again.',
        0,
        'TIMEOUT'
      )
    }

    throw new RehabAIError(
      error.message || 'Network error. Please check your connection.',
      0,
      'NETWORK_ERROR'
    )
  }
}

let _initCounter = 0

/**
 * Create a new AI chat session.
 * Always attaches patient JWT if available so the backend creates a signed-in session.
 * Enforces a hard timeout (10s) and structured logging.
 * @returns {Promise<{session_id: string, reference_type?: string, user_type?: string}>}
 */
export async function createSession() {
  const initAttemptId = ++_initCounter
  const headers = {}
  let hasAuth = false

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('patient_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      hasAuth = true
    }
  }

  const startTime = performance.now()

  console.info(`[Session] Init → attempt=${initAttemptId}`, {
    backendBaseUrl: BASE_URL,
    hasAuthHeader: hasAuth,
  })

  // Hard 10-second timeout via AbortController
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS)

  try {
    const response = await rehabAIRequest('/api/v1/session', {
      method: 'POST',
      headers,
      signal: controller.signal,
    })

    const durationMs = Math.round(performance.now() - startTime)

    console.info(`[Session] Init ← attempt=${initAttemptId}`, {
      sessionId: response.session_id,
      referenceType: response.reference_type,
      userType: response.user_type,
      hasAuthHeader: hasAuth,
      durationMs,
    })

    // Auth-mismatch detection:
    // If we sent a token but backend still says NON_SIGNED_IN_USER, flag it
    if (hasAuth && response.reference_type === 'NON_SIGNED_IN_USER') {
      throw new RehabAIError(
        'Authentication mismatch — your session was not recognized as signed-in. Please sign out and sign back in.',
        0,
        'AUTH_MISMATCH'
      )
    }

    return response
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime)
    console.error(`[Session] Init FAIL attempt=${initAttemptId}`, {
      status: err.status,
      errorCode: err.errorCode,
      message: err.message,
      hasAuthHeader: hasAuth,
      durationMs,
    })
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Delete an AI chat session
 * @param {string} sessionId - Session ID to delete
 * @returns {Promise<void>}
 */
export async function deleteSession(sessionId) {
  return rehabAIRequest('/api/v1/session', {
    method: 'DELETE',
    sessionId,
  })
}

/**
 * Send a chat message and get a streaming response
 * @param {string} sessionId - Session ID
 * @param {string} prompt - User message
 * @param {string} chatId - Chat conversation ID (optional, will create new if not provided)
 * @param {string} mode - Chat mode: 'chat' or 'image_analysis'
 * @param {string} imageData - Base64 encoded image data (for image_analysis mode)
 * @param {AbortSignal} [signal] - Optional AbortSignal for cancellation
 * @returns {Promise<Response>} Raw response for streaming
 */
export async function sendChatMessage(sessionId, prompt, chatId = null, mode = 'chat', imageData = null, signal = null) {
  const body = {
    prompt,
    mode,
  }

  if (chatId) {
    body.chat_id = chatId
  }

  if (imageData && mode === 'image_analysis') {
    body.image_data = imageData
  }

  const opts = {
    method: 'POST',
    sessionId,
    stream: true,
    body: JSON.stringify(body),
  }

  if (signal) {
    opts.signal = signal
  }

  return rehabAIRequest('/api/v1/chat', opts)
}

/**
 * Get chat history list for the session
 * @param {string} sessionId - Session ID
 * @returns {Promise<{chats: Array<{chat_id: string, title: string, created_at: string, updated_at: string}>}>}
 */
export async function getChatHistory(sessionId) {
  return rehabAIRequest('/api/v1/chat-history', {
    method: 'GET',
    sessionId,
  })
}

/**
 * Get messages for a specific chat
 * @param {string} sessionId - Session ID
 * @param {string} chatId - Chat ID
 * @param {number} page - Page number (default 1)
 * @param {number} pageSize - Page size (default 50)
 * @returns {Promise<{messages: Array<{role: string, content: string, timestamp: string}>, total: number, page: number, page_size: number}>}
 */
export async function getChatMessages(sessionId, chatId, page = 1, pageSize = 50) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  })

  return rehabAIRequest(`/api/v1/chat-history/${chatId}?${params}`, {
    method: 'GET',
    sessionId,
  })
}

/**
 * Async generator for processing streaming responses
 * @param {Response} response - Fetch response object
 * @yields {object} Parsed JSON chunks from the stream
 */
export async function* streamResponse(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            yield JSON.parse(buffer)
          } catch (e) {
            // Final chunk may not be valid JSON
          }
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Process complete JSON objects (assuming newline-delimited JSON)
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) {
          try {
            // Handle SSE format (data: {...})
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6)
              if (jsonStr !== '[DONE]') {
                yield JSON.parse(jsonStr)
              }
            } else {
              // Plain JSON
              yield JSON.parse(trimmed)
            }
          } catch (e) {
            // Skip malformed lines
            console.warn('[Rehab AI] Failed to parse stream chunk:', trimmed)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export { RehabAIError }
