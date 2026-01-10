import { NextResponse } from 'next/server'

/**
 * API Route: POST /api/feedback
 * Proxy endpoint to submit doctor feedback to Google Apps Script webhook
 * This avoids CORS issues by making the request server-side
 */
export async function POST(request) {
  try {
    // Get webhook URL from server-side environment variable (NOT NEXT_PUBLIC_)
    // This keeps the webhook URL out of the client bundle
    const webhookUrl = process.env.DOCTOR_FEEDBACK_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json(
        { ok: false, error: 'Feedback webhook URL is not configured' },
        { status: 500 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, screen, feedback } = body

    // Validate inputs
    if (!name || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!screen || !screen.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Screen name is required' },
        { status: 400 }
      )
    }

    if (!feedback || feedback.trim().length < 10) {
      return NextResponse.json(
        { ok: false, error: 'Feedback must be at least 10 characters' },
        { status: 400 }
      )
    }

    if (feedback.length > 1500) {
      return NextResponse.json(
        { ok: false, error: 'Feedback must not exceed 1500 characters' },
        { status: 400 }
      )
    }

    // Prepare request body - name, screen, and feedback as per contract
    const webhookBody = {
      name: name.trim(),
      screen: screen.trim(),
      feedback: feedback.trim(),
    }

    // Forward request to Google Apps Script webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookBody),
    })

    // Check if response is ok
    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorData = await response.text()
        // Check if it's JSON
        if (errorData.trim().startsWith('{')) {
          const parsed = JSON.parse(errorData)
          errorMessage = parsed.error || parsed.message || errorMessage
        }
      } catch (e) {
        // Ignore parsing errors
      }
      return NextResponse.json(
        { ok: false, error: errorMessage },
        { status: response.status }
      )
    }

    // Get response text first to check content type
    const responseText = await response.text()
    
    // Check if response is HTML (common with Google Apps Script errors)
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      return NextResponse.json(
        { ok: false, error: 'Webhook returned HTML instead of JSON. Please check the webhook configuration.' },
        { status: 500 }
      )
    }

    // Try to parse as JSON
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      // If it's not JSON but status is 200, assume success (some webhooks return plain text)
      if (response.status === 200) {
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON response from webhook' },
        { status: 500 }
      )
    }

    // Success condition: response JSON contains { ok: true }
    if (data && data.ok === true) {
      return NextResponse.json({ ok: true })
    }

    // If response doesn't have ok: true but status is 200, still consider it success
    // (some webhooks might return different format)
    if (response.status === 200) {
      return NextResponse.json({ ok: true })
    }

    // If response doesn't have ok: true, return error
    return NextResponse.json(
      { ok: false, error: 'Unexpected response format' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Feedback submission error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

