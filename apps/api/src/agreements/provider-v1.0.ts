// Provider Registration & Compliance Agreement, v1.0 (AccessX Technologies LLC / iRehabCare).
// Source: "iRehabCare Provider Signup Compliance.docx", sections B and C.
// Published versions are immutable (their hash is recorded on every acceptance): change the text by adding a new
// version file and bumping AGREEMENT_VERSION, never by editing this one after it has been seeded.

export const AGREEMENT_KEY = 'provider';
export const AGREEMENT_VERSION = '1.0';
export const AGREEMENT_TITLE = 'Provider Registration & Compliance Agreement';
export const AGREEMENT_OPERATOR = 'AccessX Technologies LLC';

export const AGREEMENT_SECTIONS: { title: string; body: string[] }[] = [
    {
        title: "1. Independent Professional Status",
        body: [
            "I understand that iRehabCare is a technology platform operated by AccessX Technologies LLC. Unless a separate written agreement expressly provides otherwise, I offer clinical services as an independent professional, not as an employee, agent, or clinical representative of AccessX. I retain independent responsibility for my professional judgment, treatment decisions, and patient care.",
        ],
    },
    {
        title: "2. Qualifications and Credentials",
        body: [
            "I certify that all information I submit concerning my qualifications, education, professional registrations, licenses, certifications, experience, and identity is truthful, accurate, and current. I agree to maintain all credentials required for the services I provide and promptly disclose any expiration, restriction, suspension, investigation, or revocation affecting my authorization to practice.",
        ],
    },
    {
        title: "3. Domestic and International Licensing",
        body: [
            "I understand that professional requirements may differ across countries, states, provinces, and other jurisdictions. Before accepting a patient, I am responsible for determining whether I am legally authorized to provide the proposed services, considering the patient’s physical location, my own location, applicable professional regulations, and telepractice requirements. I will not provide services through iRehabCare where doing so is prohibited.",
        ],
    },
    {
        title: "4. Patient Eligibility and Booking",
        body: [
            "I agree to verify the patient’s physical location at the time of service, assess whether teletherapy is appropriate, obtain necessary informed consent, and decline or refer requests that I cannot lawfully or competently fulfill. A patient finding my profile or requesting an appointment does not constitute authorization to provide treatment.",
        ],
    },
    {
        title: "5. Clinical Responsibility and Patient Safety",
        body: [
            "I am responsible for evaluations, diagnoses within my professional scope, treatment plans, clinical documentation, professional standards, safeguarding, appropriate referrals, and emergency procedures applicable to my services. I will not misrepresent the expected outcomes or effectiveness of treatment.",
        ],
    },
    {
        title: "6. Privacy and Confidentiality",
        body: [
            "I agree to comply with applicable patient privacy, confidentiality, recordkeeping, data protection, and cross-border data transfer requirements, including HIPAA where applicable. I will use approved secure systems and execute any required data protection or business associate agreements before exchanging protected patient information.",
        ],
    },
    {
        title: "7. Insurance and Financial Obligations",
        body: [
            "I agree to maintain professional liability insurance where legally required and, where appropriate, coverage for telepractice and international services. I am responsible for my own professional taxes, registration fees, and other obligations, except where applicable law or a separate written agreement provides otherwise.",
        ],
    },
    {
        title: "8. Platform Role and Limitations",
        body: [
            "I acknowledge that AccessX provides marketplace and technology services and does not, solely by operating iRehabCare, authorize my clinical practice in any jurisdiction. Credential review, account approval, or platform availability is not a legal determination that a particular clinical service is permitted.",
        ],
    },
    {
        title: "9. Indemnification",
        body: [
            "To the extent permitted by applicable law, I agree to defend, indemnify, and hold harmless AccessX and its covered personnel against third-party claims, damages, and reasonable expenses arising from my professional negligence, unauthorized practice, material misrepresentations, or breach of this Agreement, except to the extent attributable to AccessX’s own negligence, misconduct, or violation of law. Applicable notice, defense, and settlement procedures will be specified in the final agreement.",
        ],
    },
    {
        title: "10. Suspension and Enforcement",
        body: [
            "I understand that AccessX may request verification of my credentials, investigate credible compliance concerns, restrict bookings, suspend my account, or terminate access where reasonably necessary to protect patients, comply with law, or enforce this Agreement. I agree to cooperate with lawful verification and investigations.",
        ],
    },
    {
        title: "11. Electronic Acceptance",
        body: [
            "By electronically accepting this Agreement, I confirm that I have read and understood its terms, that the information I have supplied is accurate, and that I agree to be legally bound by the Agreement, subject to applicable law.",
        ],
    },
];

// Each must be ticked separately, all unchecked by default.
export const AGREEMENT_ATTESTATIONS: string[] = [
    "I confirm that my credentials and professional registration details are accurate.",
    "I will independently verify my authorization before treating patients in any state or country.",
    "I accept responsibility for my clinical decisions, patient safety, and applicable professional obligations.",
    "I agree to the independent provider terms, privacy requirements, and applicable indemnification provisions.",
    "I have read and agree to the complete Provider Registration & Compliance Agreement.",
];
