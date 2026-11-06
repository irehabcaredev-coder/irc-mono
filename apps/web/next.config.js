/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // New-lead emails sent before the link was fixed point at /doctor/leads
  async redirects() {
    return [{ source: '/doctor/leads', destination: '/dashboard/leads', permanent: true }]
  },
}

module.exports = nextConfig
