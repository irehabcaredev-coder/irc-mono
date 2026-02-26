'use client'

import ReactMarkdown from 'react-markdown'
import Header from '@/components/doctor/Header'
import LandingFooter from '@/components/LandingFooter'
import Link from 'next/link'

const termsAndConditionsText = `
# TERMS & CONDITIONS

**Effective Date:** 26/06/2026  
**Last Updated:** 26/06/2026

## 1. Acceptance of Terms

By accessing or using iRehabCare, you agree to be bound by these Terms & Conditions and our Privacy Policy.
If you do not agree with these Terms, you must not use the platform.
iRehabCare reserves the right to suspend or terminate access for users who violate these Terms.

## 2. About iRehabCare

iRehabCare is a digital platform operated by Fambience Private Limited that facilitates connections between:
- Patients seeking audiology or speech therapy services
- Verified audiologists and speech-language professionals

iRehabCare does not provide medical treatment directly. We act solely as an intermediary platform.

## 3. Eligibility

- Users must be at least 18 years old to register independently.
- Minors may access services only under supervision of a parent or legal guardian.
- Healthcare professionals must hold valid qualifications and licenses as per applicable Indian laws.

## 4. Account Registration & Responsibilities

Users must:
- Provide accurate and complete information.
- Maintain confidentiality of login credentials.
- Immediately notify us of unauthorized access.
- You are responsible for all activity under your account.

## 5. Doctor Verification Policy

iRehabCare conducts reasonable due diligence before onboarding healthcare professionals, including:
- Verification of educational certificates.
- Verification of registration/licensing details (where applicable).
- Identity validation.

However:
- iRehabCare does not guarantee treatment outcomes.
- Verification does not constitute endorsement.
- Patients must independently exercise judgment before engaging services.

## 6. Platform Role & Medical Disclaimer

iRehabCare:
- Is not a hospital or clinic.
- Does not provide medical advice.
- Does not replace emergency medical care.

Any information shared on the platform is for informational purposes only.
Patients must seek immediate in-person medical care in case of emergencies.
All consultations are directly between patient and professional.

## 7. Payments & Fees

If applicable:
- iRehabCare may facilitate online payments.
- Platform fees or commissions may apply.
- Refunds, if any, are subject to cancellation policies displayed at booking.
- We are not liable for disputes regarding treatment satisfaction.

## 8. User Conduct

Users agree not to:
- Post false medical claims.
- Share misleading credentials.
- Harass, threaten, or abuse others.
- Attempt to hack, reverse-engineer, or disrupt the platform.
- Conduct transactions outside the platform to bypass safeguards.

Accounts violating these rules may be suspended or permanently terminated.

## 9. Safety Advisory

Patients and doctors must:
- Avoid sharing sensitive personal or financial information outside secure platform channels.
- Not respond to suspicious payment or OTP requests.
- Verify communications claiming to represent iRehabCare.

iRehabCare will never ask for passwords or OTPs. We are not liable for fraud arising from off-platform interactions.

## 10. User-Generated Content

Users retain ownership of:
- Profile information
- Uploaded documents
- Reviews or feedback

By posting content, you grant iRehabCare a limited, worldwide, non-exclusive license to:
- Display
- Store
- Use content for platform operation and promotion

We may remove content that violates laws or these Terms.

## 11. Intellectual Property

All platform elements including:
- Branding
- Logos
- Software
- UI/UX
- Content (excluding user posts)

Are the property of Fambience Private Limited. Unauthorized use is prohibited.

## 12. Limitation of Liability

While we strive for security and reliability:
- We do not guarantee uninterrupted service.
- We are not liable for indirect or consequential damages.
- Our maximum liability is capped at INR 1,000.

## 13. Indemnification

Users agree to indemnify Fambience Private Limited against losses arising from:
- Misuse of the platform
- Breach of these Terms
- Violation of laws

## 14. Termination

We may suspend or terminate accounts if users:
- Provide false credentials.
- Post unlawful content.
- Compromise platform security.
- Violate medical or legal regulations.

## 15. Governing Law & Jurisdiction

- These Terms are governed by the laws of India.
- Disputes fall under the jurisdiction of courts in Prayagraj, Uttar Pradesh.

## 16. Amendments

We may modify these Terms as required by:
- Business updates
- Regulatory changes
- Platform evolution

Updates will be communicated via email or website notices.

## 17. Contact and Registred Address 

+1 (901) 502-0245

0, Lowther Rd, beside Kriti Scaning Center, George Town, Prayagraj, Uttar Pradesh 211002
`

export default function TermsAndConditionsPage() {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            <Header />
            <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
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
                        {termsAndConditionsText}
                    </ReactMarkdown>
                </div>
            </main>
            <LandingFooter />
        </div>
    )
}
