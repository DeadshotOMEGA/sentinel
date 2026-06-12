#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const DEFAULT_SOURCE = path.join(ROOT, 'docs/wiki/navigation.json')

const NAVIGATION_TREE_QUERY = `
query {
  navigation {
    tree {
      locale
      items {
        id
        kind
        label
        target
        icon
        visibilityMode
        visibilityGroups
      }
    }
  }
}
`

const UPDATE_NAVIGATION_TREE_MUTATION = `
mutation UpdateNavigationTree($tree: [NavigationTreeInput]!) {
  navigation {
    updateTree(tree: $tree) {
      responseResult {
        succeeded
        message
      }
    }
  }
}
`

function parseArgs(argv) {
  const args = {
    source: DEFAULT_SOURCE,
    dryRun: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--source') args.source = argv[++i] ?? DEFAULT_SOURCE
    else if (arg === '--dry-run') args.dryRun = true
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

function normalizeTarget(target) {
  return target.trim()
}

function validateNavigationSource(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Navigation source must be an object')
  }

  if (typeof source.locale !== 'string' || !source.locale.trim()) {
    throw new Error('Navigation source requires a locale')
  }

  if (!Array.isArray(source.items) || source.items.length === 0) {
    throw new Error('Navigation source requires at least one item')
  }

  const ids = new Set()
  return {
    locale: source.locale.trim(),
    items: source.items.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error(`Navigation item ${index + 1} must be an object`)
      }

      const id = String(item.id ?? '').trim()
      const kind = String(item.kind ?? '').trim()
      const label = String(item.label ?? '').trim()
      const target = normalizeTarget(String(item.target ?? ''))
      const icon = String(item.icon ?? '').trim()
      const visibilityMode = String(item.visibilityMode ?? 'all').trim()
      const visibilityGroups = Array.isArray(item.visibilityGroups)
        ? item.visibilityGroups.map((groupId) => Number(groupId))
        : []

      if (!id) throw new Error(`Navigation item ${index + 1} is missing id`)
      if (ids.has(id)) throw new Error(`Duplicate navigation item id: ${id}`)
      ids.add(id)

      if (kind !== 'link') {
        throw new Error(`Navigation item "${id}" uses unsupported kind "${kind}"`)
      }
      if (!label) throw new Error(`Navigation item "${id}" is missing label`)
      if (
        !target.startsWith('/') &&
        !target.startsWith('http://') &&
        !target.startsWith('https://')
      ) {
        throw new Error(`Navigation item "${id}" target must start with /, http://, or https://`)
      }
      if (!['all', 'groups'].includes(visibilityMode)) {
        throw new Error(`Navigation item "${id}" uses unsupported visibilityMode "${visibilityMode}"`)
      }
      if (visibilityGroups.some((groupId) => !Number.isInteger(groupId) || groupId <= 0)) {
        throw new Error(`Navigation item "${id}" visibilityGroups must contain positive integers`)
      }
      if (visibilityMode === 'groups' && visibilityGroups.length === 0) {
        throw new Error(`Navigation item "${id}" visibilityMode groups requires visibilityGroups`)
      }

      return { id, kind, label, target, icon, visibilityMode, visibilityGroups }
    }),
  }
}

async function loadNavigationSource(sourcePath) {
  const fullPath = path.isAbsolute(sourcePath) ? sourcePath : path.join(ROOT, sourcePath)
  if (!(await fileExists(fullPath))) {
    throw new Error(`Navigation source does not exist: ${sourcePath}`)
  }

  return validateNavigationSource(JSON.parse(await fs.readFile(fullPath, 'utf8')))
}

function summarizeTree(tree) {
  return tree
    .map((localeTree) => {
      const labels = localeTree.items
        .map((item) => {
          const visibility = item.visibilityMode ? ` [${item.visibilityMode}]` : ' [hidden]'
          return `${item.label} -> ${item.target}${visibility}`
        })
        .join('; ')
      return `${localeTree.locale}: ${labels}`
    })
    .join('\n')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const env = await resolveEnv()
  requireEnv(env)

  const navigation = await loadNavigationSource(args.source)
  const tree = [{ locale: navigation.locale, items: navigation.items }]

  if (args.dryRun) {
    const current = await graphQLRequest({
      baseUrl: env.wikiBaseUrl,
      apiKey: env.wikiApiKey,
      query: NAVIGATION_TREE_QUERY,
    })

    console.log('[dry-run] current navigation:')
    console.log(summarizeTree(current.navigation.tree || []))
    console.log('[dry-run] proposed navigation:')
    console.log(summarizeTree(tree))
    return
  }

  const data = await graphQLRequest({
    baseUrl: env.wikiBaseUrl,
    apiKey: env.wikiApiKey,
    query: UPDATE_NAVIGATION_TREE_MUTATION,
    variables: { tree },
  })

  const result = data.navigation.updateTree.responseResult
  if (!result.succeeded) {
    throw new Error(`Navigation update failed: ${result.message || 'unknown error'}`)
  }

  console.log(
    `Navigation updated for locale=${navigation.locale} with ${navigation.items.length} items.`
  )
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
