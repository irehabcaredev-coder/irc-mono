/**
 * Screen Name Utility
 * Generates human-readable screen names from pathnames for analytics/feedback
 */

/**
 * Get doctor screen name from pathname
 * @param {object} params
 * @param {string} params.pathname - Current pathname (e.g., '/dashboard/profile')
 * @returns {string} Human-readable screen name (e.g., 'Doctor Dashboard > Profile')
 */
export function getDoctorScreenName({ pathname }) {
  if (!pathname) {
    return 'Doctor Portal (unknown)'
  }

  // Normalize pathname (remove trailing slashes, ensure it starts with /)
  const normalized = pathname.replace(/\/$/, '') || '/'

  // Map known dashboard routes
  const dashboardRoutes = {
    '/dashboard': 'Doctor Dashboard > Overview',
    '/dashboard/feedback': 'Doctor Dashboard > Feedback',
    '/dashboard/profile': 'Doctor Dashboard > Profile',
    '/dashboard/leads': 'Doctor Dashboard > Leads',
    '/dashboard/settings': 'Doctor Dashboard > Settings',
  }

  // Check for exact match first
  if (dashboardRoutes[normalized]) {
    return dashboardRoutes[normalized]
  }

  // Check if it's a dashboard subroute
  if (normalized.startsWith('/dashboard/')) {
    // Extract the subroute (e.g., '/dashboard/custom' -> 'custom')
    const subroute = normalized.replace('/dashboard/', '')
    if (subroute) {
      // Capitalize first letter and format
      const formatted = subroute
        .split('/')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' > ')
      return `Doctor Dashboard > ${formatted}`
    }
    // Fallback for /dashboard/ with nothing after
    return 'Doctor Dashboard > Other'
  }

  // Check if it's the dashboard root
  if (normalized === '/dashboard') {
    return 'Doctor Dashboard > Overview'
  }

  // For any other pathname, return generic format
  return `Doctor Portal (${normalized})`
}
