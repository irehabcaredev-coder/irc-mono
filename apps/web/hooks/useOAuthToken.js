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
  // TEMPORARY: an API that has not been updated yet still redirects with ?token=. Accept it so sign-in keeps working
  // during a rollout where the site is deployed before the API, and remove this once the API is on the new release.
  const legacyToken = code ? null : searchParams.get('token')
  const [token, setToken] = useState(legacyToken)
  const [pending, setPending] = useState(!!code)

  useEffect(() => {
    if (!legacyToken) return
    const url = new URL(window.location.href)
    url.searchParams.delete('token')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  }, [legacyToken])

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
