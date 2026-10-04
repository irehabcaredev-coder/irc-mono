import { apiGet, apiPost } from './apiClient'

/** Public meeting info (name + schedule) for the join screen. */
export async function getMeetingDetails(meetingId) {
  return apiGet(`/meetings/${meetingId}`, { skipAuth: true })
}

/**
 * Ask the backend for a LiveKit token.
 * role: 'doctor' | 'patient' sends that user's JWT; null joins as a guest using `name`.
 * Rejects with ApiError; errorCode may be MEETING_NOT_STARTED / MEETING_ENDED.
 */
export async function getMeetingToken(meetingId, { role, name }) {
  return apiPost(`/meetings/${meetingId}/token`, { name }, {
    skipAuth: !role,
    usePatientToken: role === 'patient',
  })
}
