'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { useDoctorStore } from '@/store/useDoctorStore';
import { usePatientStore } from '@/store/usePatientStore';
import { getMeetingDetails, getMeetingToken } from '@/lib/meetingApi';

// Dynamically import the call UI with SSR disabled (LiveKit needs browser APIs)
const LiveKitVideoCall = nextDynamic(() => import('@/components/video/LiveKitVideoCall'), { 
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
  const meetingId = params.meetingId;

  const [uid, setUid] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [isJoinReady, setIsJoinReady] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [tooEarly, setTooEarly] = useState(false);
  const [connection, setConnection] = useState(null); // { token, url, roomName }
  const [joinError, setJoinError] = useState(null); // { code, message }

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

  const role = isDoctorAuthed ? 'doctor' : isPatientAuthed ? 'patient' : null;

  useEffect(() => {
    if (!meetingId) return;
    (async () => {
      try {
        const { data } = await getMeetingDetails(meetingId);
        setMeetingDetails(data);
        const tenMinutes = 10 * 60 * 1000;
        setTooEarly(new Date(data.scheduledAt).getTime() - Date.now() > tenMinutes);
      } catch (err) {
        setJoinError({ code: err.errorCode, message: err.status === 404 ? 'This meeting does not exist.' : err.message });
      } finally {
        setLoadingDetails(false);
      }
    })();
  }, [meetingId]);

  // Once we know who is joining (and it is not too early), get a LiveKit token from the backend
  useEffect(() => {
    if (!isJoinReady || !uid || tooEarly || connection || joinError || loadingDetails) return;
    let cancelled = false;
    getMeetingToken(meetingId, { role, name: uid })
      .then(({ data }) => {
        if (!cancelled) setConnection({ token: data.token, url: data.url, roomName: data.roomName });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.errorCode === 'MEETING_NOT_STARTED') setTooEarly(true);
        else setJoinError({ code: err.errorCode, message: err.message });
      });
    return () => { cancelled = true; };
  }, [isJoinReady, uid, tooEarly, connection, joinError, loadingDetails, meetingId, role]);

  if (loadingDetails) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mb-4"></div>
        </div>
      )
  }

  if (joinError) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
             <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                 <h2 className="text-2xl font-bold text-gray-900 mb-2">
                     {joinError.code === 'MEETING_ENDED' ? 'Meeting Ended' : "Can't Join Meeting"}
                 </h2>
                 <p className="text-gray-600 mb-6">{joinError.message}</p>
                 <button
                    onClick={handleLeave}
                    className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors"
                 >
                     Go Back
                 </button>
             </div>
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

  if (!connection) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mb-4"></div>
          <p>Joining meeting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <LiveKitVideoCall
        serverUrl={connection.url}
        token={connection.token}
        roomName={connection.roomName}
        onLeave={handleLeave}
      />
    </div>
  );
}
