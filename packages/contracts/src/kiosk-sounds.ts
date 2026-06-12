export const KIOSK_SOUND_SETTING_KEY = 'kiosk.scan_sounds'
export const KIOSK_SOUND_SETTING_CATEGORY = 'notifications'
export const KIOSK_SOUND_SETTING_DESCRIPTION =
  'Controls kiosk audio feedback for badge scan outcomes.'

export const KIOSK_SYSTEM_SOUND_OPTIONS = [
  {
    id: 'yaru-device-added',
    label: 'Device added',
    theme: 'Yaru',
    fileName: 'device-added.oga',
    path: '/usr/share/sounds/Yaru/stereo/device-added.oga',
    contentType: 'audio/ogg',
  },
  {
    id: 'yaru-device-removed',
    label: 'Device removed',
    theme: 'Yaru',
    fileName: 'device-removed.oga',
    path: '/usr/share/sounds/Yaru/stereo/device-removed.oga',
    contentType: 'audio/ogg',
  },
  {
    id: 'yaru-complete',
    label: 'Complete',
    theme: 'Yaru',
    fileName: 'complete.oga',
    path: '/usr/share/sounds/Yaru/stereo/complete.oga',
    contentType: 'audio/ogg',
  },
  {
    id: 'yaru-message',
    label: 'Message',
    theme: 'Yaru',
    fileName: 'message.oga',
    path: '/usr/share/sounds/Yaru/stereo/message.oga',
    contentType: 'audio/ogg',
  },
  {
    id: 'yaru-warning',
    label: 'Warning',
    theme: 'Yaru',
    fileName: 'dialog-warning.oga',
    path: '/usr/share/sounds/Yaru/stereo/dialog-warning.oga',
    contentType: 'audio/ogg',
  },
  {
    id: 'yaru-error',
    label: 'Error',
    theme: 'Yaru',
    fileName: 'dialog-error.oga',
    path: '/usr/share/sounds/Yaru/stereo/dialog-error.oga',
    contentType: 'audio/ogg',
  },
  {
    id: 'freedesktop-complete',
    label: 'Complete',
    theme: 'freedesktop',
    fileName: 'complete.oga',
    path: '/usr/share/sounds/freedesktop/stereo/complete.oga',
    contentType: 'audio/ogg',
  },
  {
    id: 'freedesktop-bell',
    label: 'Bell',
    theme: 'freedesktop',
    fileName: 'bell.oga',
    path: '/usr/share/sounds/freedesktop/stereo/bell.oga',
    contentType: 'audio/ogg',
  },
  {
    id: 'freedesktop-warning',
    label: 'Warning',
    theme: 'freedesktop',
    fileName: 'dialog-warning.oga',
    path: '/usr/share/sounds/freedesktop/stereo/dialog-warning.oga',
    contentType: 'audio/ogg',
  },
] as const

export type KioskSystemSoundId = (typeof KIOSK_SYSTEM_SOUND_OPTIONS)[number]['id']
