'use client'

import { useState } from 'react'
import { Search, Filter, MapPin } from 'lucide-react'
import DoctorCard from '@/components/patients/DoctorCard'

export default function FindDoctors({ doctors = [], isLoading = false, searchQuery, setSearchQuery, selectedConsultModes, toggleConsultMode, selectedLanguage, setSelectedLanguage, languages }) {

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Find Doctors</h1>
                <p className="text-gray-600 mt-1">Search and connect with the best specialists for your needs.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Filters Sidebar (Desktop) / Top Bar (Mobile) */}
                <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Name, clinic, etc."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue shadow-sm"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    {/* Mode Filter */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Consultation Mode
                        </h3>
                        <div className="space-y-2">
                            {['CLINIC', 'HOME_VISIT', 'ONLINE'].map((mode) => (
                                <label key={mode} className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedConsultModes.includes(mode) ? 'bg-primary-blue border-primary-blue' : 'border-gray-300 bg-white group-hover:border-primary-blue'}`}>
                                        {selectedConsultModes.includes(mode) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={selectedConsultModes.includes(mode)}
                                        onChange={() => toggleConsultMode(mode)}
                                    />
                                    <span className="text-sm text-gray-700 capitalize">
                                        {mode === 'HOME_VISIT' ? 'Home Visit' : mode.toLowerCase()}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Language Filter */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Language</h3>
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue"
                        >
                            <option value="">All Languages</option>
                            {languages.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Doctor List */}
                <div className="flex-1">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : doctors.length > 0 ? (
                        <div className="space-y-4">
                            {doctors.map((doctor) => (
                                <DoctorCard key={doctor.id} doctor={doctor} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No doctors found</h3>
                            <p className="text-gray-500 mt-1">Try adjusting your filters or search query.</p>
                            <button
                                onClick={() => {
                                    setSearchQuery('')
                                    // Reset other filters if needed
                                }}
                                className="mt-4 text-primary-blue hover:underline text-sm font-medium"
                            >
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
