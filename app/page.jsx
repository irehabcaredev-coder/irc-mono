'use client'

import Link from 'next/link'
import { ArrowRight, Search, Users, FileText, Eye, Heart, MessageCircle, Phone } from 'lucide-react'
import Header from '@/components/doctor/Header'
import BrandWordmark from '@/components/BrandWordmark'
import { BRAND_NAME } from '@/lib/brand'

export default function DoctorLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Your practice, discoverable.
                <br />
                <span className="text-primary-blue">Your patients, organized.</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Reach patients digitally. Manage your patients on one platform. Track statuses and get leads.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center px-8 py-4 bg-primary-blue text-white rounded-lg font-semibold hover:bg-[#155a7a] transition-colors shadow-lg shadow-primary-blue/20"
                >
                  Join Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-blue border-2 border-primary-blue rounded-lg font-semibold hover:bg-primary-blue/5 transition-colors"
                >
                  See how it works
                </a>
              </div>
              <div className="mt-6 text-sm text-gray-500">
                Are you a patient?{' '}
                <Link href="/patients?action=login" className="text-primary-blue font-medium hover:underline">
                  Find a doctor here
                </Link>
              </div>
            </div>

            {/* Signal + Pipeline Visual */}
            <div className="relative">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 shadow-xl">
                <div className="grid grid-cols-3 gap-4 items-center">
                  {/* Left: Patient Search Signals */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                      Patient Signals
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <Search className="w-4 h-4 text-primary-blue" />
                        <span className="text-xs font-medium text-gray-700">Search: "Audiologist"</span>
                      </div>
                      <div className="text-xs text-gray-500">Mumbai, 2km</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <Search className="w-4 h-4 text-primary-blue" />
                        <span className="text-xs font-medium text-gray-700">Search: "Speech"</span>
                      </div>
                      <div className="text-xs text-gray-500">Delhi, 5km</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm opacity-60">
                      <div className="flex items-center space-x-2 mb-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-medium text-gray-500">Search: "Hearing"</span>
                      </div>
                      <div className="text-xs text-gray-400">Bangalore, 3km</div>
                    </div>
                  </div>

                  {/* Center: iRehabCare Profile Card */}
                  <div className="flex flex-col items-center">
                    <div className="w-1 h-24 bg-gradient-to-b from-primary-blue to-accent-red mb-2"></div>
                    <div className="bg-primary-blue rounded-xl p-6 shadow-lg border-2 border-accent-red/20">
                      <div className="text-white text-center">
                        <div className="text-2xl font-bold mb-1">{BRAND_NAME}</div>
                        <div className="text-xs opacity-90">Your Profile</div>
                        <div className="mt-4 pt-4 border-t border-white/20">
                          <div className="text-xs opacity-75">Dr. Name</div>
                          <div className="text-xs opacity-75 mt-1">Specialty</div>
                        </div>
                      </div>
                    </div>
                    <div className="w-1 h-24 bg-gradient-to-b from-accent-red to-primary-blue mt-2"></div>
                  </div>

                  {/* Right: Lead Events */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                      Lead Events
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-2 mb-1">
                        <Eye className="w-4 h-4 text-primary-blue" />
                        <span className="text-xs font-medium text-gray-700">Profile View</span>
                      </div>
                      <div className="text-xs text-gray-500">2h ago</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-2 mb-1">
                        <Heart className="w-4 h-4 text-accent-red" />
                        <span className="text-xs font-medium text-gray-700">Saved</span>
                      </div>
                      <div className="text-xs text-gray-500">5h ago</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-2 mb-1">
                        <MessageCircle className="w-4 h-4 text-primary-blue" />
                        <span className="text-xs font-medium text-gray-700">WhatsApp Click</span>
                      </div>
                      <div className="text-xs text-gray-500">8h ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-paper px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Digital reach that's built for care
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to grow your practice and connect with patients who need your expertise.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary-blue/10 rounded-lg flex items-center justify-center mb-6">
                <Search className="w-6 h-6 text-primary-blue" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Discoverable Profile</h3>
              <p className="text-gray-600 leading-relaxed">
                Patients find you when they search for your specialty. Your profile appears in relevant searches with all the information they need.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary-blue/10 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-primary-blue" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Lead Tracking</h3>
              <p className="text-gray-600 leading-relaxed">
                See who viewed your profile, saved it, or reached out. Track engagement and understand your patient pipeline.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary-blue/10 rounded-lg flex items-center justify-center mb-6">
                <FileText className="w-6 h-6 text-primary-blue" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">One Platform</h3>
              <p className="text-gray-600 leading-relaxed">
                Manage all your patient interactions, profile information, and practice details from a single dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leads Section */}
      <section id="how-it-works" className="py-20 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Leads you can actually track
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Every interaction matters. See real-time activity from patients interested in your services.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Eye, label: 'Profile Views', color: 'text-primary-blue' },
                  { icon: Heart, label: 'Saved Profiles', color: 'text-accent-red' },
                  { icon: MessageCircle, label: 'WhatsApp Clicks', color: 'text-primary-blue' },
                  { icon: Phone, label: 'Call Clicks', color: 'text-primary-blue' },
                ].map((item, idx) => {
                  const Icon = item.icon
                  return (
                    <div key={idx} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className={`w-10 h-10 ${item.color} bg-white rounded-lg flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{item.label}</div>
                        <div className="text-sm text-gray-500">Tracked in real-time</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="bg-paper rounded-xl p-8 border border-gray-200">
              <div className="space-y-4">
                {[
                  { type: 'Profile View', name: 'Rajesh Kumar', time: '2 hours ago', city: 'Mumbai' },
                  { type: 'Saved', name: 'Priya Sharma', time: '5 hours ago', city: 'Delhi' },
                  { type: 'WhatsApp Click', name: 'Anonymous', time: '8 hours ago', city: null },
                ].map((event, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{event.type}</span>
                      <span className="text-xs text-gray-500">{event.time}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {event.name}
                      {event.city && ` • ${event.city}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Preview Section */}
      <section className="py-20 bg-paper px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Profile that represents you professionally
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Showcase your expertise, experience, and availability in a clean, professional format.
            </p>
          </div>
          <div className="max-w-2xl mx-auto bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
            <div className="flex items-start space-x-6">
              <div className="w-20 h-20 bg-primary-blue rounded-full flex items-center justify-center text-white text-2xl font-bold">
                DR
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Dr. Sample Name</h3>
                <p className="text-primary-blue font-medium mb-4">Audiologist & Speech Therapist</p>
                <div className="space-y-2 text-gray-600">
                  <p>15+ years of experience</p>
                  <p>Available: Mon-Sat, 9:00 AM - 6:00 PM</p>
                  <p>Languages: English, Hindi, Bengali</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Early Access CTA */}
      <section className="py-20 bg-primary-blue px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Join {BRAND_NAME} Early Access
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Be among the first doctors to join our platform. Free access during early launch.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center px-8 py-4 bg-white text-primary-blue rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg"
          >
            Get Started
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <BrandWordmark size="lg" showChakra={true} variant="dark" />
            </div>
            <div className="text-sm">
              For doctors • Professional healthcare platform
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-sm">
            <p className="text-gray-500">
              {BRAND_NAME} is a platform connecting patients with healthcare providers. This platform is for informational purposes only and does not replace professional medical advice, diagnosis, or treatment.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
