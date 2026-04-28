/* global URL */

import { NextRequest, NextResponse } from 'next/server'
import { buildLoginUrl } from '@/lib/post-login-destination'
import { isKioskDeviceBootstrapRoute, isKioskRoute } from '@/lib/kiosk-device-auth'

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (isKioskDeviceBootstrapRoute(pathname)) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('sentinel-session')

  if (isKioskRoute(pathname)) {
    return NextResponse.next()
  }

  if (!sessionCookie?.value) {
    const loginUrl = new URL(buildLoginUrl(pathname), request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}
