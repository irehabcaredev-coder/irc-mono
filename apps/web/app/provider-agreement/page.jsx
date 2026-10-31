'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/doctor/Header'
import LandingFooter from '@/components/LandingFooter'
import AgreementText from '@/components/doctor/AgreementText'
import { fetchProviderAgreement } from '@/lib/doctorApi'

// Public, read-only copy of the current provider agreement (accepting happens during onboarding).
export default function ProviderAgreementPage() {
  const [agreement, setAgreement] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProviderAgreement()
      .then((res) => setAgreement(res.data))
      .catch(() => setError('Could not load the agreement. Please try again later.'))
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Header />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {error && <p className="text-accent-red">{error}</p>}
        {!agreement && !error && <p className="text-gray-500">Loading...</p>}
        {agreement && (
          <>
            <h1 className="text-3xl font-extrabold mb-2 text-gray-900">{agreement.title}</h1>
            <p className="text-sm text-gray-500 mb-8">Version {agreement.version}</p>
            <AgreementText content={agreement.content} />
          </>
        )}
      </main>
      <LandingFooter />
    </div>
  )
}
