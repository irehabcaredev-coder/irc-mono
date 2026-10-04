import { ChevronDown } from 'lucide-react'

// Answers describe what the platform does today. Anything about fees, commission or payout timing is
// deliberately left out: add it here once the business terms are final.
const FAQS = [
  {
    q: 'How do I join as a doctor?',
    a: 'Create an account with your email, verify it with a one-time code, then complete your profile in four short steps: personal details, professional details, availability and payment details.',
  },
  {
    q: 'How do patients find me?',
    a: 'Patients search by their concern and city, and your profile appears in the results. When a patient views your profile, you get an email so you can follow up.',
  },
  {
    q: 'How do consultations work?',
    a: 'Consultations happen over video, right in the browser, so there is nothing to install. You schedule a meeting from your dashboard, and both you and the patient join from the meeting link, which opens 10 minutes before the start time.',
  },
  {
    q: 'How do I get paid?',
    a: 'Patients pay online through Razorpay when they book. You add your bank details while setting up your profile so payments can be sent to you.',
  },
  {
    q: 'What do I need to take a consultation?',
    a: 'A phone or computer with a camera and microphone, a stable internet connection, and a modern browser such as Chrome, Safari or Edge.',
  },
]

export default function DoctorFAQ() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900 text-center mb-10">
          Frequently asked questions
        </h2>

        <div className="divide-y divide-gray-200 border-y border-gray-200">
          {FAQS.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="w-5 h-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-gray-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
