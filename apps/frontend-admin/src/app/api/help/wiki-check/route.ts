import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SAFE_SLUG_PATTERN = /^[a-z0-9][a-z0-9\-/]*$/i

function normalizeSlug(rawSlug: string): string {
  return rawSlug.trim().replace(/^\/+/, '').replace(/\/+$/, '')
}

function getWikiBaseUrl(): string {
  return (
    globalThis.process?.env.WIKI_BASE_URL?.trim() ??
    globalThis.process?.env.NEXT_PUBLIC_WIKI_BASE_URL?.trim() ??
    ''
  )
}

export async function GET(request: globalThis.Request) {
  const url = new globalThis.URL(request.url)
  const slugParam = url.searchParams.get('slug')

  if (!slugParam) {
    return NextResponse.json({ status: 400, error: 'Missing slug parameter' }, { status: 400 })
  }

  const slug = normalizeSlug(slugParam)

  if (!SAFE_SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ status: 400, error: 'Invalid slug parameter' }, { status: 400 })
  }

  const wikiBaseUrl = getWikiBaseUrl()

  if (!wikiBaseUrl) {
    return NextResponse.json(
      { status: 503, error: 'Wiki base URL is not configured' },
      { status: 503 }
    )
  }

  const normalizedBase = wikiBaseUrl.endsWith('/') ? wikiBaseUrl : `${wikiBaseUrl}/`

  try {
    const wikiUrl = new globalThis.URL(slug, normalizedBase)
    const wikiResponse = await fetch(wikiUrl, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
    })

    return NextResponse.json({ status: wikiResponse.status }, { status: 200 })
  } catch {
    return NextResponse.json({ status: 503, error: 'Wiki endpoint unreachable' }, { status: 503 })
  }
}
