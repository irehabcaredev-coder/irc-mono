import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const usePatientStore = create(
  persist(
    (set, get) => ({
      // Active tab filter
      activeTab: 'FIND_SPECIALIST',
      
      // Search query
      searchQuery: '',
      
      // Consult mode filters
      selectedConsultModes: [],
      
      // Language filter
      selectedLanguage: '',
      
      // Saved doctors
      savedDoctorIds: [],
      
      // Viewed doctors (most recent first, max 50)
      viewedDoctors: [],
      
      // Intent events (for tracking)
      intentEvents: [],
      
      // Auth state
      isAuthed: false,
      userEmail: null,
      patientProfile: null,
      authModalOpen: false,
      authMode: 'login', // 'login' | 'register'
      authStep: 1, // 1: email, 2: OTP, 3: register form
      pendingAction: null, // { type: 'CALL' | 'WHATSAPP' | 'PROFILE' | 'SAVE', doctorId }
      
      // Profile drawer state
      profileDrawerOpen: false,
      selectedDoctorId: null,
      
      // Actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      toggleConsultMode: (mode) =>
        set((state) => ({
          selectedConsultModes: state.selectedConsultModes.includes(mode)
            ? state.selectedConsultModes.filter((m) => m !== mode)
            : [...state.selectedConsultModes, mode],
        })),
      
      setSelectedLanguage: (language) => set({ selectedLanguage: language }),
      
      toggleSavedDoctor: async (doctorId) => {
        const state = get()
        const isSaved = state.savedDoctorIds.includes(doctorId)
        const patientId = state.patientProfile?.patientId

        // Optimistic update
        set({
          savedDoctorIds: isSaved
            ? state.savedDoctorIds.filter((id) => id !== doctorId)
            : [...state.savedDoctorIds, doctorId],
        })

        // Call API if patient is authenticated
        if (patientId) {
          try {
            const { saveDoctor, unsaveDoctor } = await import('@/lib/patientApi')
            if (isSaved) {
              await unsaveDoctor(patientId, doctorId)
            } else {
              await saveDoctor(patientId, doctorId)
            }
            // API call successful, state already updated optimistically
          } catch (error) {
            // Revert optimistic update on error
            set({
              savedDoctorIds: state.savedDoctorIds, // Revert to original state
            })
            console.error('Failed to update saved doctors:', error)
            // Could show a toast/notification here
          }
        }
      },
      
      addIntentEvent: (event) =>
        set((state) => ({
          intentEvents: [...state.intentEvents, { ...event, timestamp: Date.now() }],
        })),
      
      // Auth actions
      openAuthModal: (mode, pendingAction) =>
        set({
          authModalOpen: true,
          authMode: mode,
          authStep: 1,
          pendingAction,
        }),
      
      closeAuthModal: () =>
        set({
          authModalOpen: false,
          authStep: 1,
          pendingAction: null,
        }),
      
      setAuthStep: (step) => set({ authStep: step }),
      
      setAuthMode: (mode) => set({ authMode: mode, authStep: 1 }),
      
      setAuthSuccess: (email, profile) =>
        set({
          isAuthed: true,
          userEmail: email,
          patientProfile: profile,
          authModalOpen: false,
          authStep: 1,
        }),
      
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('patient_token')
          window.location.href = '/patients'
        }
        set({
          isAuthed: false,
          userEmail: null,
          patientProfile: null,
          savedDoctorIds: [],
          viewedDoctors: [],
          pendingAction: null,
        })
      },
      
      // Viewed doctors actions
      addViewedDoctor: (doctorId) =>
        set((state) => {
          const current = state.viewedDoctors.filter((id) => id !== doctorId)
          return {
            viewedDoctors: [doctorId, ...current].slice(0, 50),
          }
        }),
      
      clearPendingAction: () => set({ pendingAction: null }),
      
      // Profile drawer actions
      openProfileDrawer: (doctorId) =>
        set({
          profileDrawerOpen: true,
          selectedDoctorId: doctorId,
        }),
      
      closeProfileDrawer: () =>
        set({
          profileDrawerOpen: false,
          selectedDoctorId: null,
        }),
      
      // Profile update
      updatePatientProfile: (profile) =>
        set({
          patientProfile: { ...get().patientProfile, ...profile },
        }),
    }),
    {
      name: 'patient-store',
      partialize: (state) => ({
        isAuthed: state.isAuthed,
        userEmail: state.userEmail,
        patientProfile: state.patientProfile,
        savedDoctorIds: state.savedDoctorIds,
        viewedDoctors: state.viewedDoctors,
      }),
    }
  )
)
