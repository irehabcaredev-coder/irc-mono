# Error & Session Logger

## Overview

The Error & Session Logger is a lightweight client-side logging system that captures runtime errors, API failures, and user interactions to help debug issues in production.

**Architecture:**
```
Client Browser → /api/log-error (same origin) → Google Apps Script → Google Sheet
```

All error logs are routed through our own API route (`/api/log-error`) to avoid ad blocker issues and ensure privacy. The server-side route forwards logs to Google Apps Script.

## What Gets Logged

The logger automatically captures:

1. **Runtime Errors**
   - JavaScript errors caught by `window.onerror`
   - Unhandled promise rejections

2. **API Errors**
   - Failed fetch requests (network failures)
   - HTTP responses with status >= 400
   - Errors from the `apiClient.js` wrapper

3. **User Context**
   - Current route/screen (pathname)
   - Last 20 user actions (clicks, form submissions, input changes, route changes)
   - User agent and referrer information

## Privacy & Security

**Critical Privacy Guarantees:**

- ✅ **NEVER captures sensitive data:**
  - Passwords are never logged
  - OTP/PIN fields are completely excluded
  - Email fields are excluded from input tracking
  - Input values are NEVER captured (only field names and that a change occurred)
  - Tokens, API keys, and authorization headers are never logged
  - Request bodies are never logged
  - Cookies are never logged

- ✅ **Automatic sanitization:**
  - URLs are sanitized (query parameters with sensitive keys are redacted)
  - Error messages and stack traces are sanitized to remove sensitive patterns
  - Response snippets are only logged if they're small, simple error messages
  - All sensitive keys are redacted: password, pass, pwd, otp, token, accessToken, refreshToken, authorization, auth, x-reset-token, secret, apiKey

- ✅ **What IS captured (safe metadata only):**
  - Element selectors (tag, id, classes) for clicks
  - Field names for inputs (not values)
  - Route changes
  - Error messages and stack traces (sanitized)
  - API paths (not query params or full URLs)
  - HTTP method and status codes
  - Small error response snippets (only if clearly non-sensitive)

## Data Fields

Each error report includes:

| Field | Description |
|-------|-------------|
| `screen` | Current route/path (e.g., `/dashboard/profile`) |
| `pageUrl` | Full URL of the page (sanitized) |
| `errorType` | Type of error (`window.onerror`, `unhandledrejection`, `api_error`) |
| `message` | Error message (sanitized) |
| `stack` | Stack trace (sanitized) |
| `apiUrl` | API endpoint path only (no query params) |
| `apiMethod` | HTTP method |
| `apiStatus` | HTTP status code |
| `apiResponseSnippet` | Small error response snippet (only if safe, may be null) |
| `userAction` | Summary of last user action |
| `userActions` | JSON array of last 20 user actions |
| `triggeredAtClient` | ISO timestamp when error occurred (client) |
| `triggeredAtServer` | ISO timestamp when logged (server) |
| `userAgent` | Browser user agent string |
| `referrer` | Referrer URL |
| `extra` | Additional context (JSON, sanitized) |

## Setup

### 1. Environment Variables

Add to your `.env.local` file (server-side only, **NOT** `NEXT_PUBLIC_`):

```bash
ERROR_LOGGER_WEBHOOK_URL=https://script.google.com/macros/s/AKfycbzGSlM0EgCjdok2cZktJIFxlVM0WFUDXaJJMPSw5uDnViz-PVnY4FNr8b2VFc3HsSTt/exec
```

**Important:** This is a server-side environment variable. The client never sees or calls the Google Apps Script URL directly. All requests go through `/api/log-error` (same origin).

### 2. Google Apps Script Setup

Create a Google Apps Script Web App that receives POST requests and appends to a Google Sheet.

**Spreadsheet Details:**
- Spreadsheet ID: `1uzd22cFR_yHwaxipj8d5Stg8i-Y5g5jP552BerGEtzs`
- Sheet name: `errors`

**Sample Google Apps Script Code:**

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.openById('1uzd22cFR_yHwaxipj8d5Stg8i-Y5g5jP552BerGEtzs')
      .getSheetByName('errors');
    
    // Parse JSON body
    const data = JSON.parse(e.postData.contents);
    
    const row = [
      data.screen || '',
      data.pageUrl || '',
      data.errorType || '',
      data.message || '',
      data.stack || '',
      data.apiUrl || '',
      data.apiMethod || '',
      data.apiStatus || '',
      data.apiResponseSnippet || '',
      data.userAction || '',
      data.userActions || '',
      data.triggeredAtClient || '',
      data.triggeredAtServer || '',
      data.userAgent || '',
      data.referrer || '',
      data.extra || ''
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}
```

**Deployment Steps:**
1. Create a new Google Apps Script project
2. Paste the code above
3. Deploy as a Web App:
   - Execute as: "Me"
   - Who has access: "Anyone"
4. Copy the Web App URL and set it as `ERROR_LOGGER_WEBHOOK_URL` in `.env.local`

### 3. Google Sheet Setup

Create a sheet named `errors` with the following headers (in order):

```
screen | pageUrl | errorType | message | stack | apiUrl | apiMethod | apiStatus | apiResponseSnippet | userAction | userActions | triggeredAtClient | triggeredAtServer | userAgent | referrer | extra
```

## How It Works

1. **Initialization**: The logger is initialized automatically when the app loads via `ErrorLoggerInit` component in the root layout.

2. **Error Capture**: 
   - Global error handlers listen for `error` and `unhandledrejection` events
   - `window.fetch` is patched to intercept API calls
   - `apiClient.js` also logs errors with additional context

3. **User Action Tracking**:
   - Click events (captures element selector, no text content)
   - Form submissions (captures form selector)
   - Input changes (captures field name, NEVER the value)
   - Route changes (via `popstate` and `hashchange` events)

4. **Privacy Protection**:
   - Sensitive fields (password, OTP, token, etc.) are never tracked
   - Input values are never captured
   - URLs are sanitized to remove query parameters
   - Error messages and stacks are sanitized

5. **Error Reporting**:
   - Client sends to `/api/log-error` (same origin, won't be blocked)
   - Uses `navigator.sendBeacon` when available (more reliable)
   - Falls back to `fetch` with `keepalive: true`
   - Server-side route sanitizes data and forwards to Google Apps Script
   - All logging is fail-safe (never throws errors itself)

## Manual Logging

If you need to manually log an error, you can import the logger:

```javascript
import { logError } from '@/lib/errorLogger'

try {
  // Your code
} catch (error) {
  logError('custom_error', error, {
    extra: {
      customContext: 'additional info'
    }
  })
  throw error
}
```

## Development vs Production

- In development, if `ERROR_LOGGER_WEBHOOK_URL` is not set, a warning is logged to server console
- In production, missing webhook URL causes silent failure (no errors thrown)
- The logger is designed to never break your app, even if it fails to initialize
- Server-side errors are logged to console for debugging but don't affect the client response

## Troubleshooting

**Errors not appearing in Google Sheet:**
1. Check that `ERROR_LOGGER_WEBHOOK_URL` is set correctly in `.env.local` (server-side)
2. Verify the Google Apps Script is deployed and accessible
3. Check server console for any errors in `/api/log-error` route
4. Verify the Google Sheet has the correct name (`errors`) and headers
5. Test the API route directly: `POST /api/log-error` with a test payload

**Privacy concerns:**
- The logger is designed with privacy as a core requirement
- No passwords, tokens, or input values are ever captured
- All data is sanitized before sending
- URLs are stripped of query parameters
- Review the "Privacy & Security" section above for details

## Architecture Benefits

- **No Ad Blocker Issues**: Same-origin requests won't be blocked
- **Privacy First**: Comprehensive sanitization at both client and server
- **Reliable**: Server-side forwarding ensures logs are delivered
- **Fail-Safe**: Never breaks the app, even if logging fails
- **Secure**: Sensitive data is never exposed to the client
