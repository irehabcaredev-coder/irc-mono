'use client';

import React, { useState } from 'react';
import AgoraRTC, {
  AgoraRTCProvider,
  useJoin,
  useLocalCameraTrack,
  useLocalMicrophoneTrack,
  usePublish,
  useRemoteUsers,
  useRTCClient,
  LocalUser,
  RemoteUser,
} from 'agora-rtc-react';

export default function AgoraWrapper({ appId, channelName, token, uid }) {
  const client = useRTCClient(AgoraRTC.createClient({ codec: 'vp8', mode: 'rtc' }));

  if (!appId || !channelName) {
    return <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg text-red-500">Missing App ID or Channel Name</div>;
  }

  return (
    <AgoraRTCProvider client={client}>
      <VideoCall channelName={channelName} appId={appId} token={token} uid={uid} />
    </AgoraRTCProvider>
  );
}

function VideoCall({ appId, channelName, token, uid }) {
  const { isLoading: isLoadingMic, localMicrophoneTrack } = useLocalMicrophoneTrack();
  const { isLoading: isLoadingCam, localCameraTrack } = useLocalCameraTrack();
  const remoteUsers = useRemoteUsers();
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  useJoin({
    appid: appId,
    channel: channelName,
    token: token || null,
    uid: uid || null,
  });

  usePublish([localMicrophoneTrack, localCameraTrack]);

  // Handle toggles
  const toggleMic = () => {
    if (localMicrophoneTrack) {
        localMicrophoneTrack.setEnabled(!micOn);
        setMicOn(!micOn);
    }
  };

  const toggleCamera = () => {
      if (localCameraTrack) {
          localCameraTrack.setEnabled(!cameraOn);
          setCameraOn(!cameraOn);
      }
  };

  const deviceLoading = isLoadingMic || isLoadingCam;
  if (deviceLoading) return <div className="flex flex-col items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="mt-2">Loading devices...</p></div>;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Local User */}
        <div className="relative rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center aspect-video md:aspect-auto">
          <LocalUser
            audioTrack={localMicrophoneTrack}
            cameraOn={cameraOn}
            micOn={micOn}
            videoTrack={localCameraTrack}
            cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg"
          >
             <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm z-10">You ({micOn ? 'Mic On' : 'Mic Off'})</div>
          </LocalUser>
        </div>

        {/* Remote Users */}
        {remoteUsers.map((user) => (
          <div key={user.uid} className="relative rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center aspect-video md:aspect-auto">
            <RemoteUser user={user} cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg">
                 <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm z-10">User {user.uid}</div>
            </RemoteUser>
          </div>
        ))}

        {remoteUsers.length === 0 && (
            <div className="rounded-lg bg-gray-800 flex items-center justify-center aspect-video md:aspect-auto">
                <p className="text-gray-400">Waiting for others to join...</p>
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-16 bg-gray-800 flex items-center justify-center gap-4">
        <button 
            onClick={toggleMic}
            className={`px-4 py-2 rounded-full font-semibold transition-colors ${micOn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
        >
            {micOn ? 'Mute Mic' : 'Unmute Mic'}
        </button>
        <button 
            onClick={toggleCamera}
             className={`px-4 py-2 rounded-full font-semibold transition-colors ${cameraOn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
        >
            {cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
        </button>
      </div>
    </div>
  );
}
