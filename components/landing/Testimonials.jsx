'use client'

import { Star, Quote } from 'lucide-react'

const TESTIMONIALS = [
  {
    name: 'Dr. Meera Nair',
    role: 'Audiologist, Chennai',
    quote:
      'The platform brings me genuine, ready-to-book patients. My clinic calendar has never been this full.',
    rating: 4,
  },
  {
    name: 'Dr. Arjun Kapoor',
    role: 'Speech Therapist, Bengaluru',
    quote:
      'Patients arrive already knowing what they need help with, so consultations are far more productive from the first minute.',
    rating: 5,
  },
  {
    name: 'Dr. Fatima Sheikh',
    role: 'Audiologist, Hyderabad',
    quote:
      'Managing my schedule and follow-ups from one dashboard has saved me hours every week that I now spend with patients instead.',
    rating: 5,
  },
  {
    name: 'Dr. Rakesh Bhatt',
    role: 'Speech Therapist, Pune',
    quote:
      'Teleconsultations through the platform let me support patients in nearby towns without them having to travel to my clinic.',
    rating: 5,
  },
]

export default function Testimonials() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-2 block">
            Testimonials
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Trusted by the doctors on our platform.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col"
            >
              <Quote className="w-6 h-6 text-blue-200 mb-3" />
              <p className="text-gray-700 text-sm leading-relaxed flex-grow mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
