import { apiGet, apiPost } from './apiClient'

/** Meeting info (name + schedule) for the join screen. Only the doctor or patient of the appointment may read it. */
export async function getMeetingDetails(meetingId, { role }) {
  return apiGet(`/meetings/${meetingId}`, { usePatientToken: role === 'patient' })
}

/**
 * Ask the backend for a WebRTC signaling token.
 * role: 'doctor' | 'patient' sends that user's JWT. There is no guest access: both sides must be signed in.
 * Rejects with ApiError; errorCode may be MEETING_NOT_STARTED / MEETING_ENDED.
 */
export async function getMeetingToken(meetingId, { role }) {
  return apiPost(`/meetings/${meetingId}/token`, {}, { usePatientToken: role === 'patient' })
}
