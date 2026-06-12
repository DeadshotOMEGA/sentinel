import { describe, expect, it } from 'vitest'
import {
  DEFAULT_KIOSK_SOUND_SETTINGS,
  getKioskSystemSoundUrl,
  parseKioskSoundSettings,
  resolveKioskSoundUrl,
  type KioskSoundSettings,
} from './kiosk-sound-settings'

describe('kiosk sound settings', () => {
  it('parses valid settings and clamps volume', () => {
    const parsed = parseKioskSoundSettings({
      version: 1,
      enabled: true,
      volume: 2,
      events: {
        scan_in: { type: 'system', id: 'yaru-complete' },
        scan_out: { type: 'none' },
        warning: {
          type: 'custom',
          name: 'warning.ogg',
          mimeType: 'audio/ogg',
          size: 123,
          dataUrl: 'data:audio/ogg;base64,c291bmQ=',
        },
        error: { type: 'system', id: 'yaru-error' },
      },
    })

    expect(parsed).toEqual({
      version: 1,
      enabled: true,
      volume: 1,
      events: {
        scan_in: { type: 'system', id: 'yaru-complete' },
        scan_out: { type: 'none' },
        warning: {
          type: 'custom',
          name: 'warning.ogg',
          mimeType: 'audio/ogg',
          size: 123,
          dataUrl: 'data:audio/ogg;base64,c291bmQ=',
        },
        error: { type: 'system', id: 'yaru-error' },
      },
    })
  })

  it('falls back to defaults for invalid event sources', () => {
    const parsed = parseKioskSoundSettings({
      version: 1,
      enabled: false,
      volume: 0.25,
      events: {
        scan_in: { type: 'system', id: 'not-allowlisted' },
        scan_out: { type: 'custom', dataUrl: 'data:text/plain;base64,nope' },
        warning: { type: 'none' },
        error: { type: 'system', id: 'yaru-error' },
      },
    })

    expect(parsed?.events.scan_in).toEqual(DEFAULT_KIOSK_SOUND_SETTINGS.events.scan_in)
    expect(parsed?.events.scan_out).toEqual(DEFAULT_KIOSK_SOUND_SETTINGS.events.scan_out)
    expect(parsed?.events.warning).toEqual({ type: 'none' })
  })

  it('resolves system and custom playback URLs', () => {
    const settings: KioskSoundSettings = {
      version: 1,
      enabled: true,
      volume: 0.5,
      events: {
        scan_in: { type: 'system', id: 'yaru-device-added' },
        scan_out: {
          type: 'custom',
          name: 'out.ogg',
          mimeType: 'audio/ogg',
          size: 4,
          dataUrl: 'data:audio/ogg;base64,b3V0',
        },
        warning: { type: 'none' },
        error: { type: 'system', id: 'yaru-error' },
      },
    }

    expect(resolveKioskSoundUrl(settings, 'scan_in')).toBe(
      getKioskSystemSoundUrl('yaru-device-added')
    )
    expect(resolveKioskSoundUrl(settings, 'scan_out')).toBe('data:audio/ogg;base64,b3V0')
    expect(resolveKioskSoundUrl(settings, 'warning')).toBeNull()
  })

  it('uses the frontend media route for built-in system sounds', () => {
    expect(getKioskSystemSoundUrl('yaru-device-added')).toBe(
      '/media/kiosk-sounds/system/yaru-device-added'
    )
  })
})
