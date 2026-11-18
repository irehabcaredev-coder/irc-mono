'use client'

import { useEffect, useRef, useState } from 'react'
import { apiPost } from '@/lib/apiClient'

const withoutParam = (name) => {
  const url = new URL(window.location.href)
  url.searchParams.delete(name)
  return url.pathname + url.search + url.hash
}

/**
 * After Google sign-in the API redirects here with a one-time `code` (never the login token itself, which would
 * leak into logs, history and Referer headers). This swaps the code for the token and removes it from the address.
 * `pending` is true until that finishes, so pages do not treat the visitor as signed out in the meantime.
 *
 * The code is read once, on the first render. Removing it from the address changes `searchParams`, and an effect
 * that depended on it would restart and cancel the swap that is already running.
 */
export function useOAuthToken(searchParams) {
  const initialCode = useRef(searchParams.get('code'))
  // TEMPORARY: an API that has not been updated yet still redirects with ?token=. Accept it so sign-in keeps working
  // during a rollout where the site is deployed before the API, and remove this once the API is on the new release.
  const initialLegacyToken = useRef(initialCode.current ? null : searchParams.get('token'))
  const started = useRef(false)

  const [token, setToken] = useState(initialLegacyToken.current)
  const [pending, setPending] = useState(!!initialCode.current)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (initialLegacyToken.current) {
      window.history.replaceState(null, '', withoutParam('token'))
      return
    }

    const code = initialCode.current
    if (!code) return

    apiPost('/auth/exchange', { code }, { skipAuth: true })
      .then((res) => setToken(res?.data?.token || null))
      .catch(() => {})
      .finally(() => {
        // Only now, once the swap is done, take the one-time code out of the address
        window.history.replaceState(null, '', withoutParam('code'))
        setPending(false)
      })
  }, [])

  return { token, pending }
}
