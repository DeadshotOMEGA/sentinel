export const KIOSK_SCANNER_TIMING_SETTING_KEY = 'kiosk.scanner_timing'
export const KIOSK_SCANNER_TIMING_SETTING_CATEGORY = 'notifications'
export const KIOSK_SCANNER_TIMING_SETTING_DESCRIPTION =
  'Controls keyboard-wedge NFC scanner timing detection on the kiosk.'

export const KIOSK_SCANNER_TIMING_PRESETS = ['conservative', 'normal', 'forgiving'] as const

export type KioskScannerTimingPreset = (typeof KIOSK_SCANNER_TIMING_PRESETS)[number]
