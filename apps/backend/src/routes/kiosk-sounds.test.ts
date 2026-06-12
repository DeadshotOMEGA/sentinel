import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import express from 'express'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { createKioskSoundsRouter } from './kiosk-sounds.js'

const tempDirs: string[] = []

function createTestApp(soundPath: string) {
  const app = express()
  app.use(
    '/api/kiosk-sounds',
    createKioskSoundsRouter([
      {
        id: 'test-sound',
        path: soundPath,
        contentType: 'audio/ogg',
      },
    ])
  )
  return app
}

describe('kiosk sounds route', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('streams an allowlisted system sound file', async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'sentinel-kiosk-sound-'))
    tempDirs.push(tempDir)
    const soundPath = path.join(tempDir, 'scan.oga')
    writeFileSync(soundPath, 'sound-data')

    const response = await request(createTestApp(soundPath)).get(
      '/api/kiosk-sounds/system/test-sound'
    )

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('audio/ogg')
    expect(response.body.toString('utf8')).toBe('sound-data')
  })

  it('rejects unknown sound ids', async () => {
    const response = await request(createTestApp('/tmp/missing.oga')).get(
      '/api/kiosk-sounds/system/not-allowed'
    )

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      error: 'NOT_FOUND',
    })
  })
})
