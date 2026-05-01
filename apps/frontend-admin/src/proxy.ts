/* global URL */

import { NextRequest, NextResponse } from 'next/server'
import { buildLoginUrl } from '@/lib/post-login-destination'
import {
  isKioskDeviceBootstrapRoute,
  isKioskRoute,
  KIOSK_DEVICE_BOOTSTRAP_PATH,
  KIOSK_DEVICE_COOKIE_NAME,
} from '@/lib/kiosk-device-auth'

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (isKioskDeviceBootstrapRoute(pathname)) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('sentinel-session')
  const kioskDeviceCookie = request.cookies.get(KIOSK_DEVICE_COOKIE_NAME)

  if (isKioskRoute(pathname)) {
    if (!sessionCookie?.value && !kioskDeviceCookie?.value) {
      const bootstrapUrl = new URL(KIOSK_DEVICE_BOOTSTRAP_PATH, request.url)
      bootstrapUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
      return NextResponse.redirect(bootstrapUrl)
    }

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
