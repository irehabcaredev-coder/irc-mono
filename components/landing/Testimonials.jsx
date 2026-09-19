'use client'

import { Star, Quote } from 'lucide-react'

const TESTIMONIALS = [
  {
    name: 'Ananya Sharma',
    role: 'Patient, Bengaluru',
    quote:
      "Booking a speech therapy session for my son took less than five minutes. The doctor's profile had everything I needed to decide.",
    rating: 5,
  },
  {
    name: 'Rohit Verma',
    role: 'Patient, Delhi',
    quote:
      'I compared audiologists by experience and location right on the homepage. Found a specialist near me the same day.',
    rating: 5,
  },
  {
    name: 'Dr. Meera Nair',
    role: 'Audiologist, Chennai',
    quote:
      'The platform brings me genuine, ready-to-book patients. My clinic calendar has never been this full.',
    rating: 4,
  },
  {
    name: 'Priya Iyer',
    role: 'Patient, Pune',
    quote:
      'The AI assistant helped me understand which specialist I needed before I even searched. Super smooth experience.',
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
            Loved by patients and doctors alike.
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
