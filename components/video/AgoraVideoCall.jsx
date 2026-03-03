'use client';

import { useRef, useEffect, useState } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Users,  
  Layout, Settings, MoreVertical
} from 'lucide-react';
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

export default function AgoraWrapper({ appId, channelName, token, uid, onLeave }) {
  const client = useRTCClient(AgoraRTC.createClient({ codec: 'vp8', mode: 'rtc' }));

  if (!appId || !channelName) {
    return <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg text-red-500">Missing App ID or Channel Name</div>;
  }

  return (
    <AgoraRTCProvider client={client}>
      <VideoCall channelName={channelName} appId={appId} token={token} uid={uid} onLeave={onLeave} />
    </AgoraRTCProvider>
  );
}

function VideoCall({ appId, channelName, token, uid, onLeave }) {
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

  const leaveCall = () => {
      if (onLeave) {
          onLeave();
      } else {
          window.close();
      }
  };

  const deviceLoading = isLoadingMic || isLoadingCam;
  if (deviceLoading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg font-medium text-gray-300">Connecting to secure room...</p>
    </div>
  );

  const totalUsers = remoteUsers.length + 1;
  const isOneOnOne = totalUsers <= 2;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* Header Info - Floating */}
      <div className="absolute top-6 left-6 z-20 pointer-events-none">
         <div className="bg-gray-900/40 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-2xl flex items-center space-x-3 pointer-events-auto shadow-xl">
             <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <div>
                 <h1 className="font-semibold text-sm text-white/90">Secure Meeting</h1>
                 <p className="text-[10px] text-white/50 tracking-wider font-mono uppercase">{channelName.slice(0, 8)}...</p>
            </div>
            <div className="h-8 w-px bg-white/10 mx-2"></div>
            <div className="flex items-center space-x-1.5 text-white/70">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">{totalUsers}</span>
            </div>
         </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 p-4 md:p-6 flex items-center justify-center relative z-0">
        <div className={`
             grid gap-4 md:gap-6 w-full h-full transition-all duration-500 ease-spring
             ${remoteUsers.length === 0 ? 'grid-cols-1 max-w-5xl md:aspect-video max-h-[85vh]' : ''} 
             ${remoteUsers.length === 1 ? 'grid-cols-1 md:grid-cols-2 max-w-7xl max-h-[85vh] md:aspect-[32/9]' : ''} 
             ${remoteUsers.length >= 2 ? 'grid-cols-2 md:grid-cols-3 max-w-7xl max-h-[85vh]' : ''}
        `}>
            {/* Local User */}
            <div className="relative rounded-3xl overflow-hidden bg-gray-900 ring-1 ring-white/10 shadow-2xl transition-all duration-300 group">
                <LocalUser
                    audioTrack={localMicrophoneTrack}
                    cameraOn={cameraOn}
                    micOn={micOn}
                    videoTrack={localCameraTrack}
                    cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg"
                    style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                >
                     {/* Name Tag */}
                     <div className="absolute bottom-4 left-4 z-20">
                         <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center space-x-2 border border-white/5">
                            <span className="font-semibold text-sm text-white/90">{uid} (You)</span>
                            {!micOn && <MicOff className="w-3 h-3 text-red-400" />}
                         </div>
                     </div>
                </LocalUser>
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none opacity-60"></div>
            </div>

            {/* Remote Users */}
            {remoteUsers.map((user) => (
            <div key={user.uid} className="relative rounded-3xl overflow-hidden bg-gray-900 ring-1 ring-white/10 shadow-2xl transition-all duration-300">
                <RemoteUser 
                    user={user} 
                    cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg"
                    style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                >
                    <div className="absolute bottom-4 left-4 z-20">
                         <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
                            <span className="font-semibold text-sm text-white/90">{user.uid}</span>
                         </div>
                    </div>
                </RemoteUser>
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none opacity-60"></div>
            </div>
            ))}
        </div>
        
        {/* Waiting State Overlay - Only if alone */}
        {remoteUsers.length === 0 && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                 <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl text-center max-w-sm mx-auto shadow-2xl animate-fade-in-up">
                      <div className="h-14 w-14 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 relative">
                          <Users className="w-6 h-6 text-gray-400" />
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-ping"></div>
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full"></div>
                      </div>
                      <h3 className="text-lg font-semibold text-white">Waiting for others</h3>
                      <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                        You are currently the only one here. The video will resize when others join.
                      </p>
                 </div>
             </div>
        )}
      </div>

      {/* Control Bar - Floating at bottom */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-gray-900/80 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-3 flex items-center space-x-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all hover:scale-[1.02] hover:bg-gray-900/90">
            
            <button 
                onClick={toggleMic}
                className={`h-12 w-12 flex items-center justify-center rounded-full transition-all duration-300 ${
                    micOn 
                    ? 'bg-gray-800 text-white hover:bg-gray-700 ring-1 ring-white/5' 
                    : 'bg-red-500/10 text-red-500 hover:bg-red-500/20 ring-1 ring-red-500/30'
                }`}
                title={micOn ? "Mute Microphone" : "Unmute Microphone"}
            >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button 
                onClick={toggleCamera}
                className={`h-12 w-12 flex items-center justify-center rounded-full transition-all duration-300 ${
                    cameraOn 
                    ? 'bg-gray-800 text-white hover:bg-gray-700 ring-1 ring-white/5' 
                    : 'bg-red-500/10 text-red-500 hover:bg-red-500/20 ring-1 ring-red-500/30'
                }`}
                title={cameraOn ? "Turn Camera Off" : "Turn Camera On"}
            >
                {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <div className="w-px h-8 bg-white/10 mx-2"></div>

            <button 
                onClick={leaveCall}
                className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium flex items-center space-x-2 transition-all duration-300 shadow-lg shadow-red-600/20"
            >
                <PhoneOff className="w-5 h-5" />
                <span className="text-sm">Leave</span>
            </button>
          </div>
      </div>
    </div>
  );
}
