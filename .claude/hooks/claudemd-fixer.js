#!/usr/bin/env node
/**
 * CLAUDE.md Auto-Fixer
 *
 * Automatically fixes CLAUDE.md files that exceed token limits by:
 * 1. Extracting code blocks to docs/guides/reference/
 * 2. Keeping only rules (MUST/SHOULD/MAY statements)
 * 3. Adding a pointer to the extracted reference doc
 *
 * Usage: node .claude/hooks/claudemd-fixer.js <path-to-CLAUDE.md> [--dry-run]
 */

import fs from 'fs'
import path from 'path'

// ============================================================================
// Configuration
// ============================================================================

const TOKEN_BUDGET = 600
const CHARS_PER_TOKEN = 4
const DOCS_REF_DIR = 'docs/guides/reference'

// ============================================================================
// Utility Functions
// ============================================================================

function estimateTokens(text) {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function findCodeBlocks(content) {
  const codeBlockRegex = /```[\s\S]*?```/g
  const matches = []
  let match
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const block = match[0]
    const lines = block.split('\n')
    const lang = lines[0].replace('```', '').trim() || 'text'
    matches.push({
      full: block,
      lang,
      content: lines.slice(1, -1).join('\n'),
      start: match.index,
      end: match.index + block.length,
      tokens: estimateTokens(block),
    })
  }
  return matches
}

function generateRefDocName(claudePath) {
  // Convert CLAUDE.md path to reference doc name
  // e.g., apps/backend/src/routes/CLAUDE.md -> route-patterns.md
  const dir = path.dirname(claudePath)
  const parts = dir.split(path.sep).filter((p) => p && p !== '.' && p !== 'src')
  const lastName = parts[parts.length - 1] || 'general'

  // Map common directory names to descriptive reference names
  const nameMap = {
    routes: 'route-patterns',
    repositories: 'repository-patterns',
    middleware: 'middleware-patterns',
    lib: 'lib-patterns',
    tests: 'test-patterns',
    database: 'database-patterns',
    contracts: 'contract-patterns',
    prisma: 'prisma-patterns',
    backend: 'backend-patterns',
  }

  return (nameMap[lastName] || `${lastName}-patterns`) + '.md'
}

function extractSectionWithCodeBlocks(content, sectionName) {
  // Find a section and its code blocks
  const sectionRegex = new RegExp(`(### ${sectionName}[\\s\\S]*?)(?=###|$)`, 'g')
  const match = sectionRegex.exec(content)
  return match ? match[1] : null
}

function generateReferenceDoc(claudePath, codeBlocks, originalContent) {
  const refName = generateRefDocName(claudePath)
  const title = refName.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  // Group code blocks by their preceding heading
  let doc = `# ${title}

Code examples and patterns extracted from CLAUDE.md rules.

> **Note**: This file contains reference examples. The actual rules are in the corresponding CLAUDE.md file.

---

`

  // Try to preserve context around code blocks
  const lines = originalContent.split('\n')
  let currentSection = 'General'

  for (const block of codeBlocks) {
    // Find the nearest heading before this code block
    const blockLineStart = originalContent.substring(0, block.start).split('\n').length - 1
    for (let i = blockLineStart; i >= 0; i--) {
      if (lines[i].startsWith('###')) {
        currentSection = lines[i].replace(/^#+\s*/, '')
        break
      } else if (lines[i].startsWith('##')) {
        currentSection = lines[i].replace(/^#+\s*/, '')
        break
      }
    }

    doc += `## ${currentSection}\n\n`
    doc += block.full + '\n\n'
  }

  return { name: refName, content: doc }
}

function stripCodeBlocks(content, codeBlocks) {
  // Remove code blocks from content, working backwards to preserve indices
  let result = content
  const sortedBlocks = [...codeBlocks].sort((a, b) => b.start - a.start)

  for (const block of sortedBlocks) {
    // Find the section this block belongs to and check if it's a "Quick Reference" or "Pattern" section
    const before = result.substring(0, block.start)
    const after = result.substring(block.end)

    // Check if there's descriptive text right before the code block
    const linesBefore = before.split('\n')
    const lastNonEmptyLine = linesBefore
      .slice()
      .reverse()
      .find((l) => l.trim())
    const isAfterHeading = lastNonEmptyLine && /^#+\s/.test(lastNonEmptyLine)
    const isAfterDescription = lastNonEmptyLine && !lastNonEmptyLine.startsWith('#') && lastNonEmptyLine.trim().endsWith(':')

    if (isAfterHeading || isAfterDescription) {
      // Remove the code block but keep structure
      result = before + after
    } else {
      result = before + after
    }
  }

  return result
}

function cleanupEmptySections(content) {
  // Remove sections that are now empty (only have heading, no content)
  const lines = content.split('\n')
  const result = []
  let skipUntilNextSection = false
  let lastHeadingLevel = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const headingMatch = line.match(/^(#+)\s/)

    if (headingMatch) {
      const level = headingMatch[1].length

      // Check if the section has content
      let hasContent = false
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j]
        if (nextLine.match(/^#+\s/) && nextLine.match(/^#+/)[0].length <= level) {
          break
        }
        if (nextLine.trim() && !nextLine.match(/^#+\s/)) {
          hasContent = true
          break
        }
      }

      if (!hasContent && level >= 3) {
        // Skip empty subsections
        skipUntilNextSection = true
        lastHeadingLevel = level
        continue
      }

      skipUntilNextSection = false
    }

    if (!skipUntilNextSection) {
      result.push(line)
    }
  }

  // Clean up multiple consecutive blank lines
  return result.join('\n').replace(/\n{3,}/g, '\n\n')
}

function addReferencePointer(content, refDocPath) {
  // Add a pointer to the reference doc in the Quick Reference section
  const pointer = `\n**Code Examples**: See [${path.basename(refDocPath)}](${refDocPath}) for implementation patterns.\n`

  // Try to add after Quick Reference heading
  if (content.includes('## Quick Reference')) {
    return content.replace('## Quick Reference', '## Quick Reference' + pointer)
  }

  // Or add at the end before any trailing content
  const lastSection = content.lastIndexOf('\n---\n')
  if (lastSection > 0) {
    return content.substring(0, lastSection) + pointer + content.substring(lastSection)
  }

  return content + pointer
}

// ============================================================================
// Main
// ============================================================================

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const filePath = args.find((a) => !a.startsWith('--'))

if (!filePath) {
  console.error('Usage: node claudemd-fixer.js <path-to-CLAUDE.md> [--dry-run]')
  console.error('')
  console.error('Options:')
  console.error('  --dry-run    Show what would be done without making changes')
  process.exit(1)
}

if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found: ${filePath}`)
  process.exit(1)
}

if (!filePath.endsWith('CLAUDE.md')) {
  console.error('Error: File must be a CLAUDE.md file')
  process.exit(1)
}

const content = fs.readFileSync(filePath, 'utf8')
const initialTokens = estimateTokens(content)

console.log(`\n📄 Analyzing: ${filePath}`)
console.log(`   Current tokens: ~${initialTokens} (limit: ${TOKEN_BUDGET})`)

if (initialTokens <= TOKEN_BUDGET) {
  console.log(`   ✅ File is already within token budget`)
  process.exit(0)
}

const codeBlocks = findCodeBlocks(content)
const codeBlockTokens = codeBlocks.reduce((sum, b) => sum + b.tokens, 0)

console.log(`   Code blocks: ${codeBlocks.length} (~${codeBlockTokens} tokens)`)

if (codeBlocks.length === 0) {
  console.log(`   ⚠️  No code blocks to extract. Manual reduction needed.`)
  process.exit(1)
}

// Generate the reference doc
const refDoc = generateReferenceDoc(filePath, codeBlocks, content)
const projectRoot = process.cwd()
const refDocPath = path.join(DOCS_REF_DIR, refDoc.name)
const fullRefDocPath = path.join(projectRoot, refDocPath)

// Strip code blocks and clean up
let newContent = stripCodeBlocks(content, codeBlocks)
newContent = cleanupEmptySections(newContent)
newContent = addReferencePointer(newContent, refDocPath)

const newTokens = estimateTokens(newContent)
const refDocTokens = estimateTokens(refDoc.content)

console.log(``)
console.log(`📊 Results:`)
console.log(`   CLAUDE.md: ${initialTokens} → ${newTokens} tokens (${initialTokens - newTokens} saved)`)
console.log(`   Reference doc: ${refDocPath} (~${refDocTokens} tokens)`)
console.log(``)

if (dryRun) {
  console.log(`🔍 DRY RUN - No changes made`)
  console.log(``)
  console.log(`Would create: ${refDocPath}`)
  console.log(`Would update: ${filePath}`)
  console.log(``)
  console.log(`--- New CLAUDE.md preview (first 50 lines) ---`)
  console.log(newContent.split('\n').slice(0, 50).join('\n'))
  console.log(`...`)
  process.exit(0)
}

// Ensure docs directory exists
const refDocDir = path.dirname(fullRefDocPath)
if (!fs.existsSync(refDocDir)) {
  fs.mkdirSync(refDocDir, { recursive: true })
}

// Write the files
fs.writeFileSync(fullRefDocPath, refDoc.content)
fs.writeFileSync(filePath, newContent)

console.log(`✅ Fixed!`)
console.log(`   Created: ${refDocPath}`)
console.log(`   Updated: ${filePath}`)

if (newTokens > TOKEN_BUDGET) {
  console.log(``)
  console.log(`⚠️  File is still over budget (~${newTokens} tokens). Manual reduction may be needed.`)
}
