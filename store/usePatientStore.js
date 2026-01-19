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
      tempPatientId: null, // For multi-step signup persistence
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
      
      setTempPatientId: (id) => set({ tempPatientId: id }),

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
      
      addIntentEvent: async (event) => {
        set((state) => ({
          intentEvents: [...state.intentEvents, { ...event, timestamp: Date.now() }],
        }))
        
        // Track event via API
        const { doctorId, type } = event
        const state = get()
        const patientId = state.patientProfile?.patientId
        
        try {
          const { trackLeadEvent } = await import('@/lib/doctorApi')
          // Map internal types to user-friendly types for display if needed
          let eventType = type
          if (type === 'WHATSAPP') eventType = 'Clicked WhatsApp'
          if (type === 'CALL') eventType = 'Clicked Call'
          if (type === 'VIEW_PROFILE') eventType = 'Profile View'
          if (type === 'SAVE_DOCTOR') eventType = 'Saved'
          
          if (eventType !== 'Saved') { // Saved is handled by toggleSavedDoctor api call separately
              await trackLeadEvent(doctorId, eventType, patientId)
          }
        } catch (error) {
          console.error('Failed to track intent event:', error)
        }
      },
      
      // Auth actions
      openAuthModal: (mode, pendingAction) =>
        set({
          authModalOpen: true,
          authMode: mode,
          authStep: 1,
          pendingAction,
          tempPatientId: null, // Reset on open
        }),
      
      closeAuthModal: () =>
        set({
          authModalOpen: false,
          authStep: 1,
          pendingAction: null,
          tempPatientId: null,
        }),
      
      setAuthStep: (step) => set({ authStep: step }),
      
      setAuthMode: (mode) => set({ authMode: mode, authStep: 1 }),
      
      setAuthSuccess: (email, profile) => {
        if (profile?.patientId && typeof window !== 'undefined') {
            localStorage.setItem('patient_id', profile.patientId)
        }
        set({
          isAuthed: true,
          userEmail: email,
          patientProfile: profile,
          authModalOpen: false,
          authStep: 1,
          tempPatientId: null,
        })
      },
      
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('patient_token')
          localStorage.removeItem('patient_id')
          window.location.href = '/patients'
        }
        set({
          isAuthed: false,
          userEmail: null,
          patientProfile: null,
          savedDoctorIds: [],
          viewedDoctors: [],
          pendingAction: null,
          tempPatientId: null,
        })
      },
      
      // Viewed doctors actions
      addViewedDoctor: async (doctorId) => {
        set((state) => {
          const current = state.viewedDoctors.filter((id) => id !== doctorId)
          return {
            viewedDoctors: [doctorId, ...current].slice(0, 50),
          }
        })
        
        // Track view via API
        const state = get()
        const patientId = state.patientProfile?.patientId
        
        try {
             const { trackLeadEvent } = await import('@/lib/doctorApi')
             await trackLeadEvent(doctorId, 'Profile View', patientId)
        } catch (e) {
            console.error('Failed to track view:', e)
        }
      },
      
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
        tempPatientId: state.tempPatientId,
      }),
    }
  )
)
