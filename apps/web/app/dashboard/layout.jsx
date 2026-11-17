import RciGate from '@/components/doctor/RciGate'
import ContactConsentPrompt from '@/components/doctor/ContactConsentPrompt'

export default function DashboardLayout({ children }) {
  return (
    <RciGate>
      {children}
      <ContactConsentPrompt />
    </RciGate>
  )
}
