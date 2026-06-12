import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { KIOSK_SYSTEM_SOUND_OPTIONS } from '@sentinel/contracts'

function soundNotFound() {
  return NextResponse.json(
    {
      error: 'NOT_FOUND',
      message: 'Kiosk sound file not found',
    },
    { status: 404 }
  )
}

export async function createKioskSystemSoundResponse(id: string): Promise<globalThis.Response> {
  const sound = KIOSK_SYSTEM_SOUND_OPTIONS.find((candidate) => candidate.id === id)

  if (!sound) {
    return soundNotFound()
  }

  try {
    const bytes = await readFile(sound.path)

    return new globalThis.Response(bytes, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'Content-Type': sound.contentType,
      },
    })
  } catch {
    return soundNotFound()
  }
}
