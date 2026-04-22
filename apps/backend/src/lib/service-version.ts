import { readFileSync } from 'node:fs'
import { logger } from './logger.js'

const VERSION_TAG_PATTERN = /^v[0-9]+\.[0-9]+\.[0-9]+$/

function normalizeVersionTag(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.toLowerCase() === 'unknown') {
    return null
  }

  const normalized = trimmed.startsWith('v') ? trimmed : `v${trimmed}`
  return VERSION_TAG_PATTERN.test(normalized) ? normalized : null
}

function normalizeDisplayVersion(value: string | null | undefined): string {
  const normalized = normalizeVersionTag(value)
  if (!normalized) {
    return 'unknown'
  }

  return normalized.slice(1)
}

export function resolveServiceVersionTag(): string | null {
  const directVersion = normalizeVersionTag(process.env.APP_VERSION)
  if (directVersion) {
    return directVersion
  }

  try {
    const packageJsonPath = new globalThis.URL('../../package.json', import.meta.url)
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      version?: unknown
    }

    if (typeof packageJson.version === 'string') {
      const packageVersion = normalizeVersionTag(packageJson.version)
      if (packageVersion) {
        return packageVersion
      }
    }
  } catch (error) {
    logger.warn('Unable to resolve backend version from package.json', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  return normalizeVersionTag(process.env.npm_package_version || process.env.SENTINEL_VERSION)
}

export function resolveServiceVersionDisplay(): string {
  return normalizeDisplayVersion(resolveServiceVersionTag())
}

export function compareVersionTags(left: string, right: string): number {
  const parse = (tag: string): [number, number, number] => {
    const cleaned = tag.startsWith('v') ? tag.slice(1) : tag
    const [majorRaw, minorRaw, patchRaw] = cleaned.split('.')

    const major = Number.parseInt(majorRaw ?? '0', 10)
    const minor = Number.parseInt(minorRaw ?? '0', 10)
    const patch = Number.parseInt(patchRaw ?? '0', 10)

    return [
      Number.isNaN(major) ? 0 : major,
      Number.isNaN(minor) ? 0 : minor,
      Number.isNaN(patch) ? 0 : patch,
    ]
  }

  const leftParts = parse(left)
  const rightParts = parse(right)

  const deltas = [
    leftParts[0] - rightParts[0],
    leftParts[1] - rightParts[1],
    leftParts[2] - rightParts[2],
  ] as const

  for (const delta of deltas) {
    if (delta !== 0) {
      return delta
    }
  }

  return 0
}

export function isStableVersionTag(value: string): boolean {
  return VERSION_TAG_PATTERN.test(value)
}
