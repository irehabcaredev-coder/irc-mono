import { WebSocketServer, WebSocket, RawData } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { URL } from 'url';

interface Participant {
    socket: WebSocket;
    identity: string;
    name: string;
    userType: string;
    isAlive: boolean;
}

interface Room {
    meetingId: string;
    participants: Map<string, Participant>;
}

// This is a 1:1 consultation call (offers/answers are relayed to "the other peer")
const MAX_PARTICIPANTS = 2;

// In-memory rooms map: meetingId -> Room
const rooms = new Map<string, Room>();

const getOrCreateRoom = (meetingId: string): Room => {
    let room = rooms.get(meetingId);
    if (!room) {
        room = { meetingId, participants: new Map() };
        rooms.set(meetingId, room);
    }
    return room;
};

const broadcastToRoom = (room: Room, data: any, excludeIdentity?: string) => {
    const message = JSON.stringify(data);
    for (const [identity, participant] of room.participants) {
        if (excludeIdentity && identity === excludeIdentity) continue;
        if (participant.socket.readyState === WebSocket.OPEN) {
            try {
                participant.socket.send(message);
            } catch (err) {
                console.error(`[signaling] Failed to send message to ${identity}:`, err);
            }
        }
    }
};

export const setupSignalingServer = (server: HttpServer) => {
    // SDP blobs are a few KB; anything much bigger is not legitimate signaling
    const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });

    server.on('upgrade', (request: IncomingMessage, socket, head) => {
        try {
            const parsedUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
            if (parsedUrl.pathname === '/ws/meeting') {
                wss.handleUpgrade(request, socket, head, (ws) => {
                    wss.emit('connection', ws, request);
                });
            } else {
                // Not ours. If another WebSocket endpoint shares this server, remove this branch
                // and let that handler deal with the socket instead.
                socket.destroy();
            }
        } catch (err) {
            console.error('[signaling] Upgrade error:', err);
            socket.destroy();
        }
    });

    wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
        try {
            const parsedUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
            const token = parsedUrl.searchParams.get('token');
            const meetingIdFromQuery = parsedUrl.searchParams.get('meetingId');

            if (!token) {
                socket.close(4001, 'Authentication token missing');
                return;
            }

            const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';
            if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
                console.warn('[signaling] JWT_SECRET is not set, using the insecure default!');
            }

            let payload: any;
            try {
                payload = jwt.verify(token, jwtSecret);
            } catch (err: any) {
                console.warn('[signaling] Invalid meeting token:', err.message);
                socket.close(4001, 'Invalid or expired meeting token');
                return;
            }

            const meetingId = String(payload.meetingId);
            if (meetingIdFromQuery && meetingIdFromQuery !== meetingId) {
                socket.close(4002, 'Meeting ID mismatch');
                return;
            }

            const identity = String(payload.identity);
            const name = String(payload.name || 'Participant');
            const userType = String(payload.userType || 'guest');

            const room = getOrCreateRoom(meetingId);

            // Room-full check: other identities that are actually connected
            const otherOpen = Array.from(room.participants.values()).filter(
                (p) => p.identity !== identity && p.socket.readyState === WebSocket.OPEN
            ).length;
            if (otherOpen >= MAX_PARTICIPANTS) {
                socket.close(4003, 'This meeting already has two participants');
                if (room.participants.size === 0) rooms.delete(meetingId);
                return;
            }

            // If this identity already has a socket (refresh, second tab, React StrictMode
            // double mount), the newer connection wins. The old one is closed below, and its
            // close handler checks it is still the current socket before touching the room.
            const existing = room.participants.get(identity);
            if (existing && existing.socket !== socket) {
                try {
                    existing.socket.close(4000, 'Joined from another tab or window');
                } catch (_) { }
            }

            const participant: Participant = {
                socket,
                identity,
                name,
                userType,
                isAlive: true,
            };
            room.participants.set(identity, participant);

            console.log(
                `[signaling] User ${name} (${identity}) joined room ${meetingId}. Total: ${room.participants.size}`
            );

            // Confirmation and the list of peers already in the room
            const existingPeers = Array.from(room.participants.values())
                .filter((p) => p.identity !== identity)
                .map((p) => ({ identity: p.identity, name: p.name, userType: p.userType }));

            socket.send(
                JSON.stringify({
                    type: 'joined',
                    roomName: meetingId,
                    identity,
                    name,
                    peers: existingPeers,
                })
            );

            // Notify the existing participant about the newcomer
            broadcastToRoom(
                room,
                {
                    type: 'user-joined',
                    peer: { identity, name, userType },
                },
                identity
            );

            socket.on('message', (raw: RawData) => {
                try {
                    const data = JSON.parse(raw.toString());

                    // Ignore traffic from a socket that has been replaced
                    if (room.participants.get(identity)?.socket !== socket) return;

                    switch (data.type) {
                        case 'offer':
                            broadcastToRoom(
                                room,
                                { type: 'offer', sdp: data.sdp, sender: { identity, name } },
                                identity
                            );
                            break;

                        case 'answer':
                            broadcastToRoom(
                                room,
                                { type: 'answer', sdp: data.sdp, sender: { identity, name } },
                                identity
                            );
                            break;

                        case 'ice-candidate':
                            broadcastToRoom(
                                room,
                                { type: 'ice-candidate', candidate: data.candidate, sender: { identity } },
                                identity
                            );
                            break;

                        case 'media-state': {
                            // camera/mic/screen-share flags so the other side can show an avatar
                            const s = data.state || {};
                            broadcastToRoom(
                                room,
                                {
                                    type: 'media-state',
                                    state: {
                                        cameraOff: !!s.cameraOff,
                                        micMuted: !!s.micMuted,
                                        screenSharing: !!s.screenSharing,
                                    },
                                    sender: { identity },
                                },
                                identity
                            );
                            break;
                        }

                        case 'ping':
                            participant.isAlive = true;
                            socket.send(JSON.stringify({ type: 'pong' }));
                            break;

                        case 'leave':
                            socket.close(1000, 'User clicked leave');
                            break;

                        default:
                            console.warn(`[signaling] Unknown message type: ${data.type}`);
                    }
                } catch (err) {
                    console.error('[signaling] Error parsing message:', err);
                }
            });

            socket.on('pong', () => {
                participant.isAlive = true;
            });

            socket.on('close', (code) => {
                console.log(
                    `[signaling] User ${name} (${identity}) disconnected from ${meetingId}. Code: ${code}`
                );
                // A newer connection for the same identity replaced this one: leave it alone
                if (room.participants.get(identity)?.socket !== socket) return;

                room.participants.delete(identity);
                if (room.participants.size === 0) {
                    rooms.delete(meetingId);
                } else {
                    broadcastToRoom(room, {
                        type: 'user-left',
                        peer: { identity, name },
                    });
                }
            });

            socket.on('error', (err) => {
                console.error(`[signaling] Socket error for ${identity}:`, err);
            });
        } catch (err) {
            console.error('[signaling] Connection setup error:', err);
            socket.close(1011, 'Internal signaling error');
        }
    });

    // Heartbeat check every 25 seconds
    const interval = setInterval(() => {
        for (const [meetingId, room] of rooms) {
            for (const [identity, participant] of Array.from(room.participants)) {
                if (!participant.isAlive) {
                    console.log(`[signaling] Terminating dead socket for ${identity} in ${meetingId}`);
                    room.participants.delete(identity); // delete first so the close handler skips it
                    participant.socket.terminate();
                    broadcastToRoom(room, {
                        type: 'user-left',
                        peer: { identity: participant.identity, name: participant.name },
                    });
                    continue;
                }
                participant.isAlive = false;
                if (participant.socket.readyState === WebSocket.OPEN) {
                    try {
                        participant.socket.ping();
                    } catch (_) { }
                }
            }
            if (room.participants.size === 0) {
                rooms.delete(meetingId);
            }
        }
    }, 25000);

    wss.on('close', () => {
        clearInterval(interval);
    });

    console.log('[signaling] WebRTC signaling server initialized on /ws/meeting');
    return wss;
};