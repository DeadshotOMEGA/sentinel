#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9/-]*$/

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')
const registryPath = resolve(repoRoot, 'apps/frontend-admin/src/help/help-registry.ts')
const indexPath = resolve(repoRoot, 'docs/guides/reference/wiki-slug-index.json')

function extractWikiSlugsFromRegistry(content) {
  const constantMap = new Map()
  const constantRegex = /const\s+([A-Z0-9_]+)\s*=\s*'([^']+)'/g
  for (const match of content.matchAll(constantRegex)) {
    const name = (match[1] ?? '').trim()
    const value = (match[2] ?? '').trim()
    if (name.length > 0 && value.length > 0) {
      constantMap.set(name, value)
    }
  }

  const regex = /wikiSlug:\s*(?:'([^']+)'|([A-Z0-9_]+))/g
  const slugs = []
  const unresolvedConstants = []

  for (const match of content.matchAll(regex)) {
    const literalSlug = (match[1] ?? '').trim()
    const constantName = (match[2] ?? '').trim()

    if (literalSlug.length > 0) {
      slugs.push(literalSlug)
      continue
    }

    if (constantName.length > 0) {
      const resolved = constantMap.get(constantName)
      if (resolved) {
        slugs.push(resolved)
      } else {
        unresolvedConstants.push(constantName)
      }
    }
  }

  return { slugs, unresolvedConstants }
}

function collectDuplicates(values) {
  const counts = new Map()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value)
}

function main() {
  const registrySource = readFileSync(registryPath, 'utf8')
  const indexSource = readFileSync(indexPath, 'utf8')
  const slugIndex = JSON.parse(indexSource)

  if (!Array.isArray(slugIndex.slugs)) {
    console.error('[help-slugs] Invalid wiki slug index: expected "slugs" array.')
    process.exit(1)
  }

  const { slugs: registrySlugs, unresolvedConstants } = extractWikiSlugsFromRegistry(registrySource)
  const registryUnique = [...new Set(registrySlugs)]
  const indexUnique = [...new Set(slugIndex.slugs)]
  const indexSet = new Set(indexUnique)

  const invalidRegistrySlugs = registryUnique.filter((slug) => !SLUG_PATTERN.test(slug))
  const invalidIndexSlugs = indexUnique.filter(
    (slug) => typeof slug !== 'string' || !SLUG_PATTERN.test(slug)
  )
  const duplicateRegistrySlugs = collectDuplicates(registrySlugs)
  const duplicateIndexSlugs = collectDuplicates(slugIndex.slugs)
  const missingFromIndex = registryUnique.filter((slug) => !indexSet.has(slug))

  const hasErrors =
    unresolvedConstants.length > 0 ||
    invalidRegistrySlugs.length > 0 ||
    invalidIndexSlugs.length > 0 ||
    duplicateRegistrySlugs.length > 0 ||
    duplicateIndexSlugs.length > 0 ||
    missingFromIndex.length > 0

  if (hasErrors) {
    console.error('[help-slugs] Validation failed.')
    if (unresolvedConstants.length > 0) {
      console.error(
        `[help-slugs] Could not resolve wikiSlug constant(s): ${unresolvedConstants.join(', ')}`
      )
    }
    if (invalidRegistrySlugs.length > 0) {
      console.error(
        `[help-slugs] Invalid wikiSlug values in help registry: ${invalidRegistrySlugs.join(', ')}`
      )
    }
    if (invalidIndexSlugs.length > 0) {
      console.error(`[help-slugs] Invalid slug values in index: ${invalidIndexSlugs.join(', ')}`)
    }
    if (duplicateRegistrySlugs.length > 0) {
      console.error(
        `[help-slugs] Duplicate wikiSlug values in help registry: ${duplicateRegistrySlugs.join(', ')}`
      )
    }
    if (duplicateIndexSlugs.length > 0) {
      console.error(`[help-slugs] Duplicate slug values in index: ${duplicateIndexSlugs.join(', ')}`)
    }
    if (missingFromIndex.length > 0) {
      console.error(
        `[help-slugs] Missing from wiki slug index: ${missingFromIndex.join(', ')}`
      )
    }
    process.exit(1)
  }

  console.log(
    `[help-slugs] OK. ${registryUnique.length} help-registry wiki slugs validated against wiki slug index.`
  )
}

main()
