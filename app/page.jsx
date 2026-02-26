'use client'

import Link from 'next/link'
import Image from 'next/image'
import { UserPlus, Stethoscope, MessageSquare, Calendar, Users, Activity, Video, Search, ArrowRight } from 'lucide-react'
import Header from '@/components/doctor/Header'
import BrandWordmark from '@/components/BrandWordmark'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Header />

      {/* Hero Section */}
      <section className="pt-20 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50/50 to-white overflow-hidden relative">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-blue-100/50 blur-3xl opacity-50 z-0 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-blue-50/50 blur-3xl opacity-50 z-0 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.15] tracking-tight">
                Get connected with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">best of audiology doctors</span> and services.
              </h1>

              <div className="flex flex-col sm:flex-row gap-5 pt-4">
                <Link
                  href="/patients"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <UserPlus className="mr-2 w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
                  For Patients
                </Link>
                <Link
                  href="/auth"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5"
                >
                  <Stethoscope className="mr-2 w-5 h-5 text-blue-200 group-hover:text-white transition-colors" />
                  For Doctors
                </Link>
              </div>
            </div>

            <div className="relative lg:ml-10">
              {/* Decorative elements behind image */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-blue-50 rounded-3xl transform rotate-3 scale-105 opacity-50 z-0"></div>
              <div className="absolute -inset-4 bg-gradient-to-tl from-cyan-100 to-transparent rounded-3xl transform -rotate-3 scale-105 opacity-50 z-0"></div>

              <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl glassmorphism border border-white/20 bg-white/50 p-2 transform transition-transform hover:scale-[1.02] duration-500">
                <div className="rounded-xl overflow-hidden bg-gray-100 relative w-full h-[400px]">
                  <Image
                    src="/hero.png"
                    alt="Audiology Healthcare Connect"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -left-8 top-12 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-gray-100 items-center gap-3 hidden md:flex z-20 hover:scale-105 transition-transform cursor-default">
                <div className="bg-green-100 p-2 rounded-lg text-green-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium tracking-wide">Next Available</p>
                  <p className="text-sm font-bold text-gray-900">Today, 2:00 PM</p>
                </div>
              </div>

              <div className="absolute -right-8 bottom-12 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-gray-100 items-center gap-3 hidden md:flex z-20 hover:scale-105 transition-transform cursor-default">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium tracking-wide">Patient Leads</p>
                  <p className="text-sm font-bold text-gray-900">+24 This Week</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Sub-separator */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

      {/* Dual Offerings Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>

        <div className="max-w-7xl mx-auto space-y-32 relative z-10">

          {/* For Patients */}
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="relative h-[500px] w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-100 group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-50 to-white z-0"></div>

                {/* Abstract decorative elements inside patient visual */}
                <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
                <div className="absolute top-10 right-10 w-32 h-32 bg-indigo-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-4000"></div>

                <div className="absolute inset-0 flex flex-col justify-center gap-6 p-8 z-10">
                  <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/50 transform transition-transform group-hover:translate-x-3 duration-500 ease-out">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><Search className="w-6 h-6" /></div>
                      <div className="font-bold text-gray-900">Find Specialists</div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-gray-100 rounded-full"><div className="w-3/4 h-2 bg-blue-500 rounded-full"></div></div>
                      <div className="w-2/3 h-2 bg-gray-100 rounded-full"></div>
                    </div>
                  </div>

                  <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/50 transform transition-transform group-hover:-translate-x-3 duration-500 ease-out delay-75">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><Calendar className="w-6 h-6" /></div>
                      <div className="font-bold text-gray-900">Book Instantly</div>
                    </div>
                    <div className="w-full h-10 bg-gray-50 rounded-lg mt-3 border border-gray-100 border-dashed flex items-center px-4"><span className="text-xs text-gray-400 font-medium">Select available time slot...</span></div>
                  </div>

                  <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/50 transform transition-transform group-hover:translate-x-3 duration-500 ease-out delay-150">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-purple-100 p-3 rounded-xl text-purple-600"><MessageSquare className="w-6 h-6" /></div>
                      <div className="font-bold text-gray-900">AI Health Assistant</div>
                    </div>
                    <div className="flex gap-2 mt-3 text-sm font-medium w-full">
                      <div className="bg-purple-50 text-purple-700 px-4 py-2.5 rounded-xl rounded-bl-sm border border-purple-100">
                        Hello! How can I help you today?
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 hidden lg:block"></div>

            <div className="lg:col-span-5 order-1 lg:order-2 space-y-8">
              <div>
                <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-3 block flex items-center gap-2">
                  <span className="w-8 h-px bg-blue-600"></span>
                  What We Serve For Patients
                </span>
                <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-[1.15] mb-6">
                  Your path to better hearing starts here.
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed font-medium">
                  We empower patients with seamless tools to manage their audiology health. Get the care you need, when you need it, without the friction.
                </p>
              </div>

              <div className="space-y-8 pt-4">
                <div className="flex items-start group">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-600 transition-colors flex items-center justify-center shadow-sm">
                      <Search className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Connect with doctors</h3>
                    <p className="text-gray-600 leading-relaxed">Find the right audiology specialists tailored to your specific needs, location, and schedule.</p>
                  </div>
                </div>

                <div className="flex items-start group">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 transition-colors flex items-center justify-center shadow-sm">
                      <Calendar className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Take appointments online</h3>
                    <p className="text-gray-600 leading-relaxed">Skip the waiting room. Book, reschedule, and manage your appointments entirely online with zero hassle.</p>
                  </div>
                </div>

                <div className="flex items-start group">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 group-hover:bg-purple-600 transition-colors flex items-center justify-center shadow-sm">
                      <MessageSquare className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Consult an AI Assistant</h3>
                    <p className="text-gray-600 leading-relaxed">Get instant answers, preliminary guidance, and support 24/7 through our intelligent AI healthcare companion.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-16"></div>

          {/* For Doctors */}
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-8">
              <div>
                <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-3 block flex items-center gap-2">
                  <span className="w-8 h-px bg-blue-600"></span>
                  What We Serve For Doctors
                </span>
                <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-[1.15] mb-6">
                  Elevate your practice, expand your reach.
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed font-medium">
                  Focus on what you do best—delivering exceptional care. We handle patient acquisition, scheduling, and remote engagement seamlessly.
                </p>
              </div>

              <div className="space-y-8 pt-4">
                <div className="flex items-start group">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-12 h-12 rounded-xl bg-green-50 group-hover:bg-green-600 transition-colors flex items-center justify-center shadow-sm">
                      <Activity className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Get More Leads</h3>
                    <p className="text-gray-600 leading-relaxed">Increase your visibility to thousands of active patients searching for audiology services in your area.</p>
                  </div>
                </div>

                <div className="flex items-start group">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-600 transition-colors flex items-center justify-center shadow-sm">
                      <Video className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Remotely</h3>
                    <p className="text-gray-600 leading-relaxed">Offer teleconsultations and digital follow-ups, expanding your service radius beyond your physical clinic.</p>
                  </div>
                </div>

                <div className="flex items-start group">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 group-hover:bg-cyan-600 transition-colors flex items-center justify-center shadow-sm">
                      <Users className="w-6 h-6 text-cyan-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Patient Lifecycle</h3>
                    <p className="text-gray-600 leading-relaxed">A unified dashboard to oversee appointments, case files, communication, and practice analytics at a glance.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 hidden lg:block"></div>

            <div className="lg:col-span-6">
              <div className="relative h-[500px] w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-800 group">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 z-0"></div>

                {/* Abstract decorative elements inside doctor visual */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full mix-blend-overlay filter blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full mix-blend-overlay filter blur-3xl opacity-50"></div>

                {/* Dashboard Mockup Grid inside */}
                <div className="absolute inset-0 p-8 z-10 flex flex-col gap-5">
                  {/* Top Nav Mock */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-blue-500 rounded-lg flex items-center justify-center text-white"><Stethoscope className="w-4 h-4" /></div>
                      <div className="h-5 w-24 bg-white/20 rounded"></div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-8 w-8 bg-white/5 rounded-full border border-white/10"></div>
                      <div className="h-8 w-8 bg-white/5 rounded-full border border-white/10"></div>
                    </div>
                  </div>

                  {/* Stats Row Mock */}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 transform transition-all group-hover:-translate-y-1 hover:bg-white/10 cursor-default shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-white/60 text-xs font-semibold uppercase tracking-wider">New Patients</div>
                        <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center"><Activity className="w-3 h-3 text-green-400" /></div>
                      </div>
                      <div className="text-white text-3xl font-bold">+128</div>
                      <div className="text-green-400 text-xs mt-3 flex items-center font-medium bg-green-400/10 inline-flex px-2 py-1 rounded">
                        <ArrowRight className="w-3 h-3 mr-1 -rotate-45" /> 14% vs last month
                      </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 transform transition-all group-hover:-translate-y-1 hover:bg-white/10 cursor-default delay-75 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-white/60 text-xs font-semibold uppercase tracking-wider">Appointments</div>
                        <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center"><Calendar className="w-3 h-3 text-blue-400" /></div>
                      </div>
                      <div className="text-white text-3xl font-bold">42</div>
                      <div className="text-green-400 text-xs mt-3 flex items-center font-medium bg-green-400/10 inline-flex px-2 py-1 rounded">
                        <ArrowRight className="w-3 h-3 mr-1 -rotate-45" /> 8% vs last week
                      </div>
                    </div>
                  </div>

                  {/* Graph / List Mock */}
                  <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 flex-grow transform transition-all group-hover:-translate-y-1 delay-150 shadow-lg flex flex-col">
                    <div className="text-white/80 text-sm font-bold mb-5 flex items-center justify-between">
                      Upcoming Schedule
                      <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded cursor-pointer hover:bg-blue-400/20 transition-colors">View All</span>
                    </div>
                    <div className="space-y-4 flex-grow flex flex-col justify-around">
                      {[
                        { time: "10:00 AM", color: "bg-purple-500" },
                        { time: "11:30 AM", color: "bg-blue-500" },
                        { time: "02:00 PM", color: "bg-green-500" }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                          <div className={`h-10 w-10 ${item.color}/20 rounded-full flex items-center justify-center border border-${item.color}/30`}><UserPlus className={`w-4 h-4 text-${item.color.split('-')[1]}-300`} /></div>
                          <div className="flex-grow">
                            <div className="h-3 w-32 bg-white/30 rounded mb-2"></div>
                            <div className="h-2 w-20 bg-white/10 rounded"></div>
                          </div>
                          <div className="text-xs font-medium text-white/50 bg-black/20 px-2 py-1 rounded shrink-0">{item.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Modern Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <BrandWordmark size="lg" variant="dark" className="mb-6 opacity-90 hover:opacity-100 transition-opacity" />
          <p className="text-gray-500 max-w-xl mb-8 leading-relaxed">
            Empowering audiology care through modern digital solutions. Connecting the right patients with the right specialists for a seamless healthcare experience.
          </p>
          <div className="flex items-center justify-center gap-8 mb-12">
            <Link href="/patients" className="text-sm font-medium hover:text-white transition-colors">For Patients</Link>
            <span className="text-gray-700">•</span>
            <Link href="/auth" className="text-sm font-medium hover:text-white transition-colors">For Doctors</Link>
          </div>
          <div className="border-t border-gray-800/60 w-full pt-8 text-sm text-gray-500 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>© {new Date().getFullYear()} gocare. All rights reserved.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
