'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import AgoraWrapper from '@/components/video/AgoraVideoCall';

export default function MeetingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const meetingId = params.meetingId;
  const token = searchParams.get('token'); // Optional: Retrieve token from URL if provided (e.g. from backend response)
  
  // In a real app, you might fetch meeting details here to get the App ID, specific Channel Name,
  // or a generated RTM/RTC token from your backend if it's dynamic.
  // For now, we'll use the ENV App ID and the meetingId as the channel name.
  
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const [uid, setUid] = useState(null);

  useEffect(() => {
    // Generate a random UID for the user if not provided (Agora recommends number for web)
    setUid(Math.floor(Math.random() * 100000));
  }, []);

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

  if (!uid) return null; // Wait for client-side hydration

  return (
    <div className="min-h-screen bg-gray-900">
      <AgoraWrapper 
        appId={appId} 
        channelName={meetingId} 
        token={token || null} // Pass null if no token is used (forcing App ID only mode, usually for dev) 
        uid={uid} 
      />
    </div>
  );
}
