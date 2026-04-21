export type PinFieldPlaceholderStyle = 'bullets' | 'slots'

const PIN_MAX_LENGTH = 4
const MASK_CHAR = '\u2022'
const EMPTY_SLOT_CHAR = '-'

export function sanitizePinValue(value: string): string {
  return value.replace(/\D/g, '').slice(0, PIN_MAX_LENGTH)
}

export function getMaskedPinDisplay(
  value: string,
  placeholderStyle: PinFieldPlaceholderStyle = 'bullets'
): string {
  const sanitizedValue = sanitizePinValue(value)

  if (placeholderStyle === 'slots') {
    return Array.from({ length: PIN_MAX_LENGTH }, (_, index) =>
      index < sanitizedValue.length ? MASK_CHAR : EMPTY_SLOT_CHAR
    ).join(' ')
  }

  return MASK_CHAR.repeat(sanitizedValue.length)
}
