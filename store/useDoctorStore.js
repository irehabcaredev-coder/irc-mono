import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useDoctorStore = create(
  persist(
    (set) => ({
      // Auth state
      doctorAuth: {
        isAuthed: false,
        email: null,
        authProvider: null, // 'email' | 'google'
        isOnboarded: false,
        doctorId: null,
        token: null, // JWT token from API
        onboardingStep: null, // EMAIL_VERIFIED | PERSONAL_INFO_COMPLETE | PROFESSIONAL_INFO_COMPLETE | AVAILABILITY_COMPLETE | COMPLETE
      },

      // Profile state (structured)
      doctorProfile: {
        basic: {
          name: '',
          age: null,
          gender: '',
          languages: [],
          phone: '',
        },
        professional: {
          specialty: '', // 'Audiologist' | 'Speech Therapist' | 'Both'
          yearsOfExperience: null,
          recentGraduation: null,
        },
        practice: {
          address: '',
          city: '',
          locality: '',
          availableDays: [],
          timings: {
            from: '',
            to: '',
          },
        },
        payment: {
          consultationFee: 0,
          bankAccountNumber: '',
          bankIfsc: '',
          bankBeneficiaryName: '',
        },
      },

      // Actions
      setAuth: (email, provider, doctorId, token = null, onboardingStep = null) =>
        set((state) => ({
          doctorAuth: {
            ...state.doctorAuth,
            isAuthed: true,
            email: email,
            authProvider: provider,
            doctorId: doctorId || `doc_${Date.now()}`,
            token: token || state.doctorAuth.token,
            onboardingStep: onboardingStep || state.doctorAuth.onboardingStep,
          },
        })),

      setToken: (token) =>
        set((state) => ({
          doctorAuth: {
            ...state.doctorAuth,
            token,
          },
        })),

      setOnboardingStep: (step) =>
        set((state) => ({
          doctorAuth: {
            ...state.doctorAuth,
            onboardingStep: step,
            isOnboarded: step === 'COMPLETE',
          },
        })),

      setOnboarded: (profile) =>
        set((state) => ({
          doctorAuth: {
            ...state.doctorAuth,
            isOnboarded: true,
          },
          doctorProfile: profile,
        })),

      updateProfile: (updates) =>
        set((state) => ({
          doctorProfile: { ...state.doctorProfile, ...updates },
        })),

      updateBasicDetails: (basic) =>
        set((state) => ({
          doctorProfile: {
            ...state.doctorProfile,
            basic: { ...(state.doctorProfile.basic || {}), ...basic },
          },
        })),

      updateProfessionalDetails: (professional) =>
        set((state) => ({
          doctorProfile: {
            ...state.doctorProfile,
            professional: { ...(state.doctorProfile.professional || {}), ...professional },
          },
        })),

      updatePracticeDetails: (practice) =>
        set((state) => ({
          doctorProfile: {
            ...state.doctorProfile,
            practice: { ...(state.doctorProfile.practice || {}), ...practice },
          },
        })),

      updatePaymentDetails: (payment) =>
        set((state) => ({
          doctorProfile: {
            ...state.doctorProfile,
            payment: { ...(state.doctorProfile.payment || {}), ...payment },
          },
        })),

      logout: () => {
        // Clear token from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('doctor_token')
        }
        return set({
          doctorAuth: {
            isAuthed: false,
            email: null,
            authProvider: null,
            isOnboarded: false,
            doctorId: null,
            token: null,
            onboardingStep: null,
          },
          doctorProfile: {
            basic: {
              name: '',
              age: null,
              gender: '',
              languages: [],
              phone: '',
            },
            professional: {
              specialty: '',
              yearsOfExperience: null,
              recentGraduation: null,
            },
            practice: {
              address: '',
              city: '',
              locality: '',
              availableDays: [],
              timings: {
                from: '',
                to: '',
              },
            },
            payment: {
              consultationFee: 0,
              bankAccountNumber: '',
              bankIfsc: '',
              bankBeneficiaryName: '',
            },
          },
        })
      },
    }),
    {
      name: 'doctor-storage',
    }
  )
)
