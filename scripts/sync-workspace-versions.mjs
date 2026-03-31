#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const thisDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(thisDir, '..')
const checkOnly = process.argv.includes('--check')

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function collectWorkspacePackageJsonPaths(relativeDir) {
  const absoluteDir = resolve(repoRoot, relativeDir)
  if (!existsSync(absoluteDir)) {
    return []
  }

  return readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(absoluteDir, entry.name, 'package.json'))
    .filter((packageJsonPath) => existsSync(packageJsonPath))
}

function toRelativePath(absolutePath) {
  return absolutePath.replace(`${repoRoot}/`, '')
}

const rootPackagePath = resolve(repoRoot, 'package.json')
const rootPackageJson = readJson(rootPackagePath)

if (typeof rootPackageJson.version !== 'string' || rootPackageJson.version.trim().length === 0) {
  console.error('Root package.json must define a non-empty "version".')
  process.exit(1)
}

const targetVersion = rootPackageJson.version.trim()
const workspacePackagePaths = [
  ...collectWorkspacePackageJsonPaths('apps'),
  ...collectWorkspacePackageJsonPaths('packages'),
]

const mismatches = []

for (const packagePath of workspacePackagePaths) {
  const packageJson = readJson(packagePath)
  if (typeof packageJson.version !== 'string') {
    continue
  }

  if (packageJson.version === targetVersion) {
    continue
  }

  mismatches.push({
    path: packagePath,
    current: packageJson.version,
  })

  if (!checkOnly) {
    packageJson.version = targetVersion
    writeJson(packagePath, packageJson)
  }
}

if (checkOnly) {
  if (mismatches.length === 0) {
    console.log(`Workspace versions are in sync with root version ${targetVersion}.`)
    process.exit(0)
  }

  console.error(`Found ${mismatches.length} workspace package version mismatch(es):`)
  for (const mismatch of mismatches) {
    console.error(`- ${toRelativePath(mismatch.path)}: ${mismatch.current} -> ${targetVersion}`)
  }
  process.exit(1)
}

if (mismatches.length === 0) {
  console.log(`No version changes needed. Workspace already matches ${targetVersion}.`)
} else {
  console.log(`Synchronized ${mismatches.length} workspace package version(s) to ${targetVersion}.`)
  for (const mismatch of mismatches) {
    console.log(`- ${toRelativePath(mismatch.path)}: ${mismatch.current} -> ${targetVersion}`)
  }
}
