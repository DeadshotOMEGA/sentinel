#!/usr/bin/env tsx
import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { baselinePrismaMigrations } from './baseline-prisma-migrations.js'

function runPrismaMigrateDeploy(): { ok: boolean; output: string } {
  const result = spawnSync('prisma', ['migrate', 'deploy'], {
    encoding: 'utf8',
    stdio: 'pipe',
    env: process.env,
  })

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)

  return { ok: result.status === 0, output }
}

async function main() {
  const first = runPrismaMigrateDeploy()
  if (first.ok) {
    return
  }

  if (!first.output.includes('P3005')) {
    process.exit(1)
  }

  console.warn('Detected P3005 (non-empty DB without Prisma baseline). Applying baseline...')
  const baseline = await baselinePrismaMigrations()
  console.warn(`Baseline complete: inserted=${baseline.inserted}, skipped=${baseline.skipped}`)

  const second = runPrismaMigrateDeploy()
  if (!second.ok) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('safe migrate deploy failed:', error)
  process.exit(1)
})
