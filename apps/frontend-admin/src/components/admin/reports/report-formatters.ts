const REPORT_LOCALE = 'en-CA'

function formatMilitaryTime(date: Date): string {
  const parts = new Intl.DateTimeFormat(REPORT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'

  return `${hour}${minute}`
}

export function formatReportDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const dateLabel = date.toLocaleDateString(REPORT_LOCALE, {
    month: 'short',
    day: 'numeric',
  })

  return `${dateLabel}, ${formatMilitaryTime(date)}`
}

export function formatReportTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return formatMilitaryTime(date)
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) {
    return 'Open'
  }

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function formatBooleanPresence(value: boolean | null): string {
  if (value === null) {
    return 'Not configured'
  }

  return value ? 'Present' : 'Absent'
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}
