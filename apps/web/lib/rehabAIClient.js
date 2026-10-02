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
        data.message || data.error || 'An error occurred',
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
 * Get the patient JWT token from localStorage
 * @returns {string|null} The JWT token if it exists, null otherwise
 */
function getPatientToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('patient_token') || null
}

/**
 * Create a new AI chat session.
 *
 * Anonymous:     POST /api/v1/session  (no auth headers)
 * Authenticated: POST /api/v1/session  + Authorization: Bearer <jwt>
 *
 * @param {boolean} isAuthenticated - true if the user is logged in
 * @returns {Promise<{session_id: string}>}
 */
export async function createSession(isAuthenticated = false) {
  const headers = {}

  if (isAuthenticated) {
    const token = getPatientToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    } else {
      console.warn('[Rehab AI Client] Authenticated session requested but no JWT token found — falling back to anonymous session')
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
 * Send a chat message and get a streaming response.
 *
 * POST /api/v1/chat
 * Headers: Content-Type: application/json, x-session-id: <session-id>
 * Body: { "prompt": "...", "mode": "chat" | "image_analysis", "chat_id?": "...", "image_data?": "..." }
 *
 * @param {string} sessionId - Session ID (sent as x-session-id header)
 * @param {string} prompt - User message
 * @param {string} chatId - Chat conversation ID (optional, will create new if not provided)
 * @param {string} mode - Chat mode: 'chat' or 'image_analysis'
 * @param {string} imageData - Base64 encoded image data (for image_analysis mode)
 * @returns {Promise<Response>} Raw response for streaming
 */
export async function sendChatMessage(sessionId, prompt, chatId = null, mode = 'chat', imageData = null) {
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
 * Send a chat message with a file attachment.
 *
 * POST /api/v1/chat/file
 * Headers: x-session-id: <session-id>
 * Body (multipart/form-data): prompt, file, chat_id?
 *
 * Response: streaming plain-text body; X-Chat-Id header contains the conversation ID.
 * Supported file types: jpg, jpeg, png, pdf (max 5 MB recommended).
 * Error codes: 401 = session expired (re-create session), 403 = 100-analysis limit hit.
 *
 * @param {string} sessionId - Session ID (sent as x-session-id header)
 * @param {string} prompt - User's question/instruction (1–10,000 chars)
 * @param {File} file - File attachment (jpg/jpeg/png/pdf)
 * @param {string|null} chatId - Existing chat ID for follow-up messages; null to start a new chat
 * @param {AbortSignal|null} signal - Optional AbortSignal for cancellation
 * @returns {Promise<Response>} Raw streaming response
 */
export async function sendChatFileMessage(sessionId, prompt, file, chatId = null, signal = null) {
  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('file', file)
  if (chatId) {
    formData.append('chat_id', chatId)
  }

  const fetchOptions = {
    method: 'POST',
    headers: {
      'x-session-id': sessionId,
    },
    body: formData,
  }

  if (signal) {
    fetchOptions.signal = signal
  }

  const response = await fetch(`${BASE_URL}/api/v1/chat/file`, fetchOptions)

  if (!response.ok) {
    let data = {}
    try {
      data = await response.json()
    } catch (e) {
      data = {}
    }
    throw new RehabAIError(
      data.message || data.error || 'An error occurred',
      response.status,
      data.error || 'UNKNOWN_ERROR'
    )
  }

  return response
}

/**
 * Get chat history list for the session
 * @param {string} sessionId - Session ID
 * @returns {Promise<{chats: Array<{chat_id: string, title: string, created_at: string, updated_at: string}>}>}
 */
export async function getChatHistory(sessionId) {
  const data = await rehabAIRequest('/api/v1/chat-history', {
    method: 'GET',
    sessionId,
  })

  // Backend may return either { chats: [...] } or raw array [...]
  if (Array.isArray(data)) {
    return { chats: data }
  }

  return { chats: Array.isArray(data?.chats) ? data.chats : [] }
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

  const data = await rehabAIRequest(`/api/v1/chat-history/${chatId}?${params}`, {
    method: 'GET',
    sessionId,
  })

  // Backend variants:
  // 1) { messages: [...] , total, page, page_size }
  // 2) [...]
  // 3) { data: [...] }
  const normalizedMessages = Array.isArray(data)
    ? data
    : Array.isArray(data?.messages)
      ? data.messages
      : Array.isArray(data?.data)
        ? data.data
        : []

  return {
    ...((data && typeof data === 'object' && !Array.isArray(data)) ? data : {}),
    messages: normalizedMessages,
  }
}

/**
 * Async generator for processing streaming responses.
 * Handles three response formats:
 *   1. SSE format:  data: {"content": "..."}
 *   2. Newline-delimited JSON: {"content": "..."}
 *   3. Plain text:  Hello! How can I help you?
 *
 * For plain text, each text chunk is yielded as { content: text }.
 *
 * @param {Response} response - Fetch response object
 * @yields {object} Parsed chunks from the stream
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
          yield parseChunk(buffer.trim())
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Process complete lines (split by newline)
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) {
          yield parseChunk(trimmed)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Parse a single chunk from the stream.
 * Tries SSE → JSON → falls back to plain text.
 * @param {string} chunk - Raw string chunk
 * @returns {object} Parsed chunk object
 */
function parseChunk(chunk) {
  // 1. SSE format: "data: {...}" or "data: [DONE]"
  if (chunk.startsWith('data: ')) {
    const payload = chunk.slice(6)
    if (payload === '[DONE]') {
      return { done: true }
    }
    try {
      return JSON.parse(payload)
    } catch (e) {
      // SSE with non-JSON payload — treat as plain text
      return { content: payload }
    }
  }

  // 2. Try plain JSON
  try {
    return JSON.parse(chunk)
  } catch (e) {
    // 3. Plain text — wrap so the hook can read chunk.content
    return { content: chunk }
  }
}

export { RehabAIError }
