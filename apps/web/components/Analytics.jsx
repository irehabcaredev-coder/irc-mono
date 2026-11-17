'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'

// Set these at build time to switch analytics on. With neither set, this component renders nothing at all.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID // Google Analytics 4, e.g. G-XXXXXXXXXX
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID // Microsoft Clarity project id

// Pages that hold health or account data are never measured: no scripts, no banner, no session recording.
const PRIVATE_PREFIXES = ['/patients', '/meeting', '/dashboard', '/onboarding', '/auth', '/admin']
const isPrivate = (pathname) => PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))

const STORAGE_KEY = 'analytics-consent'
const readChoice = () => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Loads Google Analytics and Microsoft Clarity only after the visitor accepts, and only on public pages.
 * If a visitor who accepted moves into a private page, the page is reloaded so the trackers are gone from it.
 */
export default function Analytics() {
  const pathname = usePathname() || '/'
  const [choice, setChoice] = useState(null) // 'granted' | 'denied' | null (not asked yet)
  const [ready, setReady] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    setChoice(readChoice())
    setReady(true)
  }, [])

  const enabled = ready && (GA_ID || CLARITY_ID) && !isPrivate(pathname)

  useEffect(() => {
    if (enabled && choice === 'granted') loaded.current = true
    // Trackers loaded on a public page would otherwise keep running inside the private app
    if (ready && loaded.current && isPrivate(pathname)) window.location.reload()
  }, [enabled, choice, pathname, ready])

  if (!GA_ID && !CLARITY_ID) return null
  if (!ready || isPrivate(pathname)) return null

  const decide = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {}
    setChoice(value)
  }

  return (
    <>
      {choice === 'granted' && GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{allow_google_signals:false,allow_ad_personalization_signals:false});`}
          </Script>
        </>
      )}
      {choice === 'granted' && CLARITY_ID && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
        </Script>
      )}

      {choice === null && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-gray-700">
              We use Google Analytics and Microsoft Clarity (which can record how you use a page) to improve this website.
              They run only on public pages, never on sign-in, health or video-call pages, and only if you accept.{' '}
              <a href="/privacy-policy" className="text-primary-blue underline">Privacy Policy</a>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => decide('denied')}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Decline
              </button>
              <button
                onClick={() => decide('granted')}
                className="rounded-md bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
