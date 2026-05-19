import { NextRequest, NextResponse } from 'next/server'
import { buildLoginUrl } from '@/lib/post-login-destination'
import { KIOSK_DEVICE_COOKIE_NAME, resolveKioskBootstrapNext } from '@/lib/kiosk-device-auth'
import {
  getConfiguredKioskDeviceApiKey,
  getKioskDeviceCookieMaxAgeSeconds,
  resolvePublicRequestUrl,
} from '@/lib/kiosk-device-auth.server'

function shouldUseSecureCookie(request: NextRequest): boolean {
  return request.nextUrl.protocol === 'https:'
}

export async function GET(request: NextRequest) {
  const nextPath = resolveKioskBootstrapNext(request.nextUrl.searchParams.get('next'))
  const publicRequestUrl = resolvePublicRequestUrl(request)
  const loginUrl = new globalThis.URL(buildLoginUrl('/kiosk'), publicRequestUrl)
  const configuredApiKey = getConfiguredKioskDeviceApiKey()

  if (!configuredApiKey) {
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(KIOSK_DEVICE_COOKIE_NAME)
    return response
  }

  const response = NextResponse.redirect(new globalThis.URL(nextPath, publicRequestUrl))
  response.cookies.set(KIOSK_DEVICE_COOKIE_NAME, configuredApiKey, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(request),
    maxAge: getKioskDeviceCookieMaxAgeSeconds(),
    path: '/',
  })

  return response
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'auto'
