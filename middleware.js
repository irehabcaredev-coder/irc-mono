import { NextResponse } from 'next/server'

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
  
  return NextResponse.next()
}

export const config = {
  // Matcher ignoring _next/static, _next/image, favicon.ico, etc.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
