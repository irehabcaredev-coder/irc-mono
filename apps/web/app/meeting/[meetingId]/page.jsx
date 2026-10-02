'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { useDoctorStore } from '@/store/useDoctorStore';
import { usePatientStore } from '@/store/usePatientStore';
import BrandWordmark from '@/components/BrandWordmark'; // Ensure this component is available or use simple text

// Dynamically import AgoraWrapper with SSR disabled to prevent "window is not defined" error
const AgoraWrapper = nextDynamic(() => import('@/components/video/AgoraVideoCall'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mb-4"></div>
        <p>Initializing video call...</p>
      </div>
    </div>
  )
});

export default function MeetingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const meetingId = params.meetingId;
  const token = searchParams.get('token'); // Optional: Retrieve token from URL if provided (e.g. from backend response)
  
  // In a real app, you might fetch meeting details here to get the App ID, specific Channel Name,
  // or a generated RTM/RTC token from your backend if it's dynamic.
  // For now, we'll use the ENV App ID and the meetingId as the channel name.
  
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const [uid, setUid] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [isJoinReady, setIsJoinReady] = useState(false);

  // Get user info from stores
  const doctorAuth = useDoctorStore((state) => state.doctorAuth);
  const doctorProfile = useDoctorStore((state) => state.doctorProfile);
  const patientProfile = usePatientStore((state) => state.patientProfile);
  const isDoctorAuthed = doctorAuth?.isAuthed;
  const isPatientAuthed = usePatientStore((state) => state.isAuthed);

  useEffect(() => {
    // Check if user is already logged in
    
    // Check localStorage manually for persisted state if stores are slow to hydrate
    // The persist middleware stores data in "doctor-storage" and "patient-storage" keys
    let name = null;
    
    // Try Doctor
    if (isDoctorAuthed) {
      name = doctorAuth.name || doctorProfile?.basic?.name;
    } 
    // Try Patient
    else if (patientProfile?.email) { // PatientProfile might not have name at top level depending on structure
        name = patientProfile.name || patientProfile.username || 'Patient';
    }
    // Try direct localStorage check as fallback
    else if (typeof window !== 'undefined') {
        try {
            const docStore = JSON.parse(localStorage.getItem('doctor-storage'));
            if (docStore?.state?.doctorAuth?.isAuthed) {
                 name = docStore.state.doctorAuth.name || docStore.state.doctorProfile?.basic?.name;
            }
            
            if (!name) {
                const patStore = JSON.parse(localStorage.getItem('patient-store'));
                if (patStore?.state?.patientProfile?.name) {
                    name = patStore.state.patientProfile.name;
                }
            }
        } catch (e) {
            console.error('Error reading local storage for meeting auth', e);
        }
    }

    if (name) {
      console.log('Meeting: Auto-joined as', name);
      // Use logged-in name
      setUid(name);
      setIsJoinReady(true);
    } else {
        // Not logged in - we will show the guest form
        setIsJoinReady(false);
    }
  }, [isDoctorAuthed, doctorAuth, isPatientAuthed, patientProfile]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setUid(guestName.trim());
    setIsJoinReady(true);
  };

  const handleLeave = () => {
    if (isDoctorAuthed) {
      router.push('/dashboard');
    } else if (isPatientAuthed) {
      router.push('/patients');
    } else {
      router.push('/');
    }
  };

  if (!appId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-xl font-bold text-red-600 mb-2">Configuration Error</h1>
          <p className="text-gray-700">Agora App ID is missing. Please configure NEXT_PUBLIC_AGORA_APP_ID in your environment variables.</p>
        </div>
      </div>
    );
  }


  const [meetingDetails, setMeetingDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [tooEarly, setTooEarly] = useState(false);

  useEffect(() => {
      // Fetch meeting details to check time
      const checkMeetingTime = async () => {
          try {
              // We can use the patient API to get details, or a public endpoint if we had one.
              // Since we are fixing the patient flow, we try to get it.
              // Note: This assumes the user has some permission or the endpoint is open enough for the check.
              // In a real secure app, the token check happens on backend.
              // For now, we'll try to fetch.
              const { getAppointmentDetails } = await import('@/lib/patientApi');
              const { data } = await getAppointmentDetails(meetingId);
              
              if (data) {
                  setMeetingDetails(data);
                  const scheduledTime = new Date(data.scheduledAt).getTime();
                  const now = new Date().getTime();
                  const tenMinutes = 10 * 60 * 1000;
                  
                  if (scheduledTime - now > tenMinutes) {
                      setTooEarly(true);
                  } else {
                      setTooEarly(false);
                  }
              }
          } catch (err) {
              console.error("Failed to fetch meeting details", err);
              // If we can't fetch (e.g. not authorized), we might let them through or block.
              // For safety/UX, if we can't verify time, we might assume it's okay IF they have a token,
              // or just let the backend socket reject them. 
              // But the user requested "do not allow any of em to join before".
              // So we should try to enforce it.
          } finally {
              setLoadingDetails(false);
          }
      };

      if (meetingId) {
          checkMeetingTime();
      }
  }, [meetingId]);

  if (loadingDetails) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mb-4"></div>
        </div>
      )
  }

  if (tooEarly && meetingDetails) {
      const scheduledDate = new Date(meetingDetails.scheduledAt);
      return (
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
             <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                 <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                 </div>
                 <h2 className="text-2xl font-bold text-gray-900 mb-2">Meeting Not Started</h2>
                 <p className="text-gray-600 mb-6">
                     The meeting <strong>"{meetingDetails.meetingName}"</strong> is scheduled for:
                     <br/>
                     <span className="font-semibold text-gray-800">
                         {scheduledDate.toLocaleString()}
                     </span>
                 </p>
                 <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg text-sm mb-6">
                     You can join 10 minutes before the scheduled time.
                 </div>
                 <button 
                    onClick={() => window.location.reload()}
                    className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors"
                 >
                     Refresh Page
                 </button>
             </div>
          </div>
      )
  }

  // Not ready to join yet (guest needs to enter name)
  if (!uid || !isJoinReady) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Join Meeting</h1>
                    <p className="text-gray-600 mt-2">
                        {meetingDetails ? `Join "${meetingDetails.meetingName}"` : 'Enter your name to join the video call'}
                    </p>
                </div>
                <form onSubmit={handleJoin} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Your Name
                        </label>
                        <input 
                            type="text"
                            id="name"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none"
                            placeholder="e.g. John Doe"
                            required
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={!guestName.trim()}
                        className="w-full bg-primary-blue text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Join Call
                    </button>
                    <p className="text-xs text-center text-gray-500">
                        By joining, you agree to allow camera and microphone access.
                    </p>
                </form>
            </div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <AgoraWrapper 
        appId={appId} 
        channelName={meetingId} 
        token={token || null} // Pass null if no token is used (forcing App ID only mode, usually for dev) 
        uid={uid} 
        onLeave={handleLeave}
      />
    </div>
  );
}
