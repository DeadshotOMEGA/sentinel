#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const HOME_SOURCE = path.join(ROOT, 'docs/wiki/docs/home.md')
const WIKI_DOCS_ROOT = path.join(ROOT, 'docs/wiki')
const SITE_LOGO_SOURCE = path.join(
  ROOT,
  'docs/wiki/assets/wiki-dashboard/branding/sentinel-logo.png'
)
const SITE_LOGO_URL = '/uploads/wiki-dashboard/branding/sentinel-logo.png'

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

const THEME_CONFIG_QUERY = `
query {
  theming {
    config {
      theme
      iconset
      darkMode
      tocPosition
      injectCSS
      injectHead
      injectBody
    }
  }
}
`

const THEME_SET_CONFIG_MUTATION = `
mutation SetThemeConfig(
  $theme: String!
  $iconset: String!
  $darkMode: Boolean!
  $tocPosition: String
  $injectCSS: String
  $injectHead: String
  $injectBody: String
) {
  theming {
    setConfig(
      theme: $theme
      iconset: $iconset
      darkMode: $darkMode
      tocPosition: $tocPosition
      injectCSS: $injectCSS
      injectHead: $injectHead
      injectBody: $injectBody
    ) {
      responseResult {
        succeeded
        message
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

const SITE_UPDATE_CONFIG_MUTATION = `
mutation UpdateSiteConfig(
  $title: String
  $description: String
  $company: String
  $footerOverride: String
  $logoUrl: String
) {
  site {
    updateConfig(
      title: $title
      description: $description
      company: $company
      footerOverride: $footerOverride
      logoUrl: $logoUrl
    ) {
      responseResult {
        succeeded
        message
      }
    }
  }
}
`

const SENTINEL_INJECT_CSS = `/* Sentinel Wiki.js Theme Injection */
:root {
  --sentinel-base-100: #ffffff;
  --sentinel-base-200: #f7f7f6;
  --sentinel-base-300: #f2f2f1;
  --sentinel-base-content: #1f2538;
  --sentinel-primary: #4d7cff;
  --sentinel-primary-soft: #e4ebff;
  --sentinel-secondary: #f59f42;
  --sentinel-accent: #b041e0;
  --sentinel-info: #3fa6df;
  --sentinel-success: #3dba87;
  --sentinel-warning: #efbe3a;
  --sentinel-error: #df4f4f;
  --sentinel-border: #d7dbe4;
  --sentinel-shadow: 0 16px 38px rgba(31, 37, 56, 0.12);
}

.nav-header.black {
  background: #07172c !important;
}

.nav-header .v-toolbar__title,
.nav-header a {
  letter-spacing: 0;
}

.v-navigation-drawer.primary {
  background: linear-gradient(180deg, #0b3a66 0%, #0a2a4d 100%) !important;
}

.v-navigation-drawer.primary .v-list-item--active,
.v-navigation-drawer.primary .v-btn--active {
  background: rgba(255, 255, 255, 0.14) !important;
}

.theme--default main,
.contents {
  background: linear-gradient(180deg, #fbfbfa 0%, #f3f5f8 100%);
}

.contents {
  max-width: 1180px;
  margin-inline: auto;
  padding-bottom: 4rem;
}

.contents h1,
.contents h2,
.contents h3 {
  color: var(--sentinel-base-content) !important;
  letter-spacing: 0;
}

.contents h1 {
  border-bottom: 2px solid #8aadff;
  padding-bottom: 0.85rem;
  margin-bottom: 1.25rem;
  font-size: clamp(2rem, 3vw, 2.75rem);
  line-height: 1.08;
}

.contents .toc-anchor {
  color: #6f8dd7 !important;
}

.contents h2 {
  margin-top: 2rem;
  padding-top: 0.35rem;
  font-size: 1.45rem;
}

.contents h3 {
  margin-top: 1.5rem;
  font-size: 1.12rem;
}

.contents p,
.contents li,
.contents td,
.contents th {
  color: #2d3348;
  line-height: 1.62;
}

.contents a {
  color: #174bc7;
  font-weight: 600;
  text-underline-offset: 0.18em;
}

.contents ul,
.contents ol {
  padding-left: 1.35rem;
}

.contents li + li {
  margin-top: 0.35rem;
}

.contents table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  border: 1px solid var(--sentinel-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(31, 37, 56, 0.06);
}

.contents th {
  background: #edf2ff;
  color: #1f3ea8;
  font-weight: 700;
}

.contents td,
.contents th {
  border-bottom: 1px solid var(--sentinel-border);
  padding: 0.72rem 0.85rem;
  vertical-align: top;
}

.contents tr:last-child td {
  border-bottom: 0;
}

.contents blockquote {
  border-left: 4px solid var(--sentinel-warning);
  background: #fffbe8;
  padding: 0.75rem 1rem;
  border-radius: 0 8px 8px 0;
}

.contents img {
  display: block;
  width: auto;
  max-width: min(100%, 1060px);
  height: auto;
  margin: 1.1rem 0 1.55rem;
  border: 1px solid var(--sentinel-border);
  border-radius: 8px;
  background: var(--sentinel-base-100);
  box-shadow: var(--sentinel-shadow);
}

.contents code {
  border: 1px solid #dfe4ec;
  border-radius: 5px;
  background: #eef2f7;
  color: #1f2538;
  padding: 0.08rem 0.3rem;
}

.contents pre {
  border: 1px solid #dfe4ec;
  border-radius: 8px;
  background: #172033;
  box-shadow: 0 12px 30px rgba(23, 32, 51, 0.16);
}

.contents pre code {
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
}

/* Home page CTAs */
.contents a[href*='/docs/start-here'],
.contents a[href*='sentinel.local/dashboard'],
.contents a[href*='/operations/dashboard/'] {
  display: inline-block;
  margin: 0.25rem 0.5rem 0.75rem 0;
  padding: 0.46rem 0.72rem;
  border: 1px solid #c8d5ff;
  border-radius: 999px;
  background: var(--sentinel-primary-soft);
  color: #1f3ea8;
  text-decoration: none;
  font-weight: 600;
  line-height: 1.25;
}

.contents a[href*='/docs/start-here']:hover,
.contents a[href*='sentinel.local/dashboard']:hover,
.contents a[href*='/operations/dashboard/']:hover {
  background: #d6e1ff;
}

/* Placeholder image treatment */
.contents img[alt^='TODO:'] {
  border: 1px dashed var(--sentinel-border);
  background: var(--sentinel-base-200);
  display: block;
  width: 100%;
  max-width: 960px;
  height: auto;
}

.contents strong {
  color: var(--sentinel-base-content);
}

@media (max-width: 900px) {
  .contents {
    font-size: 0.98rem;
  }

  .contents table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}
`

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    skipTheme: argv.includes('--skip-theme'),
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
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    values[key] = value
  }
  return values
}

async function resolveEnv() {
  const fromEnvFile = await loadEnvFile(path.join(ROOT, '.env'))
  const fromDeployEnvFile = await loadEnvFile(path.join(ROOT, 'deploy/.env'))
  return {
    wikiBaseUrl: (
      process.env.WIKI_BASE_URL ||
      fromEnvFile.WIKI_BASE_URL ||
      fromDeployEnvFile.WIKI_BASE_URL ||
      ''
    ).trim(),
    wikiApiKey: (
      process.env.WIKI_API_KEY ||
      fromEnvFile.WIKI_API_KEY ||
      fromDeployEnvFile.WIKI_API_KEY ||
      ''
    ).trim(),
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

function wikiEndpoint(baseUrl, suffix) {
  return baseUrl.endsWith('/') ? `${baseUrl}${suffix}` : `${baseUrl}/${suffix}`
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

async function uploadAsset({ baseUrl, apiKey, folderId, source, filename }) {
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
}

async function findTerminologyViolations(rootDir) {
  const violations = []

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue

      const content = await fs.readFile(fullPath, 'utf8')
      const lines = content.split(/\r?\n/)
      lines.forEach((line, index) => {
        if (line.includes('Day Duty')) {
          violations.push(`${path.relative(ROOT, fullPath)}:${index + 1}: ${line.trim()}`)
        }
      })
    }
  }

  await walk(rootDir)
  return violations
}

function assertRequiredEnv({ wikiBaseUrl, wikiApiKey }) {
  if (!wikiBaseUrl) {
    throw new Error('Missing WIKI_BASE_URL (env, .env, or deploy/.env)')
  }
  if (!wikiApiKey) {
    throw new Error('Missing WIKI_API_KEY (env, .env, or deploy/.env)')
  }
}

async function applySiteConfig({ baseUrl, apiKey, dryRun }) {
  if (dryRun) {
    console.log(`[dry-run] would upload Sentinel logo to ${SITE_LOGO_URL}`)
    console.log('[dry-run] would update Wiki.js site title, description, company, footer, and logo')
    return
  }

  const uploadsFolderId = await ensureFolder({
    baseUrl,
    apiKey,
    parentFolderId: 0,
    slug: 'uploads',
  })
  const wikiDashboardFolderId = await ensureFolder({
    baseUrl,
    apiKey,
    parentFolderId: uploadsFolderId,
    slug: 'wiki-dashboard',
  })
  const brandingFolderId = await ensureFolder({
    baseUrl,
    apiKey,
    parentFolderId: wikiDashboardFolderId,
    slug: 'branding',
  })

  await uploadAsset({
    baseUrl,
    apiKey,
    folderId: brandingFolderId,
    source: SITE_LOGO_SOURCE,
    filename: 'sentinel-logo.png',
  })

  const updated = await graphQLRequest({
    baseUrl,
    apiKey,
    query: SITE_UPDATE_CONFIG_MUTATION,
    variables: {
      title: 'Sentinel Documentation',
      description:
        'Sentinel operational guidance for Dashboard, Presence, lockup, and help workflows.',
      company: 'Sentinel',
      footerOverride: 'Sentinel Operations Wiki - internal operational guidance.',
      logoUrl: SITE_LOGO_URL,
    },
  })

  const result = updated.site.updateConfig.responseResult
  if (!result.succeeded) {
    throw new Error(`Site configuration update failed: ${result.message || 'unknown error'}`)
  }

  console.log('Applied Sentinel site branding and logo.')
}

async function upsertHomePage({ baseUrl, apiKey, content, dryRun }) {
  const pathSlug = 'home'
  const locale = 'en'

  const existingList = await graphQLRequest({
    baseUrl,
    apiKey,
    query: LIST_PAGES_QUERY,
    variables: { locale, limit: 1000 },
  })

  const existingPage = (existingList.pages.list || []).find(
    (page) => page.path === pathSlug && page.locale === locale
  )

  if (dryRun) {
    if (existingPage?.id) {
      console.log(`[dry-run] would update page id=${existingPage.id} path=${pathSlug}`)
    } else {
      console.log('[dry-run] would create page path=home locale=en')
    }
    return
  }

  if (existingPage?.id) {
    const updated = await graphQLRequest({
      baseUrl,
      apiKey,
      query: UPDATE_PAGE_MUTATION,
      variables: {
        id: existingPage.id,
        title: 'Sentinel Operations Wiki Home',
        description: 'Sentinel operational landing page for navigation and response procedures.',
        content,
        tags: ['home', 'operations', 'sentinel'],
        isPublished: true,
        isPrivate: false,
        scriptCss: '',
        scriptJs: '',
      },
    })

    const result = updated.pages.update.responseResult
    if (!result.succeeded) {
      throw new Error(`Update failed: ${result.message || 'unknown error'}`)
    }
    console.log(
      `Updated page id=${updated.pages.update.page.id} path=${updated.pages.update.page.path}`
    )
  } else {
    const created = await graphQLRequest({
      baseUrl,
      apiKey,
      query: CREATE_PAGE_MUTATION,
      variables: {
        title: 'Sentinel Operations Wiki Home',
        description: 'Sentinel operational landing page for navigation and response procedures.',
        content,
        editor: 'markdown',
        isPublished: true,
        isPrivate: false,
        locale,
        path: pathSlug,
        scriptCss: '',
        scriptJs: '',
        tags: ['home', 'operations', 'sentinel'],
      },
    })

    const result = created.pages.create.responseResult
    if (!result.succeeded) {
      throw new Error(`Create failed: ${result.message || 'unknown error'}`)
    }
    console.log(
      `Created page id=${created.pages.create.page.id} path=${created.pages.create.page.path}`
    )
  }
}

async function applyThemeInjection({ baseUrl, apiKey, dryRun }) {
  const themeData = await graphQLRequest({
    baseUrl,
    apiKey,
    query: THEME_CONFIG_QUERY,
  })

  const current = themeData.theming.config

  if (dryRun) {
    console.log(
      '[dry-run] would apply Sentinel injectCSS and preserve existing theme/iconset/mode/toc'
    )
    return
  }

  const updated = await graphQLRequest({
    baseUrl,
    apiKey,
    query: THEME_SET_CONFIG_MUTATION,
    variables: {
      theme: current.theme,
      iconset: current.iconset,
      darkMode: current.darkMode,
      tocPosition: current.tocPosition,
      injectCSS: SENTINEL_INJECT_CSS,
      injectHead: '',
      injectBody: '',
    },
  })

  const result = updated.theming.setConfig.responseResult
  if (!result.succeeded) {
    throw new Error(`Theme update failed: ${result.message || 'unknown error'}`)
  }

  console.log('Applied Sentinel theme injection (injectCSS).')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const env = await resolveEnv()
  assertRequiredEnv(env)

  const violations = await findTerminologyViolations(WIKI_DOCS_ROOT)
  if (violations.length > 0) {
    console.error('Terminology check failed. Found disallowed "Day Duty" text:')
    for (const violation of violations) {
      console.error(`- ${violation}`)
    }
    process.exit(1)
  }

  const homeContent = await fs.readFile(HOME_SOURCE, 'utf8')

  await upsertHomePage({
    baseUrl: env.wikiBaseUrl,
    apiKey: env.wikiApiKey,
    content: homeContent,
    dryRun: args.dryRun,
  })

  await applySiteConfig({
    baseUrl: env.wikiBaseUrl,
    apiKey: env.wikiApiKey,
    dryRun: args.dryRun,
  })

  if (!args.skipTheme) {
    await applyThemeInjection({
      baseUrl: env.wikiBaseUrl,
      apiKey: env.wikiApiKey,
      dryRun: args.dryRun,
    })
  } else {
    console.log('Skipped theme injection (--skip-theme).')
  }

  console.log('Wiki homepage publish workflow complete.')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
