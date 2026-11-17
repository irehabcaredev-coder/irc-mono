'use client'

import { useEffect, useState } from 'react'
import { apiPost } from '@/lib/apiClient'

/**
 * After Google sign-in the API redirects here with a one-time `code` (never the login token itself, which would
 * leak into logs, history and Referer headers). This swaps the code for the token and removes it from the address.
 * `pending` is true until that finishes, so pages do not treat the visitor as signed out in the meantime.
 */
export function useOAuthToken(searchParams) {
  const code = searchParams.get('code')
  const [token, setToken] = useState(null)
  const [pending, setPending] = useState(!!code)

  useEffect(() => {
    if (!code) return
    let cancelled = false

    const url = new URL(window.location.href)
    url.searchParams.delete('code')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)

    apiPost('/auth/exchange', { code }, { skipAuth: true })
      .then((res) => {
        if (!cancelled) setToken(res?.data?.token || null)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPending(false)
      })

    return () => {
      cancelled = true
    }
  }, [code])

  return { token, pending }
}
