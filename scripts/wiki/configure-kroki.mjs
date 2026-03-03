#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()

const RENDERERS_QUERY = `
query {
  rendering {
    renderers {
      isEnabled
      key
      title
      description
      icon
      dependsOn
      input
      output
      config {
        key
        value
      }
    }
  }
}
`

const UPDATE_RENDERERS_MUTATION = `
mutation($renderers: [RendererInput]) {
  rendering {
    updateRenderers(renderers: $renderers) {
      responseResult {
        succeeded
        errorCode
        slug
        message
      }
    }
  }
}
`

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    server: readOption(argv, '--server'),
  }
}

function readOption(argv, name) {
  const index = argv.indexOf(name)
  if (index === -1) return ''
  return argv[index + 1] ?? ''
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
    wikiBaseUrl: (process.env.WIKI_BASE_URL || rootEnv.WIKI_BASE_URL || deployEnv.WIKI_BASE_URL || '').trim(),
    wikiApiKey: (process.env.WIKI_API_KEY || rootEnv.WIKI_API_KEY || '').trim(),
    krokiServerUrl: (
      process.env.KROKI_SERVER_URL ||
      deployEnv.KROKI_SERVER_URL ||
      rootEnv.KROKI_SERVER_URL ||
      'http://kroki:8000'
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

function parseConfigValue(rawValue) {
  try {
    const parsed = JSON.parse(rawValue)
    if (parsed && parsed.value == null && parsed.default != null) {
      parsed.value = parsed.default
    }
    return parsed
  } catch {
    return { value: rawValue }
  }
}

function serializeConfigValue(config) {
  return JSON.stringify({ v: config.value })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const env = await resolveEnv()

  if (!env.wikiBaseUrl) throw new Error('Missing WIKI_BASE_URL (env, .env, or deploy/.env)')
  if (!env.wikiApiKey) throw new Error('Missing WIKI_API_KEY (env or .env)')

  const targetServer = args.server || env.krokiServerUrl
  const data = await graphQLRequest({
    baseUrl: env.wikiBaseUrl,
    apiKey: env.wikiApiKey,
    query: RENDERERS_QUERY,
  })

  const krokiRenderer = (data.rendering.renderers || []).find((renderer) => renderer.key === 'markdownKroki')
  if (!krokiRenderer) {
    throw new Error('Wiki.js renderer markdownKroki was not found.')
  }

  const parsedConfig = (krokiRenderer.config || []).map((entry) => ({
    key: entry.key,
    value: parseConfigValue(entry.value),
  }))

  const serverConfig = parsedConfig.find((entry) => entry.key === 'server')
  if (!serverConfig) {
    throw new Error('markdownKroki config missing required server field.')
  }
  serverConfig.value.value = targetServer

  const updatePayload = [
    {
      key: krokiRenderer.key,
      isEnabled: true,
      config: parsedConfig.map((entry) => ({
        key: entry.key,
        value: serializeConfigValue(entry.value),
      })),
    },
  ]

  if (args.dryRun) {
    console.log(`[dry-run] would enable markdownKroki with server=${targetServer}`)
    return
  }

  const updated = await graphQLRequest({
    baseUrl: env.wikiBaseUrl,
    apiKey: env.wikiApiKey,
    query: UPDATE_RENDERERS_MUTATION,
    variables: { renderers: updatePayload },
  })

  const result = updated.rendering.updateRenderers.responseResult
  if (!result.succeeded) {
    throw new Error(`Kroki renderer update failed: ${result.message || 'unknown error'}`)
  }

  console.log(`Enabled Wiki.js markdownKroki renderer with server=${targetServer}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
