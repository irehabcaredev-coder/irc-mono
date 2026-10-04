import { NextResponse } from 'next/server'

// Any host starting with "doctors." is the doctor site (doctors.irehabcare.com, and doctors.localhost for
// local testing). It serves the doctor landing page at "/" while the rest of the app works unchanged.
const isDoctorsHost = (request) =>
  (request.headers.get('host') || '').toLowerCase().startsWith('doctors.')

export function middleware(request) {
  const { pathname, search } = request.nextUrl

  // Check for repeated slashes in the pathname
  // e.g., //onboarding -> /onboarding
  if (pathname.includes('//')) {
    const cleanPathname = pathname.replace(/\/+/g, '/')
    const newUrl = new URL(cleanPathname, request.url)
    newUrl.search = search
    return NextResponse.redirect(newUrl)
  }
  
  if (isDoctorsHost(request)) {
    // "/" shows the doctor landing page; the address bar keeps showing "/"
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/for-doctors', request.url))
    }
    // One canonical address for that page on the doctor site
    if (pathname === '/for-doctors') {
      // Build from the Host header: request.url can carry the server's own address, not the visitor's
      const url = new URL('/', `${request.nextUrl.protocol}//${request.headers.get('host')}`)
      url.search = search
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  // Matcher ignoring _next/static, _next/image, favicon.ico, etc.
  matcher: [
    '/((?!_next|favicon.ico).*)',
  ],
}
