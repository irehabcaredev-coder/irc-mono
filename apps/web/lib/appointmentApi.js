import { apiGet, ApiError } from './apiClient'

/**
 * Appointment API Functions
 * All functions follow the API spec from apis.md
 */

/**
 * Get Patient's Appointments
 * Retrieves paginated list of patient's appointments
 * @param {number} page - Page number (default 1)
 * @param {number} limit - Items per page (default 10)
 * @returns {Promise<{success: boolean, data: array, meta: object}>}
 */
export async function fetchPatientAppointments(page = 1, limit = 10) {
    try {
        const response = await apiGet(
            `/appointments/patient/my-appointments?page=${page}&limit=${limit}`,
            {
                skipAuth: false,
                usePatientToken: true, // Requires patient auth token
            }
        )
        return response
    } catch (error) {
        if (error instanceof ApiError) {
            throw error
        }
        throw new ApiError('Failed to fetch appointments', 0, 'UNKNOWN_ERROR')
    }
}
