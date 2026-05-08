#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const DASHBOARD_DOCS_ROOT = path.join(ROOT, 'docs/wiki/operations/dashboard')
const DASHBOARD_ASSETS_ROOT = path.join(ROOT, 'docs/wiki/assets/wiki-dashboard/operations')

const LIST_PAGES_QUERY = `
query($locale: String!, $limit: Int!) {
  pages {
    list(locale: $locale, limit: $limit) {
      id
      path
      locale
      title
    }
  }
}
`

const CREATE_PAGE_MUTATION = `
mutation CreatePage(
  $content: String!
  $description: String!
  $editor: String!
  $isPublished: Boolean!
  $isPrivate: Boolean!
  $locale: String!
  $path: String!
  $scriptCss: String
  $scriptJs: String
  $tags: [String]!
  $title: String!
) {
  pages {
    create(
      content: $content
      description: $description
      editor: $editor
      isPublished: $isPublished
      isPrivate: $isPrivate
      locale: $locale
      path: $path
      scriptCss: $scriptCss
      scriptJs: $scriptJs
      tags: $tags
      title: $title
    ) {
      responseResult {
        succeeded
        message
      }
      page {
        id
        path
        title
      }
    }
  }
}
`

const UPDATE_PAGE_MUTATION = `
mutation UpdatePage(
  $id: Int!
  $content: String
  $description: String
  $title: String
  $tags: [String]
  $scriptCss: String
  $scriptJs: String
  $isPublished: Boolean
  $isPrivate: Boolean
) {
  pages {
    update(
      id: $id
      content: $content
      description: $description
      title: $title
      tags: $tags
      scriptCss: $scriptCss
      scriptJs: $scriptJs
      isPublished: $isPublished
      isPrivate: $isPrivate
    ) {
      responseResult {
        succeeded
        message
      }
      page {
        id
        path
        title
      }
    }
  }
}
`

const LIST_ASSET_FOLDERS_QUERY = `
query($parentFolderId: Int!) {
  assets {
    folders(parentFolderId: $parentFolderId) {
      id
      slug
      name
    }
  }
}
`

const CREATE_ASSET_FOLDER_MUTATION = `
mutation CreateAssetFolder($parentFolderId: Int!, $slug: String!, $name: String) {
  assets {
    createFolder(parentFolderId: $parentFolderId, slug: $slug, name: $name) {
      responseResult {
        succeeded
        message
      }
    }
  }
}
`

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    skipAssets: argv.includes('--skip-assets'),
    locale: 'en',
  }
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function loadEnvFile(envPath) {
  const values = {}
  if (!(await fileExists(envPath))) return values
  const raw = await fs.readFile(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    values[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return values
}

async function resolveEnv() {
  const rootEnv = await loadEnvFile(path.join(ROOT, '.env'))
  const deployEnv = await loadEnvFile(path.join(ROOT, 'deploy/.env'))

  return {
    wikiBaseUrl: (
      process.env.WIKI_BASE_URL ||
      rootEnv.WIKI_BASE_URL ||
      deployEnv.WIKI_BASE_URL ||
      ''
    ).trim(),
    wikiApiKey: (
      process.env.WIKI_API_KEY ||
      rootEnv.WIKI_API_KEY ||
      deployEnv.WIKI_API_KEY ||
      ''
    ).trim(),
  }
}

function requireEnv(env) {
  if (!env.wikiBaseUrl) throw new Error('Missing WIKI_BASE_URL (env, .env, or deploy/.env)')
  if (!env.wikiApiKey) throw new Error('Missing WIKI_API_KEY (env, .env, or deploy/.env)')
}

function wikiEndpoint(baseUrl, suffix) {
  return baseUrl.endsWith('/') ? `${baseUrl}${suffix}` : `${baseUrl}/${suffix}`
}

async function graphQLRequest({ baseUrl, apiKey, query, variables = {} }) {
  const response = await fetch(wikiEndpoint(baseUrl, 'graphql'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GraphQL request failed (${response.status}): ${text}`)
  }

  const payload = await response.json()
  if (payload.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(payload.errors)}`)
  }

  return payload.data
}

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      return entry.isDirectory() ? walkFiles(fullPath) : [fullPath]
    })
  )
  return files.flat()
}

function titleFromMarkdown(content, fallback) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback
}

function slugFromSource(source) {
  return path
    .relative(path.join(ROOT, 'docs/wiki'), source)
    .replace(/\.md$/, '')
    .split(path.sep)
    .join('/')
}

async function listFolders({ baseUrl, apiKey, parentFolderId }) {
  const data = await graphQLRequest({
    baseUrl,
    apiKey,
    query: LIST_ASSET_FOLDERS_QUERY,
    variables: { parentFolderId },
  })
  return data.assets.folders || []
}

async function ensureFolder({ baseUrl, apiKey, parentFolderId, slug }) {
  const normalizedSlug = slug.toLowerCase()
  let folders = await listFolders({ baseUrl, apiKey, parentFolderId })
  const existing = folders.find((folder) => folder.slug === normalizedSlug)
  if (existing) return existing.id

  const created = await graphQLRequest({
    baseUrl,
    apiKey,
    query: CREATE_ASSET_FOLDER_MUTATION,
    variables: { parentFolderId, slug: normalizedSlug, name: normalizedSlug },
  })

  const result = created.assets.createFolder.responseResult
  if (!result.succeeded) {
    throw new Error(
      `Asset folder create failed (${normalizedSlug}): ${result.message || 'unknown error'}`
    )
  }

  folders = await listFolders({ baseUrl, apiKey, parentFolderId })
  const next = folders.find((folder) => folder.slug === normalizedSlug)
  if (!next) throw new Error(`Asset folder was created but not found: ${normalizedSlug}`)
  return next.id
}

async function uploadAsset({ baseUrl, apiKey, folderId, source }) {
  const filename = path.basename(source)
  const data = await fs.readFile(source)
  const form = new FormData()
  form.append('mediaUpload', JSON.stringify({ folderId }))
  form.append('mediaUpload', new Blob([data], { type: 'image/png' }), filename)

  const response = await fetch(wikiEndpoint(baseUrl, 'u'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Asset upload failed (${filename}, ${response.status}): ${text}`)
  }

  const body = await response.text()
  if (body.trim() !== 'ok') {
    throw new Error(`Asset upload failed (${filename}): ${body}`)
  }

  return filename
}

async function publishPage({ baseUrl, apiKey, locale, source, existingPages, dryRun }) {
  const content = await fs.readFile(source, 'utf8')
  const slug = slugFromSource(source)
  const title = titleFromMarkdown(content, path.basename(source, '.md'))
  const description =
    slug === 'operations/dashboard/overview'
      ? 'Dashboard hub for live operations help.'
      : 'Dashboard guided help page.'
  const tags = ['operations', 'dashboard', 'help']
  const existing = existingPages.find((page) => page.path === slug && page.locale === locale)

  if (dryRun) {
    return `[dry-run] would ${existing ? 'update' : 'create'} path=${slug} locale=${locale}`
  }

  if (existing) {
    const data = await graphQLRequest({
      baseUrl,
      apiKey,
      query: UPDATE_PAGE_MUTATION,
      variables: {
        id: existing.id,
        content,
        description,
        title,
        tags,
        scriptCss: '',
        scriptJs: '',
        isPublished: true,
        isPrivate: false,
      },
    })
    const result = data.pages.update.responseResult
    if (!result.succeeded)
      throw new Error(`Update failed (${slug}): ${result.message || 'unknown error'}`)
    return `updated path=${data.pages.update.page.path}`
  }

  const data = await graphQLRequest({
    baseUrl,
    apiKey,
    query: CREATE_PAGE_MUTATION,
    variables: {
      content,
      description,
      editor: 'markdown',
      isPublished: true,
      isPrivate: false,
      locale,
      path: slug,
      scriptCss: '',
      scriptJs: '',
      tags,
      title,
    },
  })
  const result = data.pages.create.responseResult
  if (!result.succeeded)
    throw new Error(`Create failed (${slug}): ${result.message || 'unknown error'}`)
  return `created path=${data.pages.create.page.path}`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const env = await resolveEnv()
  requireEnv(env)

  if (!args.skipAssets) {
    const assetFiles = (await walkFiles(DASHBOARD_ASSETS_ROOT))
      .filter((file) => file.endsWith('.png'))
      .sort()

    if (args.dryRun) {
      console.log('[dry-run] would ensure asset folder /uploads/wiki-dashboard/operations')
      for (const source of assetFiles) {
        console.log(`[dry-run] would upload asset ${path.basename(source)}`)
      }
    } else {
      const uploadsFolderId = await ensureFolder({
        baseUrl: env.wikiBaseUrl,
        apiKey: env.wikiApiKey,
        parentFolderId: 0,
        slug: 'uploads',
      })
      const wikiDashboardFolderId = await ensureFolder({
        baseUrl: env.wikiBaseUrl,
        apiKey: env.wikiApiKey,
        parentFolderId: uploadsFolderId,
        slug: 'wiki-dashboard',
      })
      const operationsFolderId = await ensureFolder({
        baseUrl: env.wikiBaseUrl,
        apiKey: env.wikiApiKey,
        parentFolderId: wikiDashboardFolderId,
        slug: 'operations',
      })

      for (const source of assetFiles) {
        const filename = await uploadAsset({
          baseUrl: env.wikiBaseUrl,
          apiKey: env.wikiApiKey,
          folderId: operationsFolderId,
          source,
        })
        console.log(`uploaded asset ${filename}`)
      }
    }
  }

  const listed = await graphQLRequest({
    baseUrl: env.wikiBaseUrl,
    apiKey: env.wikiApiKey,
    query: LIST_PAGES_QUERY,
    variables: { locale: args.locale, limit: 2000 },
  })
  const existingPages = listed.pages.list || []
  const pageFiles = (await walkFiles(DASHBOARD_DOCS_ROOT))
    .filter((file) => file.endsWith('.md'))
    .sort()

  for (const source of pageFiles) {
    const result = await publishPage({
      baseUrl: env.wikiBaseUrl,
      apiKey: env.wikiApiKey,
      locale: args.locale,
      source,
      existingPages,
      dryRun: args.dryRun,
    })
    console.log(`${slugFromSource(source)}: ${result}`)
  }

  console.log(`${args.dryRun ? 'Dry-ran' : 'Published'} ${pageFiles.length} dashboard pages.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
