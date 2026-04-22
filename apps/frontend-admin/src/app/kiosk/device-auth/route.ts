import { NextRequest, NextResponse } from 'next/server'
import { buildLoginUrl } from '@/lib/post-login-destination'
import { KIOSK_DEVICE_COOKIE_NAME, resolveKioskBootstrapNext } from '@/lib/kiosk-device-auth'
import {
  getConfiguredKioskDeviceApiKey,
  getKioskDeviceCookieMaxAgeSeconds,
} from '@/lib/kiosk-device-auth.server'

function shouldUseSecureCookie(request: NextRequest): boolean {
  return request.nextUrl.protocol === 'https:'
}

export async function GET(request: NextRequest) {
  const nextPath = resolveKioskBootstrapNext(request.nextUrl.searchParams.get('next'))
  const loginUrl = new globalThis.URL(buildLoginUrl('/kiosk'), request.url)
  const configuredApiKey = getConfiguredKioskDeviceApiKey()

  if (!configuredApiKey) {
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(KIOSK_DEVICE_COOKIE_NAME)
    return response
  }

  const response = NextResponse.redirect(new globalThis.URL(nextPath, request.url))
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
