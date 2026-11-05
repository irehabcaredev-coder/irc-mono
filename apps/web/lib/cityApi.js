import { apiGet, apiPost } from './apiClient'

export async function searchCities(q, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (q?.trim()) params.set('q', q.trim())
  const response = await apiGet(`/cities?${params}`, { skipAuth: true })
  return response.data
}

// Pass usePatientToken when a patient is the one adding the city
export async function addCity(name, state, { usePatientToken = false } = {}) {
  const response = await apiPost('/cities', { name, state }, { usePatientToken })
  return response.data
}
