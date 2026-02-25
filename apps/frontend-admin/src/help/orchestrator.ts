'use client'

import { toast } from 'sonner'
import {
  getHelpContext,
  getLocalHelpFallback,
  getRegisteredHelpContext,
  resolveRouteIdFromPathname,
  HELP_START_HERE_ROUTE_ID,
  HELP_START_HERE_SLUG,
  type HelpFallbackMode,
} from './help-registry'
import {
  emitActiveHelpStep,
  emitHelpOpen,
  emitHelpTourRequest,
  type HelpOpenSource,
} from './help-events'

const WIKI_CHECK_TIMEOUT_MS = 4000
const WIKI_CHECK_CACHE_TTL_MS = 30_000

type EnvFallbackMode = 'local' | 'wiki' | 'hybrid'

type WikiCheckStatus = 'reachable' | 'not_found' | 'unreachable'

interface WikiCheckResult {
  status: WikiCheckStatus
  checkedAt: number
}

interface HelpRuntimeConfig {
  wikiBaseUrl: string
  fallbackMode: EnvFallbackMode
  previewEnabled: boolean
  docsVersion: string | null
}

export interface OpenHelpTargetOptions {
  routeId?: string
  pathname?: string
  accountLevel?: number
  wikiSlug?: string
  source: HelpOpenSource
}

export interface OpenHelpTargetResult {
  routeId: string
  wikiSlug: string | null
  target: 'wiki' | 'tour' | 'local'
}

const wikiCheckCache = new Map<string, WikiCheckResult>()

function parseEnvFallbackMode(value: string | undefined): EnvFallbackMode {
  if (value === 'local' || value === 'wiki' || value === 'hybrid') {
    return value
  }

  return 'hybrid'
}

export function getHelpRuntimeConfig(): HelpRuntimeConfig {
  return {
    wikiBaseUrl: globalThis.process?.env.NEXT_PUBLIC_WIKI_BASE_URL?.trim() ?? '',
    fallbackMode: parseEnvFallbackMode(globalThis.process?.env.NEXT_PUBLIC_HELP_FALLBACK_MODE),
    previewEnabled: globalThis.process?.env.NEXT_PUBLIC_HELP_PREVIEW_ENABLED === 'true',
    docsVersion: globalThis.process?.env.NEXT_PUBLIC_HELP_DOCS_VERSION?.trim() || null,
  }
}

function normalizeSlug(slug: string): string {
  return slug.replace(/^\/+/, '').replace(/\/+$/, '')
}

function buildWikiUrl(baseUrl: string, slug: string, docsVersion: string | null): string | null {
  if (!baseUrl) return null

  const normalizedSlug = normalizeSlug(slug)
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  try {
    const url = new globalThis.URL(normalizedSlug, normalizedBase)

    if (docsVersion) {
      url.searchParams.set('sentinelVersion', docsVersion)
    }

    return url.toString()
  } catch {
    return null
  }
}

function parentSlug(slug: string): string {
  const normalized = normalizeSlug(slug)
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length <= 1) {
    return HELP_START_HERE_SLUG
  }

  return segments.slice(0, -1).join('/')
}

function openInNewTab(url: string): void {
  if (typeof window === 'undefined') return
  const nextWindow = window.open(url, '_blank')

  if (nextWindow) {
    nextWindow.opener = null
  }
}

function buildWikiCheckCacheKey(baseUrl: string, slug: string): string {
  return `${baseUrl}::${normalizeSlug(slug)}`
}

async function checkWikiStatus(baseUrl: string, slug: string): Promise<WikiCheckStatus> {
  const cacheKey = buildWikiCheckCacheKey(baseUrl, slug)
  const now = Date.now()
  const cached = wikiCheckCache.get(cacheKey)

  if (cached && now - cached.checkedAt < WIKI_CHECK_CACHE_TTL_MS) {
    return cached.status
  }

  const controller = new globalThis.AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), WIKI_CHECK_TIMEOUT_MS)

  try {
    const params = new globalThis.URLSearchParams({ slug: normalizeSlug(slug) })
    const response = await fetch(`/api/help/wiki-check?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      wikiCheckCache.set(cacheKey, { status: 'unreachable', checkedAt: now })
      return 'unreachable'
    }

    const payload = (await response.json()) as { status?: number }
    const status = payload.status

    if (status === 404) {
      wikiCheckCache.set(cacheKey, { status: 'not_found', checkedAt: now })
      return 'not_found'
    }

    wikiCheckCache.set(cacheKey, { status: 'reachable', checkedAt: now })
    return 'reachable'
  } catch {
    wikiCheckCache.set(cacheKey, { status: 'unreachable', checkedAt: now })
    return 'unreachable'
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function resolveFallbackTargets(
  envMode: EnvFallbackMode,
  contextFallbackMode: HelpFallbackMode
): Array<'tour' | 'local'> {
  if (envMode === 'local') {
    return contextFallbackMode === 'tour' ? ['tour', 'local'] : ['local']
  }

  if (contextFallbackMode === 'tour') {
    return ['tour', 'local']
  }

  return ['local']
}

function emitOpenEvent(options: {
  routeId: string
  source: HelpOpenSource
  wikiSlug: string | null
  target: 'wiki' | 'tour' | 'local'
  outcome: 'opened' | 'fallback' | 'failed'
}): void {
  emitHelpOpen({
    routeId: options.routeId,
    wikiSlug: options.wikiSlug,
    source: options.source,
    target: options.target,
    outcome: options.outcome,
    timestamp: new Date().toISOString(),
  })
}

function openLocalFallback(routeId: string, wikiBaseUrl: string, docsVersion: string | null): void {
  const localFallback =
    getLocalHelpFallback(routeId) ?? getLocalHelpFallback(HELP_START_HERE_ROUTE_ID)

  if (!localFallback) {
    toast.warning('Help fallback is not configured for this route.')
    return
  }

  toast.info(localFallback.title, {
    description: `${localFallback.summary} ${localFallback.quickSteps[0] ?? ''}`,
    action: wikiBaseUrl
      ? {
          label: 'Docs Home',
          onClick: () => {
            const docsHomeUrl = buildWikiUrl(wikiBaseUrl, HELP_START_HERE_SLUG, docsVersion)
            if (!docsHomeUrl) return
            openInNewTab(docsHomeUrl)
          },
        }
      : undefined,
  })
}

function resolveRouteAndContext(options: OpenHelpTargetOptions): {
  routeId: string
  wikiSlug: string
  fallbackMode: HelpFallbackMode
  tourId: string | null
  isDefaultContext: boolean
} {
  const pathname =
    options.pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
  const resolvedRouteId =
    options.routeId ?? resolveRouteIdFromPathname(pathname) ?? HELP_START_HERE_ROUTE_ID

  const accountLevel = options.accountLevel ?? Number.MAX_SAFE_INTEGER
  const allowedContext = getHelpContext(resolvedRouteId, accountLevel)
  const registeredContext = getRegisteredHelpContext(resolvedRouteId)

  const context =
    allowedContext ?? registeredContext ?? getRegisteredHelpContext(HELP_START_HERE_ROUTE_ID)
  if (!context) {
    throw new Error('Missing docs start-here help context registration')
  }

  return {
    routeId: context.routeId,
    wikiSlug: normalizeSlug(options.wikiSlug ?? context.wikiSlug),
    fallbackMode: context.fallbackMode,
    tourId: context.tourId ?? null,
    isDefaultContext:
      context.routeId === HELP_START_HERE_ROUTE_ID && resolvedRouteId !== HELP_START_HERE_ROUTE_ID,
  }
}

export async function openHelpTarget(
  options: OpenHelpTargetOptions
): Promise<OpenHelpTargetResult> {
  const runtimeConfig = getHelpRuntimeConfig()
  const { routeId, wikiSlug, fallbackMode, tourId, isDefaultContext } =
    resolveRouteAndContext(options)
  const pendingWindow =
    runtimeConfig.fallbackMode !== 'local' && typeof window !== 'undefined'
      ? window.open('about:blank', '_blank')
      : null

  if (pendingWindow) {
    pendingWindow.opener = null
  }

  if (isDefaultContext) {
    toast.info('Help mapping unavailable for this screen. Opening documentation home.')
  }

  if (runtimeConfig.fallbackMode !== 'local') {
    const wikiUrl = buildWikiUrl(runtimeConfig.wikiBaseUrl, wikiSlug, runtimeConfig.docsVersion)

    if (wikiUrl) {
      const checkStatus = await checkWikiStatus(runtimeConfig.wikiBaseUrl, wikiSlug)

      if (checkStatus === 'reachable') {
        if (pendingWindow && !pendingWindow.closed) {
          pendingWindow.location.href = wikiUrl
        } else {
          openInNewTab(wikiUrl)
        }
        emitOpenEvent({
          routeId,
          source: options.source,
          wikiSlug,
          target: 'wiki',
          outcome: 'opened',
        })
        return {
          routeId,
          wikiSlug,
          target: 'wiki',
        }
      }

      if (checkStatus === 'not_found') {
        const parent = parentSlug(wikiSlug)
        const parentUrl = buildWikiUrl(runtimeConfig.wikiBaseUrl, parent, runtimeConfig.docsVersion)

        if (parentUrl) {
          if (pendingWindow && !pendingWindow.closed) {
            pendingWindow.location.href = parentUrl
          } else {
            openInNewTab(parentUrl)
          }
          toast.warning('Documentation moved. Opened the parent section instead.')
          emitOpenEvent({
            routeId,
            source: options.source,
            wikiSlug,
            target: 'wiki',
            outcome: 'fallback',
          })
          return {
            routeId,
            wikiSlug: parent,
            target: 'wiki',
          }
        }
      }
    }
  }

  if (pendingWindow && !pendingWindow.closed) {
    pendingWindow.close()
  }

  const fallbackTargets = resolveFallbackTargets(runtimeConfig.fallbackMode, fallbackMode)

  for (const target of fallbackTargets) {
    if (target === 'tour' && tourId) {
      emitHelpTourRequest(routeId, tourId)
      emitActiveHelpStep(null)
      toast.info('Started guided walkthrough fallback.')
      emitOpenEvent({
        routeId,
        source: options.source,
        wikiSlug,
        target: 'tour',
        outcome: 'fallback',
      })

      return {
        routeId,
        wikiSlug,
        target: 'tour',
      }
    }

    if (target === 'local') {
      openLocalFallback(routeId, runtimeConfig.wikiBaseUrl, runtimeConfig.docsVersion)
      emitOpenEvent({
        routeId,
        source: options.source,
        wikiSlug,
        target: 'local',
        outcome: 'fallback',
      })

      return {
        routeId,
        wikiSlug,
        target: 'local',
      }
    }
  }

  toast.error('Help could not be opened for this route.')
  emitOpenEvent({ routeId, source: options.source, wikiSlug, target: 'local', outcome: 'failed' })

  return {
    routeId,
    wikiSlug,
    target: 'local',
  }
}
