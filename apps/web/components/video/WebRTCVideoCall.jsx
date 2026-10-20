'use client';

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Monitor,
  MonitorOff,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const VIDEO_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: 'user',
};

const DEFAULT_REMOTE_STATE = { cameraOff: false, micMuted: false, screenSharing: false };

// Add ICE candidates that arrived before the remote description was set
async function drainCandidates(pc, queueRef) {
  while (queueRef.current.length > 0) {
    const cand = queueRef.current.shift();
    try {
      await pc.addIceCandidate(cand);
    } catch (e) {
      console.warn('[WebRTC] Error adding queued ICE candidate:', e);
    }
  }
}

export default function WebRTCVideoCall({
  token,
  roomName,
  identity,
  name,
  onLeave,
  iceServers = DEFAULT_ICE_SERVERS,
  wsUrl,
}) {
  const [localStream, setLocalStream] = useState(null);
  const [remotePeer, setRemotePeer] = useState(null);
  const [remoteState, setRemoteState] = useState(DEFAULT_REMOTE_STATE);
  const [mediaReady, setMediaReady] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting' | 'connected' | 'waiting' | 'failed'
  const [deviceError, setDeviceError] = useState(null);
  const [deviceWarning, setDeviceWarning] = useState(null);
  const [needsPlayClick, setNeedsPlayClick] = useState(false);

  // Force a re-render when remote track state (muted/ended) changes
  const [, bump] = useReducer((x) => x + 1, 0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const iceCandidatesQueue = useRef([]);
  const screenTrackRef = useRef(null);
  const screenStreamRef = useRef(null);
  const isScreenSharingRef = useRef(false);
  const isOffererRef = useRef(false);
  const iceServersRef = useRef(iceServers);
  iceServersRef.current = iceServers;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getWebSocketUrl = useCallback(() => {
    if (wsUrl) return wsUrl;

    const baseEndpoint = process.env.NEXT_PUBLIC_BASE_ENDPOINT || 'http://localhost:8000';
    try {
      const url = new URL(baseEndpoint);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${url.host}/ws/meeting`;
    } catch {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${window.location.host}/ws/meeting`;
    }
  }, [wsUrl]);

  const sendSignal = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg));
        return true;
      } catch (_) { }
    }
    return false;
  }, []);

  // The RTP sender for audio or video (works on both offerer and answerer side)
  const getSender = useCallback((kind) => {
    const t = pcRef.current?.getTransceivers().find((tr) => tr.receiver?.track?.kind === kind);
    return t ? t.sender : null;
  }, []);

  const attachRemote = useCallback(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    if (el.srcObject !== remoteStreamRef.current) el.srcObject = remoteStreamRef.current;
    const p = el.play();
    if (p && p.catch) {
      p.catch((err) => {
        // Autoplay with sound blocked until the user interacts with the page
        if (err && err.name === 'NotAllowedError') setNeedsPlayClick(true);
      });
    }
  }, []);

  // Callback ref: the remote <video> mounts/unmounts as peers come and go
  const setRemoteVideoEl = useCallback(
    (el) => {
      remoteVideoRef.current = el;
      if (el) attachRemote();
    },
    [attachRemote]
  );

  // Tear down the peer connection and forget the remote media
  const resetPeer = useCallback(() => {
    const pc = pcRef.current;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.oniceconnectionstatechange = null;
      try {
        pc.close();
      } catch (_) { }
      pcRef.current = null;
    }
    iceCandidatesQueue.current = [];
    remoteStreamRef.current = new MediaStream();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    bump();
  }, []);

  // The track we should currently be sending for a given kind
  const currentTrackFor = (kind) => {
    if (kind === 'video' && isScreenSharingRef.current && screenTrackRef.current) {
      return screenTrackRef.current;
    }
    return localStreamRef.current?.getTracks().find((t) => t.kind === kind) || null;
  };

  const createPeerConnection = useCallback(
    (asOfferer) => {
      if (pcRef.current) return pcRef.current;

      const servers = iceServersRef.current;
      const pc = new RTCPeerConnection({
        iceServers: servers && servers.length > 0 ? servers : DEFAULT_ICE_SERVERS,
      });

      // The offerer creates one audio and one video transceiver up front. Cameras, mics
      // and screen shares are then swapped in with replaceTrack, so no renegotiation is needed.
      // (The answerer gets its transceivers from the remote offer, see the 'offer' case.)
      if (asOfferer) {
        const stream = localStreamRef.current;
        ['audio', 'video'].forEach((kind) => {
          const track = currentTrackFor(kind);
          pc.addTransceiver(track || kind, {
            direction: 'sendrecv',
            streams: track && stream ? [stream] : [],
          });
        });
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal({ type: 'ice-candidate', candidate: e.candidate });
      };

      pc.ontrack = (e) => {
        console.log('[WebRTC] Received remote track:', e.track.kind);
        const rs = remoteStreamRef.current;
        if (!rs.getTracks().includes(e.track)) rs.addTrack(e.track);
        e.track.onunmute = bump;
        e.track.onmute = bump;
        e.track.onended = bump;
        attachRemote();
        bump();
      };

      pc.oniceconnectionstatechange = async () => {
        if (pcRef.current !== pc) return;
        const s = pc.iceConnectionState;
        console.log('[WebRTC] ICE Connection State:', s);
        if (s === 'connected' || s === 'completed') {
          setConnectionStatus('connected');
        } else if (s === 'disconnected') {
          setConnectionStatus('waiting');
        } else if (s === 'failed' && isOffererRef.current) {
          // Only the offerer restarts ICE, so both sides never offer at once
          try {
            console.warn('[WebRTC] ICE failed. Restarting ICE...');
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            sendSignal({ type: 'offer', sdp: pc.localDescription });
          } catch (err) {
            console.error('[WebRTC] ICE restart failed:', err);
          }
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [attachRemote, sendSignal]
  );

  // ---------------------------------------------------------------------------
  // Leave
  // ---------------------------------------------------------------------------

  const handleLeave = useCallback(() => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    const ws = wsRef.current;
    wsRef.current = null; // handlers ignore events from a socket that is no longer current
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'leave' }));
      } catch (_) { }
      ws.close();
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (_) { }
      pcRef.current = null;
    }
    if (onLeave) onLeave();
    else window.location.href = '/';
  }, [onLeave]);

  // ---------------------------------------------------------------------------
  // Local media (camera + mic) with fallbacks
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let active = true;

    async function initMedia() {
      let stream = null;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (active) {
          setIsCameraOff(true);
          setIsMicMuted(true);
          setDeviceError(
            'Camera and microphone need a secure (https) connection. You joined in listen-only mode.'
          );
          setMediaReady(true);
        }
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: VIDEO_CONSTRAINTS,
          audio: AUDIO_CONSTRAINTS,
        });
        if (active) {
          setIsCameraOff(false);
          setIsMicMuted(false);
        }
      } catch (videoErr) {
        console.warn('[WebRTC] Full video+audio media request failed:', videoErr);

        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
          if (active) {
            setIsCameraOff(true);
            setIsMicMuted(false);
            setDeviceWarning(
              videoErr.name === 'NotReadableError'
                ? 'Camera is in use by another tab or app. Connected with microphone only.'
                : 'Camera is unavailable. Connected with microphone only.'
            );
          }
        } catch (audioErr) {
          console.warn('[WebRTC] Microphone fallback also failed:', audioErr);
          if (active) {
            setIsCameraOff(true);
            setIsMicMuted(true);
            setDeviceError(
              videoErr.name === 'NotAllowedError' || audioErr.name === 'NotAllowedError'
                ? 'Camera/microphone access was denied. You joined in listen-only mode.'
                : 'Could not access camera or microphone. You joined in listen-only mode.'
            );
          }
        }
      }

      if (!active) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (stream) {
        localStreamRef.current = stream;
        setLocalStream(stream);
      }
      // Always flag media as ready so the signaling connection proceeds
      setMediaReady(true);
    }

    initMedia();

    return () => {
      active = false;
    };
  }, []);

  // Release devices when the component unmounts
  useEffect(() => {
    return () => {
      if (screenTrackRef.current) screenTrackRef.current.stop();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Keep the local preview in sync (the <video> element is always mounted)
  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    const src = isScreenSharing ? screenStreamRef.current : localStream;
    if (el.srcObject !== src) el.srcObject = src;
  }, [localStream, isScreenSharing]);

  // ---------------------------------------------------------------------------
  // Signaling
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!token || !roomName || !mediaReady) return;

    const signalingEndpoint = `${getWebSocketUrl()}?token=${encodeURIComponent(
      token
    )}&meetingId=${encodeURIComponent(roomName)}`;
    console.log('[WebRTC] Connecting to signaling server');

    const ws = new WebSocket(signalingEndpoint);
    wsRef.current = ws;

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch (_) { }
      }
    }, 15000);

    ws.onopen = () => {
      console.log('[WebRTC] Connected to signaling server');
      setConnectionStatus('waiting');
    };

    const handleMessage = async (event) => {
      if (wsRef.current !== ws) return; // stale socket
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'joined': {
          console.log('[WebRTC] Joined room. Peers:', data.peers);
          const peers = data.peers || [];
          if (peers.length > 0) {
            // Someone is already here: the newcomer is always the offerer
            setRemotePeer(peers[0]);
            isOffererRef.current = true;
            resetPeer();
            const pc = createPeerConnection(true);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal({ type: 'offer', sdp: pc.localDescription });
          }
          break;
        }

        case 'user-joined': {
          console.log('[WebRTC] New user joined room:', data.peer);
          setRemotePeer(data.peer);
          setRemoteState(DEFAULT_REMOTE_STATE);
          isOffererRef.current = false;
          // Fresh start. The newcomer will send us an offer.
          resetPeer();
          break;
        }

        case 'offer': {
          console.log('[WebRTC] Received offer from:', data.sender);
          if (data.sender) setRemotePeer(data.sender);

          let pc = pcRef.current;
          if (pc && isOffererRef.current && pc.signalingState !== 'stable') {
            console.warn('[WebRTC] Ignoring offer while our own offer is pending');
            break;
          }
          const isFirstOffer = !pc || !pc.remoteDescription;
          if (!pc) pc = createPeerConnection(false);

          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

          if (isFirstOffer) {
            // Transceivers were created by the remote offer. Attach our tracks and send back.
            for (const t of pc.getTransceivers()) {
              const kind = t.receiver?.track?.kind;
              if (!kind) continue;
              const track = currentTrackFor(kind);
              try {
                if (track) await t.sender.replaceTrack(track);
              } catch (e) {
                console.warn('[WebRTC] replaceTrack on answer failed:', e);
              }
              try {
                t.direction = 'sendrecv';
              } catch (_) { }
            }
          }

          await drainCandidates(pc, iceCandidatesQueue);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ type: 'answer', sdp: pc.localDescription });
          break;
        }

        case 'answer': {
          console.log('[WebRTC] Received answer from peer');
          const pc = pcRef.current;
          if (pc && pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            await drainCandidates(pc, iceCandidatesQueue);
          }
          break;
        }

        case 'ice-candidate': {
          if (!data.candidate) break;
          const pc = pcRef.current;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(data.candidate);
            } catch (e) {
              console.warn('[WebRTC] Failed to add ICE candidate:', e);
            }
          } else {
            iceCandidatesQueue.current.push(data.candidate);
          }
          break;
        }

        case 'media-state': {
          if (data.state) setRemoteState({ ...DEFAULT_REMOTE_STATE, ...data.state });
          break;
        }

        case 'user-left': {
          console.log('[WebRTC] Participant left the call');
          setRemotePeer(null);
          setRemoteState(DEFAULT_REMOTE_STATE);
          setConnectionStatus('waiting');
          isOffererRef.current = false;
          resetPeer();
          break;
        }

        case 'error': {
          console.error('[WebRTC] Server error:', data.message);
          setDeviceError(data.message || 'Room connection error');
          break;
        }

        default:
          break;
      }
    };

    // Process signaling messages strictly one at a time, in arrival order
    let chain = Promise.resolve();
    ws.onmessage = (event) => {
      chain = chain
        .then(() => handleMessage(event))
        .catch((err) => console.error('[WebRTC] Failed to process message:', err));
    };

    ws.onerror = (err) => {
      if (wsRef.current !== ws) return;
      console.error('[WebRTC] Signaling WebSocket error:', err);
      setConnectionStatus('failed');
    };

    ws.onclose = (event) => {
      clearInterval(pingInterval);
      if (wsRef.current !== ws) return; // intentional close or replaced
      console.log('[WebRTC] Signaling socket closed:', event.code, event.reason);
      setConnectionStatus('failed');
      if (event.code !== 1000) {
        setDeviceError(event.reason || 'Lost connection to the meeting server.');
      }
      if (event.code >= 4000) {
        setRemotePeer(null);
        resetPeer();
      }
    };

    return () => {
      clearInterval(pingInterval);
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'leave' }));
      } catch (_) { }
      if (wsRef.current === ws) wsRef.current = null;
      ws.close();
      setRemotePeer(null);
      isOffererRef.current = false;
      resetPeer();
    };
  }, [token, roomName, mediaReady, createPeerConnection, getWebSocketUrl, resetPeer, sendSignal]);

  // Tell the other side whether our camera/mic/screen are on, so it can show an avatar
  // instead of black frames. Re-sent whenever the peer changes or our state changes.
  useEffect(() => {
    if (!remotePeer) return;
    const hasVideoTrack = (localStream?.getVideoTracks().length ?? 0) > 0;
    sendSignal({
      type: 'media-state',
      state: {
        cameraOff: isCameraOff || !hasVideoTrack,
        micMuted: isMicMuted,
        screenSharing: isScreenSharing,
      },
    });
  }, [remotePeer, isCameraOff, isMicMuted, isScreenSharing, localStream, sendSignal]);

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

  const toggleMic = async () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted(!audioTrack.enabled);
      return;
    }

    // No mic yet (denied or missing at join): try to acquire it now
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
      const newTrack = s.getAudioTracks()[0];
      const stream = localStreamRef.current || new MediaStream();
      stream.addTrack(newTrack);
      localStreamRef.current = stream;
      setLocalStream(new MediaStream(stream.getTracks()));
      setIsMicMuted(false);
      setDeviceError(null);
      await getSender('audio')?.replaceTrack(newTrack);
    } catch (err) {
      console.error('Failed to acquire microphone on retry:', err);
    }
  };

  const toggleCamera = async () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
      return;
    }

    // No camera yet (locked by another tab/app at join): try again now
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
      const newTrack = s.getVideoTracks()[0];
      const stream = localStreamRef.current || new MediaStream();
      stream.addTrack(newTrack);
      localStreamRef.current = stream;
      setLocalStream(new MediaStream(stream.getTracks()));
      setIsCameraOff(false);
      setDeviceWarning(null);
      setDeviceError(null);
      // If we are sharing the screen, the camera goes back out when sharing stops
      if (!isScreenSharingRef.current) await getSender('video')?.replaceTrack(newTrack);
    } catch (err) {
      console.error('Failed to acquire camera on retry:', err);
      setDeviceWarning('Camera is still in use by another tab or unavailable.');
    }
  };

  const stopScreenShare = useCallback(async () => {
    const t = screenTrackRef.current;
    if (t) {
      t.onended = null;
      t.stop();
    }
    screenTrackRef.current = null;
    screenStreamRef.current = null;
    isScreenSharingRef.current = false;
    const cam = localStreamRef.current?.getVideoTracks()[0] || null;
    try {
      await getSender('video')?.replaceTrack(cam);
    } catch (e) {
      console.warn('[WebRTC] Failed to restore camera track:', e);
    }
    setIsScreenSharing(false);
  }, [getSender]);

  const toggleScreenShare = async () => {
    if (isScreenSharingRef.current) {
      await stopScreenShare();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setDeviceWarning('Screen sharing is not supported in this browser.');
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      try {
        screenTrack.contentHint = 'detail';
      } catch (_) { }
      screenStreamRef.current = screenStream;
      screenTrackRef.current = screenTrack;
      isScreenSharingRef.current = true;

      await getSender('video')?.replaceTrack(screenTrack);

      // Browser's own "Stop sharing" button
      screenTrack.onended = () => {
        stopScreenShare();
      };

      setIsScreenSharing(true);
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const remoteVideoTrack = remoteStreamRef.current
    .getVideoTracks()
    .find((t) => t.readyState === 'live');
  const remoteHasVideo =
    !!remoteVideoTrack &&
    !remoteVideoTrack.muted &&
    (!remoteState.cameraOff || remoteState.screenSharing);

  const showLocalVideo =
    isScreenSharing || (!isCameraOff && (localStream?.getVideoTracks().length ?? 0) > 0);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white relative overflow-hidden select-none font-sans">
      {/* Floating Room Info Header */}
      <div className="absolute top-6 left-6 z-20 pointer-events-none">
        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-2xl flex items-center space-x-3 pointer-events-auto shadow-2xl">
          <div
            className={`h-2.5 w-2.5 rounded-full ${connectionStatus === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : connectionStatus === 'waiting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-red-500'
              }`}
          />
          <div>
            <h1 className="font-semibold text-sm text-white/95">Consultation Room</h1>
            <p className="text-[10px] text-white/50 tracking-wider font-mono uppercase">
              {roomName ? roomName.slice(0, 8) : 'Direct'}...
            </p>
          </div>
          <div className="h-6 w-px bg-white/10 mx-1" />
          <div className="flex items-center space-x-1.5 text-white/80">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold">{remotePeer ? '2' : '1'}</span>
          </div>
        </div>
      </div>

      {/* Device Warnings and Errors Banner */}
      <div className="absolute top-6 right-6 z-20 flex flex-col space-y-2 max-w-sm">
        {deviceWarning && (
          <div className="bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{deviceWarning}</p>
              <button
                onClick={toggleCamera}
                className="mt-1.5 text-[11px] underline font-medium text-amber-300 hover:text-white flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3 inline mr-1" />
                Retry Camera
              </button>
            </div>
          </div>
        )}
        {deviceError && (
          <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="flex-1">{deviceError}</p>
          </div>
        )}
      </div>

      {/* Main Video Stage */}
      <div className="flex-1 p-4 md:p-6 flex items-center justify-center relative z-0">
        <div
          className={`grid gap-4 md:gap-6 w-full h-full max-h-[85vh] transition-all duration-500 ease-out ${remotePeer ? 'grid-cols-1 md:grid-cols-2 max-w-7xl' : 'grid-cols-1 max-w-4xl'
            }`}
        >
          {/* Remote Participant */}
          {remotePeer && (
            <div className="relative rounded-3xl overflow-hidden bg-gray-900 ring-1 ring-white/10 shadow-2xl flex items-center justify-center group">
              {/* Always mounted so audio keeps playing; the avatar is overlaid when there is no video */}
              <video
                ref={setRemoteVideoEl}
                autoPlay
                playsInline
                className={`h-full w-full bg-black ${remoteState.screenSharing ? 'object-contain' : 'object-cover'
                  }`}
              />

              {!remoteHasVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-teal-500/20 mb-3">
                    {remotePeer?.name ? remotePeer.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <p className="text-sm text-gray-300 font-medium">
                    {remotePeer?.name || 'Remote Participant'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {connectionStatus === 'connected' ? 'Camera off' : 'Connecting...'}
                  </p>
                </div>
              )}

              {needsPlayClick && (
                <button
                  onClick={() => {
                    setNeedsPlayClick(false);
                    attachRemote();
                  }}
                  className="absolute inset-0 z-10 bg-black/60 text-white text-sm font-semibold"
                >
                  Click to enable audio
                </button>
              )}

              <div className="absolute bottom-4 left-4 z-20">
                <div className="bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-xl flex items-center space-x-2 border border-white/10">
                  <span className="font-medium text-sm text-white/90">
                    {remotePeer?.name || 'Remote Participant'}
                  </span>
                  {remoteState.micMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none opacity-40" />
            </div>
          )}

          {/* Local User */}
          <div
            className={`relative rounded-3xl overflow-hidden bg-gray-900 ring-1 ring-white/10 shadow-2xl flex items-center justify-center group transition-all duration-300 ${!remotePeer ? 'aspect-video' : ''
              }`}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full ${isScreenSharing ? 'object-contain' : 'object-cover scale-x-[-1]'
                }`}
            />

            {!showLocalVideo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-blue-500/20 mb-3">
                  {name ? name.charAt(0).toUpperCase() : 'Y'}
                </div>
                <p className="text-sm text-gray-400">Camera is turned off</p>
                {deviceWarning && (
                  <button
                    onClick={toggleCamera}
                    className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                  >
                    Click to try enabling camera
                  </button>
                )}
              </div>
            )}

            <div className="absolute bottom-4 left-4 z-20">
              <div className="bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-xl flex items-center space-x-2 border border-white/10">
                <span className="font-medium text-sm text-white/90">
                  {name || 'You'} (You){isScreenSharing ? ' · Sharing screen' : ''}
                </span>
                {isMicMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none opacity-40" />
          </div>
        </div>

        {/* Waiting card when alone in the room */}
        {!remotePeer && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-3xl text-center max-w-sm mx-auto shadow-2xl animate-fade-in">
              <div className="flex items-center justify-center space-x-2.5 mb-1.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                </span>
                <h3 className="text-sm font-semibold text-white/90">Waiting for participant...</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                The call will automatically connect as soon as the other party enters the room.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Control Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-gray-900/80 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-3.5 flex items-center space-x-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:scale-[1.01] hover:bg-gray-900/90">
          <button
            onClick={toggleMic}
            className={`h-12 w-12 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${!isMicMuted
                ? 'bg-gray-800 text-white hover:bg-gray-700 ring-1 ring-white/10'
                : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 ring-1 ring-rose-500/40'
              }`}
            title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {!isMicMuted ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-rose-400" />}
          </button>

          <button
            onClick={toggleCamera}
            className={`h-12 w-12 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${!isCameraOff
                ? 'bg-gray-800 text-white hover:bg-gray-700 ring-1 ring-white/10'
                : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 ring-1 ring-rose-500/40'
              }`}
            title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {!isCameraOff ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5 text-rose-400" />
            )}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`h-12 w-12 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${isScreenSharing
                ? 'bg-blue-600 text-white hover:bg-blue-700 ring-1 ring-blue-400'
                : 'bg-gray-800 text-white hover:bg-gray-700 ring-1 ring-white/10'
              }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>

          <div className="w-px h-8 bg-white/10 mx-1" />

          <button
            onClick={handleLeave}
            className="h-12 px-6 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-medium flex items-center space-x-2 transition-all duration-200 shadow-lg shadow-rose-600/30"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-sm font-semibold">End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}