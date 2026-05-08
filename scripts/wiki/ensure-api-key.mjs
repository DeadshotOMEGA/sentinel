#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const DEFAULT_ENV_PATH = path.join(ROOT, 'deploy/.env')
const DEFAULT_CONTAINER = 'sentinel-wikijs'
const DEFAULT_KEY_NAME = 'Sentinel publish automation'
const DEFAULT_EXPIRATION = '365d'

function parseArgs(argv) {
  const args = {
    envPath: DEFAULT_ENV_PATH,
    container: DEFAULT_CONTAINER,
    name: DEFAULT_KEY_NAME,
    expiration: DEFAULT_EXPIRATION,
    skipRestart: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--env') args.envPath = path.resolve(argv[++i] ?? DEFAULT_ENV_PATH)
    else if (arg === '--container') args.container = argv[++i] ?? DEFAULT_CONTAINER
    else if (arg === '--name') args.name = argv[++i] ?? DEFAULT_KEY_NAME
    else if (arg === '--expiration') args.expiration = argv[++i] ?? DEFAULT_EXPIRATION
    else if (arg === '--skip-restart') args.skipRestart = true
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
  if (!(await fileExists(envPath))) return ''
  return fs.readFile(envPath, 'utf8')
}

function envHasKey(source, key) {
  return new RegExp(`(^|\\n)${key}=`).test(source)
}

async function upsertEnv(envPath, key, value) {
  const current = await loadEnvFile(envPath)
  const line = `${key}=${value}`

  let next
  if (envHasKey(current, key)) {
    next = current.replace(new RegExp(`(^|\\n)${key}=.*`), `$1${line}`)
  } else {
    const separator = current.length > 0 && !current.endsWith('\n') ? '\n' : ''
    next = `${current}${separator}${line}\n`
  }

  await fs.mkdir(path.dirname(envPath), { recursive: true })
  await fs.writeFile(envPath, next, { mode: 0o600 })
}

function createOrReuseWikiApiKey({ container, name, expiration }) {
  const script = `
const { Client } = require('pg')
const jwt = require('jsonwebtoken')
const ms = require('ms')

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
  })

  await client.connect()

  const existing = await client.query(
    'SELECT id, key FROM "apiKeys" WHERE name = $1 AND "isRevoked" = false AND expiration > $2 ORDER BY id DESC LIMIT 1',
    [${JSON.stringify(name)}, new Date().toISOString()]
  )

  if (existing.rows[0]?.key) {
    await client.query(
      'INSERT INTO settings (key, value, "updatedAt") VALUES ($1, $2::json, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = EXCLUDED."updatedAt"',
      ['api', JSON.stringify({ isEnabled: true }), new Date().toISOString()]
    )
    console.log(JSON.stringify({ action: 'reused', id: existing.rows[0].id, key: existing.rows[0].key }))
    await client.end()
    return
  }

  const settings = await client.query(
    "SELECT key, value FROM settings WHERE key IN ('sessionSecret', 'certs', 'auth')"
  )
  const byKey = Object.fromEntries(settings.rows.map((row) => [row.key, row.value]))
  const sessionSecret =
    typeof byKey.sessionSecret === 'string' ? byKey.sessionSecret : byKey.sessionSecret?.v
  const certs = byKey.certs
  const auth = byKey.auth || { audience: 'urn:wiki.js' }
  const now = new Date().toISOString()
  const expirationMs = ms(${JSON.stringify(expiration)})

  if (!sessionSecret || !certs?.private || !expirationMs) {
    throw new Error('Wiki.js signing configuration is incomplete')
  }

  const inserted = await client.query(
    'INSERT INTO "apiKeys" (name, key, expiration, "isRevoked", "createdAt", "updatedAt") VALUES ($1, $2, $3, true, $4, $4) RETURNING id',
    [${JSON.stringify(name)}, 'pending', new Date(Date.now() + expirationMs).toISOString(), now]
  )

  const id = inserted.rows[0].id
  const key = jwt.sign(
    { api: id, grp: 1 },
    { key: certs.private, passphrase: sessionSecret },
    {
      algorithm: 'RS256',
      expiresIn: ${JSON.stringify(expiration)},
      audience: auth.audience || 'urn:wiki.js',
      issuer: 'urn:wiki.js',
    }
  )

  await client.query(
    'UPDATE "apiKeys" SET key = $1, "isRevoked" = false, "updatedAt" = $2 WHERE id = $3',
    [key, new Date().toISOString(), id]
  )

  await client.query(
    'INSERT INTO settings (key, value, "updatedAt") VALUES ($1, $2::json, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = EXCLUDED."updatedAt"',
    ['api', JSON.stringify({ isEnabled: true }), new Date().toISOString()]
  )

  console.log(JSON.stringify({ action: 'created', id, key }))
  await client.end()
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
`

  const output = execFileSync('docker', ['exec', '-i', '-w', '/wiki', container, 'node'], {
    input: script,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()

  return JSON.parse(output)
}

function restartWiki(container) {
  execFileSync('docker', ['restart', container], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const result = createOrReuseWikiApiKey(args)
  await upsertEnv(args.envPath, 'WIKI_API_KEY', result.key)

  if (!args.skipRestart) {
    restartWiki(args.container)
  }

  console.log(
    `[wiki-api-key] ${result.action} key id=${result.id}; wrote WIKI_API_KEY to ${path.relative(
      ROOT,
      args.envPath
    )}; ${args.skipRestart ? 'restart skipped' : `restarted ${args.container}`}.`
  )
}

main().catch((error) => {
  console.error(`[wiki-api-key] ${error.message}`)
  process.exit(1)
})
