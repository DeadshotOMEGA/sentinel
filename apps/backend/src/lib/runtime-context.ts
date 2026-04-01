import { existsSync, readFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import type { Request } from 'express'

const LOOPBACK_IPS = new Set(['127.0.0.1', '::1'])
const CONTAINER_RUNTIME_HINTS = ['docker', 'containerd', 'kubepods', 'podman']

let cachedLocalIps: Set<string> | null = null
let cachedContainerRuntime: boolean | null = null

function normalizeIpAddress(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  if (trimmed.startsWith('::ffff:')) {
    return trimmed.slice('::ffff:'.length)
  }

  return trimmed
}

function parseForwardedClientIp(headerValue: string | string[] | undefined): string | null {
  if (Array.isArray(headerValue)) {
    for (const value of headerValue) {
      const parsed = parseForwardedClientIp(value)
      if (parsed) {
        return parsed
      }
    }

    return null
  }

  if (typeof headerValue !== 'string') {
    return null
  }

  const firstEntry = headerValue.split(',')[0]
  return normalizeIpAddress(firstEntry)
}

function getLocalIpAddresses(): Set<string> {
  if (cachedLocalIps) {
    return cachedLocalIps
  }

  const localIps = new Set<string>(LOOPBACK_IPS)
  const interfaces = networkInterfaces()

  for (const entries of Object.values(interfaces)) {
    if (!entries) {
      continue
    }

    for (const entry of entries) {
      const normalized = normalizeIpAddress(entry.address)
      if (!normalized) {
        continue
      }

      localIps.add(normalized)
    }
  }

  cachedLocalIps = localIps
  return localIps
}

export function getRequestClientIp(req: Request): string | null {
  const forwarded = parseForwardedClientIp(req.headers['x-forwarded-for'])
  if (forwarded) {
    return forwarded
  }

  return (
    normalizeIpAddress(req.ip) ??
    normalizeIpAddress(req.socket.remoteAddress) ??
    normalizeIpAddress(req.connection.remoteAddress)
  )
}

export function isLocalClientRequest(req: Request): boolean {
  const clientIp = getRequestClientIp(req)
  if (!clientIp) {
    return false
  }

  const localIps = getLocalIpAddresses()
  return localIps.has(clientIp)
}

export function isProductionBuild(): boolean {
  return (process.env.NODE_ENV ?? '').toLowerCase() === 'production'
}

export function isDevelopmentBuild(): boolean {
  return (process.env.NODE_ENV ?? 'development').toLowerCase() === 'development'
}

export function isRunningInsideContainer(): boolean {
  if (cachedContainerRuntime !== null) {
    return cachedContainerRuntime
  }

  if ((process.env.SENTINEL_RUNTIME_CONTAINER ?? '').toLowerCase() === 'true') {
    cachedContainerRuntime = true
    return cachedContainerRuntime
  }

  if (existsSync('/.dockerenv')) {
    cachedContainerRuntime = true
    return cachedContainerRuntime
  }

  try {
    const cgroup = readFileSync('/proc/1/cgroup', 'utf-8').toLowerCase()
    cachedContainerRuntime = CONTAINER_RUNTIME_HINTS.some((hint) => cgroup.includes(hint))
    return cachedContainerRuntime
  } catch {
    cachedContainerRuntime = false
    return cachedContainerRuntime
  }
}

export function shouldEnforceMainSystemLoginSelection(req: Request): boolean {
  const enforceSelection = (process.env.SENTINEL_ENFORCE_MAIN_SYSTEM_LOGIN ?? 'true')
    .toLowerCase()
    .trim()

  if (enforceSelection === 'false' || enforceSelection === '0' || enforceSelection === 'off') {
    return false
  }

  if (!isProductionBuild()) {
    return false
  }

  return isLocalClientRequest(req)
}

export function resetRuntimeContextCachesForTests(): void {
  cachedLocalIps = null
  cachedContainerRuntime = null
}
