#!/usr/bin/env node
/**
 * Claude Code Hook: CLAUDE.md Linter + Auto-Fixer (PostToolUse)
 *
 * Validates CLAUDE.md files that were recently modified.
 * Since stdin isn't reliably passed in some environments (WSL2),
 * this hook checks for CLAUDE.md files modified in the last 5 seconds.
 *
 * Output: Exit 0 on success, exit 1 on error (blocks the edit)
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// ============================================================================
// Configuration
// ============================================================================

const REQUIRED_SECTIONS = ['## Scope', '## Non-Negotiables', '## Defaults']
const TOKEN_LIMIT = 600
const CHARS_PER_TOKEN = 4
const MAX_FIX_ATTEMPTS = 2
const MODIFIED_THRESHOLD_MS = 5000 // Check files modified in last 5 seconds

const WEAK_LANGUAGE_PATTERNS = [
  /\btry to\b/gi,
  /\bconsider\b/gi,
  /\bgenerally\b/gi,
  /\bit is recommended\b/gi,
  /\byou might want to\b/gi,
  /\bperhaps\b/gi,
  /\bmaybe\b/gi,
  /\bpossibly\b/gi,
]

const CLAUDE_REFERENCE_PATTERNS = [
  /\[[^\]]*\]\([^)]*CLAUDE\.md\)/g,
  /@[^\s]+CLAUDE\.md\b/g,
  /see\s+[^\s]*CLAUDE\.md\b/gi,
  /\*\*Related\*\*:.*CLAUDE\.md/gi,
]

// ============================================================================
// Utility Functions
// ============================================================================

function estimateTokens(text) {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function findCodeBlocks(content) {
  const codeBlockRegex = /```[\s\S]*?```/g
  const matches = content.match(codeBlockRegex) || []
  return matches.map((block) => ({
    tokens: estimateTokens(block),
  }))
}

function findClaudeReferences(content) {
  const matches = []
  for (const pattern of CLAUDE_REFERENCE_PATTERNS) {
    const found = content.match(pattern)
    if (found) {
      const filtered = found.filter((match) => {
        const lower = match.toLowerCase()
        if (lower.includes('this claude.md') || lower.includes('every claude.md')) return false
        const linkMatch = match.match(/\[[^\]]*\]\(([^)]+)\)/)
        if (linkMatch) return linkMatch[1].endsWith('CLAUDE.md')
        return true
      })
      matches.push(...filtered)
    }
  }
  return [...new Set(matches)]
}

function findWeakLanguage(content) {
  const matches = []
  for (const pattern of WEAK_LANGUAGE_PATTERNS) {
    const found = content.match(pattern)
    if (found) matches.push(...found)
  }
  return [...new Set(matches)]
}

function checkTitleFormat(content) {
  return content.split('\n')[0].startsWith('# CLAUDE Rules:')
}

function countRules(content) {
  return {
    must: (content.match(/\bMUST\b/g) || []).length,
    mustNot: (content.match(/\bMUST NOT\b/g) || []).length,
    should: (content.match(/\bSHOULD\b/g) || []).length,
  }
}

// ============================================================================
// Find Recently Modified CLAUDE.md Files
// ============================================================================

function findRecentlyModifiedClaudeMd(projectDir) {
  const now = Date.now()
  const recentFiles = []

  function walkDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        // Skip node_modules and hidden directories (except .claude)
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules') continue
          if (entry.name.startsWith('.') && entry.name !== '.claude') continue
          walkDir(fullPath)
        } else if (entry.name === 'CLAUDE.md') {
          try {
            const stat = fs.statSync(fullPath)
            const age = now - stat.mtimeMs
            if (age < MODIFIED_THRESHOLD_MS) {
              recentFiles.push({ path: fullPath, age })
            }
          } catch {
            // Skip files we can't stat
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  walkDir(projectDir)
  return recentFiles
}

// ============================================================================
// Validation
// ============================================================================

function validate(content) {
  const errors = []
  const warnings = []
  const fixable = { codeBlocks: false, claudeRefs: false }

  const tokens = estimateTokens(content)
  const codeBlocks = findCodeBlocks(content)
  const codeBlockTokens = codeBlocks.reduce((sum, b) => sum + b.tokens, 0)
  const claudeRefs = findClaudeReferences(content)
  const rules = countRules(content)

  // ERROR: Missing sections
  const missing = REQUIRED_SECTIONS.filter((s) => !content.includes(s))
  if (missing.length > 0) {
    errors.push(`Missing sections: ${missing.join(', ')}`)
  }

  // ERROR: CLAUDE.md cross-references
  if (claudeRefs.length > 0) {
    errors.push(`${claudeRefs.length} cross-references to CLAUDE.md files`)
    fixable.claudeRefs = true
  }

  // ERROR: Over token limit
  if (tokens > TOKEN_LIMIT) {
    errors.push(`~${tokens} tokens (limit: ${TOKEN_LIMIT})`)
    if (codeBlocks.length > 0) {
      errors.push(`${codeBlocks.length} code blocks (~${codeBlockTokens} tokens) can be extracted`)
      fixable.codeBlocks = true
    }
  }

  // WARNINGS
  if (!checkTitleFormat(content)) {
    warnings.push('Title should start with "# CLAUDE Rules:"')
  }

  const weak = findWeakLanguage(content)
  if (weak.length > 0) {
    warnings.push(`Weak language: "${weak.slice(0, 2).join('", "')}"`)
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    fixable: fixable.codeBlocks || fixable.claudeRefs,
    stats: { tokens, codeBlocks: codeBlocks.length, codeBlockTokens, rules },
  }
}

// ============================================================================
// Auto-Fix
// ============================================================================

function runFixer(filePath) {
  const fixerPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'claudemd-fixer.js')

  try {
    const output = execSync(`node "${fixerPath}" "${filePath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { success: true, output }
  } catch (err) {
    return { success: false, output: err.message }
  }
}

// ============================================================================
// Main
// ============================================================================

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()

// Find recently modified CLAUDE.md files
const recentFiles = findRecentlyModifiedClaudeMd(projectDir)

if (recentFiles.length === 0) {
  // No CLAUDE.md files were modified recently
  process.exit(0)
}

let hasFailures = false

for (const { path: filePath } of recentFiles) {
  let content
  try {
    content = fs.readFileSync(filePath, 'utf8')
  } catch {
    continue
  }

  const shortPath = filePath.replace(projectDir + '/', '')

  // Initial validation
  let result = validate(content)

  if (result.passed) {
    if (result.warnings.length > 0) {
      console.error(`⚠️  ${shortPath} (~${result.stats.tokens} tokens)`)
      result.warnings.forEach((w) => console.error(`   WARN: ${w}`))
    } else {
      console.error(`✅ ${shortPath} (~${result.stats.tokens} tokens)`)
    }
    continue
  }

  // File failed - attempt auto-fix if possible
  if (result.fixable) {
    console.error(`🔧 ${shortPath} - Auto-fixing...`)
    console.error(`   Before: ~${result.stats.tokens} tokens, ${result.stats.codeBlocks} code blocks`)

    for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
      const fixResult = runFixer(filePath)

      if (!fixResult.success) {
        console.error(`   Fix attempt ${attempt} failed: ${fixResult.output}`)
        break
      }

      // Re-read and re-validate
      try {
        content = fs.readFileSync(filePath, 'utf8')
      } catch {
        break
      }

      result = validate(content)

      if (result.passed) {
        console.error(`   After: ~${result.stats.tokens} tokens`)
        console.error(`✅ ${shortPath} - Fixed automatically!`)

        if (result.warnings.length > 0) {
          result.warnings.forEach((w) => console.error(`   WARN: ${w}`))
        }

        break
      }

      // Check if we made progress
      if (!result.fixable) {
        console.error(`   After: ~${result.stats.tokens} tokens (no more auto-fixable issues)`)
        break
      }
    }
  }

  // Check if still failing after auto-fix attempts
  if (!result.passed) {
    hasFailures = true
    console.error(`❌ ${shortPath} - FAILED`)
    console.error(`   Tokens: ~${result.stats.tokens} | Rules: ${result.stats.rules.must} MUST, ${result.stats.rules.should} SHOULD`)
    console.error('')
    result.errors.forEach((e) => console.error(`   ERROR: ${e}`))

    if (result.warnings.length > 0) {
      console.error('')
      result.warnings.forEach((w) => console.error(`   WARN: ${w}`))
    }

    console.error('')
    console.error('   Manual fixes needed:')
    console.error('   - Move explanatory text to docs/')
    console.error('   - Keep only MUST/SHOULD/MAY rules')
    console.error('   - Remove "Why" explanations')
  }
}

process.exit(hasFailures ? 1 : 0)
