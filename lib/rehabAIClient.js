// Rehab AI Chat API Client
// Separate from main apiClient.js as it uses a different base URL and auth mechanism

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
 * @returns {Promise<object|Response>} Parsed JSON or raw Response for streaming
 */
async function rehabAIRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
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

    const data = await response.json()

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

    throw new RehabAIError(
      error.message || 'Network error. Please check your connection.',
      0,
      'NETWORK_ERROR'
    )
  }
}

/**
 * Create a new AI chat session
 * @param {boolean} includePatientAuth - Whether to include patient JWT for authenticated features
 * @returns {Promise<{session_id: string}>}
 */
export async function createSession(includePatientAuth = false) {
  const headers = {}

  if (includePatientAuth && typeof window !== 'undefined') {
    const token = localStorage.getItem('patient_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  return rehabAIRequest('/api/v1/session', {
    method: 'POST',
    headers,
  })
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
 * @param {string} mode - Chat mode: 'general' or 'image_analysis'
 * @param {string} imageData - Base64 encoded image data (for image_analysis mode)
 * @returns {Promise<Response>} Raw response for streaming
 */
export async function sendChatMessage(sessionId, prompt, chatId = null, mode = 'general', imageData = null) {
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

  return rehabAIRequest('/api/v1/chat', {
    method: 'POST',
    sessionId,
    stream: true,
    body: JSON.stringify(body),
  })
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
