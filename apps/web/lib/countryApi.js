import { apiGet } from './apiClient'

export async function fetchCountries() {
  const response = await apiGet('/countries', { skipAuth: true })
  return response.data
}
