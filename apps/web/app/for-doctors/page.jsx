import Link from 'next/link'
import Header from '@/components/doctor/Header'
import LandingFooter from '@/components/LandingFooter'
import DoctorFAQ from '@/components/landing/DoctorFAQ'
import Testimonials from '@/components/landing/Testimonials'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = {
  title: `For Doctors - ${BRAND_NAME}`,
  description: 'Grow your audiology or speech therapy practice with patients who are ready to book.',
}

export default function ForDoctorsPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Header />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight text-balance">
            Grow your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">hearing and speech practice</span> with patients ready to book
          </h1>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center px-10 py-3.5 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-300/50"
          >
            Login
          </Link>
        </div>
      </section>

      <DoctorFAQ />
      <Testimonials />

      <LandingFooter />
    </div>
  )
}
