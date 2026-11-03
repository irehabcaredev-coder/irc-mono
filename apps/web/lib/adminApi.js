import { apiGet, apiPost, apiGetBlob, ApiError } from './apiClient'

const withAdmin = { useAdminToken: true }

export async function adminLogin(email, password) {
  const response = await apiPost('/admin/login', { email, password })
  return response.data
}

/**
 * RCI card uploads awaiting (or past) review
 * @param {'PENDING'|'APPROVED'|'REJECTED'} status
 */
export async function fetchRciSubmissions(status = 'PENDING', page = 1) {
  return await apiGet(`/admin/rci-submissions?status=${status}&page=${page}&limit=20`, withAdmin)
}

export async function fetchRciSubmissionFile(id) {
  return await apiGetBlob(`/admin/rci-submissions/${id}/file`)
}

export async function approveRciSubmission(id) {
  return await apiPost(`/admin/rci-submissions/${id}/approve`, {}, withAdmin)
}

export async function rejectRciSubmission(id, note) {
  return await apiPost(`/admin/rci-submissions/${id}/reject`, { note }, withAdmin)
}

export { ApiError }
