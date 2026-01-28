'use client'

import { useState, type ReactElement } from 'react'
import { Check, X, Copy, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface CellRendererProps {
  value: unknown
  onJsonClick?: (value: unknown) => void
}

/**
 * UUID cell - truncate to 8 chars with copy button
 */
export function UuidCell({ value }: CellRendererProps) {
  const [copied, setCopied] = useState(false)

  if (typeof value !== 'string') {
    return <NullCell />
  }

  const truncated = value.slice(0, 8)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1 font-mono text-xs">
      <span className="text-muted-foreground">{truncated}...</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5"
        onClick={handleCopy}
        title="Copy full UUID"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}

/**
 * Timestamp cell - format as "Jan 26, 2026 09:14 AM"
 */
export function TimestampCell({ value }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <NullCell />
  }

  const date = new Date(value as string)
  if (isNaN(date.getTime())) {
    return <span className="text-muted-foreground">{String(value)}</span>
  }

  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return <span className="text-sm whitespace-nowrap">{formatted}</span>
}

/**
 * JSON cell - show badge, click to expand
 */
export function JsonCell({ value, onJsonClick }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <NullCell />
  }

  const isArray = Array.isArray(value)
  const preview = isArray ? `[${(value as unknown[]).length}]` : '{...}'

  return (
    <Badge
      variant="secondary"
      className="cursor-pointer gap-1 font-mono text-xs"
      onClick={() => onJsonClick?.(value)}
    >
      {preview}
      <ChevronRight className="h-3 w-3" />
    </Badge>
  )
}

/**
 * Boolean cell - checkmark or X icons
 */
export function BooleanCell({ value }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <NullCell />
  }

  return value ? (
    <Check className="h-4 w-4 text-green-500" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground" />
  )
}

/**
 * Null cell - gray "null" text
 */
export function NullCell() {
  return <span className="text-muted-foreground/50 italic text-xs">null</span>
}

/**
 * Long string cell - truncate with tooltip
 */
export function LongStringCell({ value }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <NullCell />
  }

  const str = String(value)
  const maxLength = 50

  if (str.length <= maxLength) {
    return <span className="text-sm">{str}</span>
  }

  return (
    <span
      className="text-sm cursor-help"
      title={str}
    >
      {str.slice(0, maxLength)}...
    </span>
  )
}

/**
 * Number cell
 */
export function NumberCell({ value }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <NullCell />
  }

  return (
    <span className="font-mono text-sm tabular-nums">
      {typeof value === 'number' ? value.toLocaleString() : String(value)}
    </span>
  )
}

/**
 * Determine the appropriate cell renderer based on column type and value
 */
export function getCellRenderer(
  columnName: string,
  columnType: string,
  value: unknown,
  onJsonClick?: (value: unknown) => void
): ReactElement {
  // Check for null/undefined first
  if (value === null || value === undefined) {
    return <NullCell />
  }

  // UUID columns (id fields)
  if (columnName === 'id' || columnName.endsWith('Id') || columnType === 'String' && typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return <UuidCell value={value} />
  }

  // Timestamp columns
  if (columnType === 'DateTime' || columnName.endsWith('At') || columnName.includes('Time') || columnName.includes('Date')) {
    return <TimestampCell value={value} />
  }

  // JSON columns
  if (columnType === 'Json' || (typeof value === 'object' && value !== null)) {
    return <JsonCell value={value} onJsonClick={onJsonClick} />
  }

  // Boolean columns
  if (columnType === 'Boolean' || typeof value === 'boolean') {
    return <BooleanCell value={value} />
  }

  // Number columns
  if (columnType === 'Int' || columnType === 'Float' || columnType === 'BigInt' || typeof value === 'number') {
    return <NumberCell value={value} />
  }

  // String columns (default)
  if (typeof value === 'string') {
    return <LongStringCell value={value} />
  }

  // Fallback
  return <span className="text-sm">{String(value)}</span>
}
