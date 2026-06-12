import { createKioskSystemSoundResponse } from '@/lib/kiosk-system-sound-response.server'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: globalThis.Request, context: RouteContext) {
  const { id } = await context.params
  return createKioskSystemSoundResponse(id)
}
