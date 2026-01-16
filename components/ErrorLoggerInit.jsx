'use client'

import { useEffect } from 'react'
import { initErrorLogger } from '@/lib/errorLogger'

/**
 * Client component to initialize error logger on mount
 * This must be a client component because error logger needs browser APIs
 */
export default function ErrorLoggerInit() {
  useEffect(() => {
    initErrorLogger()
  }, [])

  // This component renders nothing
  return null
}
