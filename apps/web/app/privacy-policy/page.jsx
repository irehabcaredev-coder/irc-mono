'use client'

import ReactMarkdown from 'react-markdown'
import Header from '@/components/doctor/Header'
import LandingFooter from '@/components/LandingFooter'
import Link from 'next/link'

const privacyPolicyText = `
# PRIVACY POLICY

**Effective Date:** 26/02/2026  
**Last Updated:** 26/02/2026

## 1. Introduction

iRehabCare (“Platform”, “we”, “our”, “us”) is operated by Fambience Private Limited and provides a digital platform connecting patients with verified audiologists and speech-language professionals.

We are committed to protecting personal and health-related information in compliance with:
- Digital Personal Data Protection Act, 2023
- Information Technology Act, 2000
- IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules
- IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021

Healthcare-related data is treated as Sensitive Personal Data and handled with enhanced safeguards.

## 2. Information We Collect

### A. Patient Information
- Full name
- Email address
- Phone number
- Age / Date of birth
- Medical history relevant to audiology/speech therapy
- Consultation details and session notes
- Uploaded prescriptions, reports, or diagnostic records

### B. Doctor Information
- Name
- Educational qualifications
- Registration/licensing details
- Certificates submitted for verification
- Practice or clinic details
- Profile and consultation information

### C. Technical Information
- IP address
- Device information
- Browser version
- Session duration
- Usage logs

### D. Analytics & Hosting Data
We may use:
- Google Analytics 4
- Hosting infrastructure logs (e.g., GCP, Vercel, or equivalent secure providers)
- Security monitoring tools

We do not sell personal or medical data.

## 3. Purpose of Collection

We collect and process data to:
- Enable teleconsultations between patients and professionals
- Verify medical professionals
- Improve service quality
- Prevent fraud and misuse
- Maintain security
- Comply with legal obligations

## 4. Telemedicine Consent Policy

By booking or attending an online consultation through iRehabCare, you acknowledge and consent that:
- You understand that the consultation is conducted remotely using electronic communication.
- Teleconsultation may have limitations compared to in-person visits.
- The professional may recommend physical examination if required.
- Your medical information will be shared with the selected professional for treatment purposes.
- You may withdraw consent at any time by discontinuing use of the service.
- Patients are encouraged to provide accurate medical history for safe treatment.

## 5. Data Security & Protection Measures

We implement reasonable security practices including:
- HTTPS encryption
- Secure cloud infrastructure
- Role-based data access controls
- Limited internal access to medical records
- Firewall and server protection mechanisms

While we strive to ensure maximum protection, no digital system is completely immune to risk.

Users must:
- Keep login credentials secure
- Not share OTPs
- Immediately report suspicious activity

## 6. Data Retention

We retain personal and medical data:
- For the duration of active accounts
- As required by applicable medical, financial, or regulatory laws
- Until deletion is requested (subject to legal obligations)

Upon valid deletion requests, data will be securely removed or anonymized unless retention is legally required.

## 7. Data Sharing

Information may be shared only:
- Between patient and chosen healthcare professional
- With verified infrastructure providers (hosting, analytics, security)
- If required by law or court order
- During mergers, acquisitions, or restructuring

We do not sell or rent health data.

## 8. Emergency Services Disclaimer

iRehabCare is not an emergency service provider.

If you are experiencing:
- Severe hearing loss emergencies
- Sudden medical complications
- Life-threatening conditions

Please immediately contact:
- Nearest hospital
- Emergency services (112 in India)
- Local healthcare providers

The platform must not be used for urgent or life-threatening conditions.

## 9. Cancellation & Refund Policy

Cancellation and refund policies apply as follows:
- Patients may cancel appointments within the timeframe specified at booking.
- Refund eligibility depends on cancellation timing and session status.
- If a consultation is completed, refunds are generally not provided.
- If a doctor cancels or fails to attend, rescheduling or refund options may be provided.
- Platform convenience fees (if any) may be non-refundable.
- Detailed terms may be displayed during booking.

## 10. Fraud Prevention & Safety Advisory

Users are advised to:
- Avoid off-platform payments.
- Not share OTPs, passwords, or financial information.
- Report suspicious profiles or communications immediately.

iRehabCare will never request sensitive credentials via phone or message. We are not responsible for losses arising from off-platform transactions.

## 11. Data Breach Notification Policy

In the event of a data breach involving personal or medical data:
- We will investigate promptly.
- Affected users will be notified within a reasonable time, where legally required.
- Appropriate corrective measures will be taken.
- Regulatory authorities will be informed if required under applicable law.
- We maintain internal protocols for breach detection and mitigation.

## 12. User Rights (DPDP Act 2023)

You have the right to:
- Access your personal data
- Request correction
- Request deletion
- Withdraw consent
- Nominate a representative (as per law)

Requests may be sent to:  
📧 support@irehabcare.com

We will respond within reasonable timelines as required by law.

## 13. Children’s Privacy

If services are provided to minors:
- Parental or guardian consent is mandatory.
- Parents may request access or deletion of child data.

## 14. Grievance Redressal Officer

(As Required under IT Rules, 2021)

In accordance with the Information Technology Act and Intermediary Guidelines Rules, the details of our Grievance Officer are:

**Grievance Officer Name:** [To Be Appointed]  
**Company:** Fambience Private Limited  
**Email:** support@irehabcare.com  

**Registered Address:**  
3/193, LIG, 03, Avas Vikash Colony Yojana,  
Jhunsi, Allahabad (Phulpur),  
Uttar Pradesh – 211019, India  

The Grievance Officer shall acknowledge complaints within 24 hours and resolve them within 15 days from receipt.

## 15. Updates to this Policy

We may update this Privacy Policy due to:
- Legal changes
- Regulatory requirements
- Platform updates
- Security improvements

Updates will be communicated via email, website notice, or in-app notification.
`

export default function PrivacyPolicyPage() {
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
                        {privacyPolicyText}
                    </ReactMarkdown>
                </div>
            </main>
            <LandingFooter />
        </div>
    )
}
