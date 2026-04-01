/* global URL */

import { NextRequest, NextResponse } from 'next/server'
import { buildLoginUrl } from '@/lib/post-login-destination'

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get('sentinel-session')

  if (!sessionCookie?.value) {
    const loginUrl = new URL(buildLoginUrl(request.nextUrl.pathname), request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}
