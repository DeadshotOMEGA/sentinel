import { existsSync } from 'node:fs'
import { Router, type Request, type Response } from 'express'
import { KIOSK_SYSTEM_SOUND_OPTIONS } from '@sentinel/contracts'

type KioskSoundCatalog = readonly {
  id: string
  path: string
  contentType: string
}[]

function sendSoundNotFound(res: Response) {
  return res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Kiosk sound file not found',
  })
}

export function createKioskSoundsRouter(
  catalog: KioskSoundCatalog = KIOSK_SYSTEM_SOUND_OPTIONS
): Router {
  const router = Router()

  router.get('/system/:id', (req: Request, res: Response) => {
    const sound = catalog.find((candidate) => candidate.id === req.params.id)

    if (!sound || !existsSync(sound.path)) {
      return sendSoundNotFound(res)
    }

    res.type(sound.contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')

    return res.sendFile(sound.path, (error) => {
      if (!error || res.headersSent) {
        return
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to stream kiosk sound file',
      })
    })
  })

  return router
}

export const kioskSoundsRouter = createKioskSoundsRouter()
