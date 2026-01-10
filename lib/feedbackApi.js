/**
 * Doctor Feedback API Functions
 * Submits feedback via Next.js API route (proxy) to avoid CORS issues
 */

/**
 * Submit doctor feedback via API proxy route
 * @param {object} params - Feedback parameters
 * @param {string} params.name - Doctor name
 * @param {string} params.screen - Screen name (auto-detected from pathname)
 * @param {string} params.feedback - Feedback text (min 10 chars, max 1500 chars)
 * @returns {Promise<{ok: boolean}>}
 */
export async function submitDoctorFeedback({ name, screen, feedback }) {
  // Validate inputs client-side
  if (!name || !name.trim()) {
    throw new Error('Name is required')
  }

  if (!screen || !screen.trim()) {
    throw new Error('Screen name is required')
  }

  if (!feedback || feedback.trim().length < 10) {
    throw new Error('Feedback must be at least 10 characters')
  }

  if (feedback.length > 1500) {
    throw new Error('Feedback must not exceed 1500 characters')
  }

  // Note: Webhook URL is configured server-side only (not exposed to client)
  // The API route will handle the configuration check

  // Prepare request body - name, screen, and feedback as per contract
  const body = {
    name: name.trim(),
    screen: screen.trim(),
    feedback: feedback.trim(),
  }

  try {
    // Call our Next.js API route (same origin, no CORS issues)
    // The API route will proxy to the Google Apps Script webhook
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    // Get response text first to check if it's JSON
    const responseText = await response.text()
    
    // Check if response is HTML (shouldn't happen with our API route, but handle it)
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      throw new Error('Server returned HTML instead of JSON. Please try again or contact support.')
    }

    // Parse JSON response
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      throw new Error('Invalid response format. Please try again.')
    }

    // Check if response is ok
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }

    // Success condition: response JSON contains { ok: true }
    if (data && data.ok === true) {
      return { ok: true }
    }

    // If response doesn't have ok: true, throw error
    throw new Error(data.error || 'Unexpected response format')
  } catch (error) {
    // Re-throw with more context if needed
    if (error.message.includes('HTTP error')) {
      throw error
    }
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Network error. Please check your connection and try again.')
    }
    // If it's already a formatted error, re-throw as-is
    if (error.message) {
      throw error
    }
    throw new Error('An unexpected error occurred. Please try again.')
  }
}

