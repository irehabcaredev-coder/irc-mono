// Mock lead events data
export const mockLeadEvents = [
  {
    eventId: 'evt_001',
    type: 'Profile View',
    patientName: 'Rajesh Kumar',
    patientCity: 'Mumbai',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    doctorId: 'doc_1',
  },
  {
    eventId: 'evt_002',
    type: 'Saved',
    patientName: 'Priya Sharma',
    patientCity: 'Delhi',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    doctorId: 'doc_1',
  },
  {
    eventId: 'evt_003',
    type: 'Clicked WhatsApp',
    patientName: null, // Anonymous
    patientCity: null,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    doctorId: 'doc_1',
  },
  {
    eventId: 'evt_004',
    type: 'Profile View',
    patientName: 'Amit Patel',
    patientCity: 'Bangalore',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    doctorId: 'doc_1',
  },
  {
    eventId: 'evt_005',
    type: 'Clicked Call',
    patientName: 'Sneha Reddy',
    patientCity: 'Hyderabad',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    doctorId: 'doc_1',
  },
  {
    eventId: 'evt_006',
    type: 'Saved',
    patientName: null, // Anonymous
    patientCity: null,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    doctorId: 'doc_1',
  },
  {
    eventId: 'evt_007',
    type: 'Profile View',
    patientName: 'Vikram Singh',
    patientCity: 'Pune',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    doctorId: 'doc_1',
  },
]

// Mock fetch function for lead events
export const fetchLeadEvents = async (doctorId) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))
  return mockLeadEvents.filter((event) => event.doctorId === doctorId)
}

// Mock send OTP function
export const sendOTP = async (email) => {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return { success: true, message: 'OTP sent to your email' }
}

// Mock verify OTP function
export const verifyOTP = async (email, otp) => {
  await new Promise((resolve) => setTimeout(resolve, 800))
  if (otp === '123456') {
    return { success: true, doctorId: `doc_${Date.now()}` }
  }
  return { success: false, message: 'Invalid OTP' }
}

// Mock Google sign-in
export const signInWithGoogle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return {
    success: true,
    email: 'doctor@example.com',
    doctorId: `doc_${Date.now()}`,
  }
}


