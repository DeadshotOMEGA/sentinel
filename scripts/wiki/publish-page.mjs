#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()

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

function parseArgs(argv) {
  const args = {
    source: '',
    slug: '',
    title: '',
    description: '',
    locale: 'en',
    tags: [],
    dryRun: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--source') args.source = argv[++i] ?? ''
    else if (arg === '--slug') args.slug = argv[++i] ?? ''
    else if (arg === '--title') args.title = argv[++i] ?? ''
    else if (arg === '--description') args.description = argv[++i] ?? ''
    else if (arg === '--locale') args.locale = argv[++i] ?? 'en'
    else if (arg === '--tags') {
      const raw = argv[++i] ?? ''
      args.tags = raw
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean)
    } else if (arg === '--dry-run') args.dryRun = true
  }

  return args
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
  const fromEnvFile = await loadEnvFile(path.join(ROOT, '.env'))
  return {
    wikiBaseUrl: (process.env.WIKI_BASE_URL || fromEnvFile.WIKI_BASE_URL || '').trim(),
    wikiApiKey: (process.env.WIKI_API_KEY || fromEnvFile.WIKI_API_KEY || '').trim(),
  }
}

async function graphQLRequest({ baseUrl, apiKey, query, variables = {} }) {
  const endpoint = baseUrl.endsWith('/') ? `${baseUrl}graphql` : `${baseUrl}/graphql`
  const response = await fetch(endpoint, {
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

function requireArgs(args) {
  if (!args.source) throw new Error('Missing --source <markdown-file>')
  if (!args.slug) throw new Error('Missing --slug <wiki-slug>')
  if (!args.title) throw new Error('Missing --title <page-title>')
}

function requireEnv(env) {
  if (!env.wikiBaseUrl) throw new Error('Missing WIKI_BASE_URL (env or .env)')
  if (!env.wikiApiKey) throw new Error('Missing WIKI_API_KEY (env or .env)')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  requireArgs(args)

  const sourcePath = path.isAbsolute(args.source) ? args.source : path.join(ROOT, args.source)
  if (!(await fileExists(sourcePath))) {
    throw new Error(`Source file does not exist: ${args.source}`)
  }

  const env = await resolveEnv()
  requireEnv(env)

  const content = await fs.readFile(sourcePath, 'utf8')
  const description = args.description || `Published from ${args.source}`
  const tags = args.tags.length > 0 ? args.tags : ['operations', 'sentinel']

  const listed = await graphQLRequest({
    baseUrl: env.wikiBaseUrl,
    apiKey: env.wikiApiKey,
    query: LIST_PAGES_QUERY,
    variables: { locale: args.locale, limit: 2000 },
  })

  const existingPage = (listed.pages.list || []).find(
    (page) => page.path === args.slug && page.locale === args.locale
  )

  if (args.dryRun) {
    if (existingPage) {
      console.log(`[dry-run] would update id=${existingPage.id} path=${args.slug}`)
    } else {
      console.log(`[dry-run] would create path=${args.slug} locale=${args.locale}`)
    }
    return
  }

  if (existingPage) {
    const updated = await graphQLRequest({
      baseUrl: env.wikiBaseUrl,
      apiKey: env.wikiApiKey,
      query: UPDATE_PAGE_MUTATION,
      variables: {
        id: existingPage.id,
        content,
        description,
        title: args.title,
        tags,
        scriptCss: '',
        scriptJs: '',
        isPublished: true,
        isPrivate: false,
      },
    })

    const result = updated.pages.update.responseResult
    if (!result.succeeded) throw new Error(`Update failed: ${result.message || 'unknown error'}`)
    console.log(`Updated page id=${updated.pages.update.page.id} path=${updated.pages.update.page.path}`)
    return
  }

  const created = await graphQLRequest({
    baseUrl: env.wikiBaseUrl,
    apiKey: env.wikiApiKey,
    query: CREATE_PAGE_MUTATION,
    variables: {
      content,
      description,
      editor: 'markdown',
      isPublished: true,
      isPrivate: false,
      locale: args.locale,
      path: args.slug,
      scriptCss: '',
      scriptJs: '',
      tags,
      title: args.title,
    },
  })

  const result = created.pages.create.responseResult
  if (!result.succeeded) throw new Error(`Create failed: ${result.message || 'unknown error'}`)
  console.log(`Created page id=${created.pages.create.page.id} path=${created.pages.create.page.path}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
