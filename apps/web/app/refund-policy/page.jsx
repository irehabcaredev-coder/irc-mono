'use client'

import ReactMarkdown from 'react-markdown'
import Header from '@/components/doctor/Header'
import LandingFooter from '@/components/LandingFooter'
import Link from 'next/link'

const refundPolicyText = `
# CANCELLATION & REFUND POLICY

**Effective Date:** 26/02/2026  
**Last Updated:** 26/02/2026

Cancellation and refund policies apply as follows:
- Patients may cancel appointments within the timeframe specified at booking.
- Refund eligibility depends on cancellation timing and session status.
- If a consultation is completed, refunds are generally not provided.
- If a doctor cancels or fails to attend, rescheduling or refund options may be provided.
- Platform convenience fees (if any) may be non-refundable.
- Detailed terms may be displayed during booking.
`

export default function RefundPolicyPage() {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            <Header />
            <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex-grow min-h-[60vh]">
                <div className="prose prose-blue max-w-none">
                    <ReactMarkdown
                        components={{
                            h1: ({ node, ...props }) => <h1 className="text-4xl font-extrabold mb-8 mt-8 text-gray-900" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mb-4 mt-12 text-gray-900 border-b pb-2" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mb-3 mt-8 text-gray-800" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-5 text-gray-600 leading-relaxed" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-5 text-gray-600 space-y-2" {...props} />,
                            li: ({ node, ...props }) => <li className="text-gray-600" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />
                        }}
                    >
                        {refundPolicyText}
                    </ReactMarkdown>
                </div>
            </main>
            <LandingFooter />
        </div>
    )
}
