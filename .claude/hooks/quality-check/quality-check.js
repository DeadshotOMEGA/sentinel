#!/usr/bin/env node
/**
 * Sentinel Quality Check Hook
 *
 * Post-tool-use hook for Claude Code that validates TypeScript code quality.
 * Runs TypeScript compilation, ESLint, Prettier, and custom pattern checks.
 *
 * Based on: bartolli/claude-code-typescript-hooks
 * Adapted for: Sentinel monorepo structure
 *
 * Exit codes:
 * 0 = All checks passed
 * 1 = Tool error (dependencies missing)
 * 2 = Quality issues found (blocks edit)
 */

import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Configuration
const CONFIG = {
  projectRoot: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  debug: process.env.CLAUDE_HOOKS_DEBUG === 'true',
  checks: {
    typescript: process.env.CLAUDE_HOOKS_TYPESCRIPT !== 'false',
    eslint: process.env.CLAUDE_HOOKS_ESLINT !== 'false',
    prettier: process.env.CLAUDE_HOOKS_PRETTIER !== 'false',
  },
  autoFix: {
    eslint: process.env.CLAUDE_HOOKS_ESLINT_AUTOFIX !== 'false',
    prettier: process.env.CLAUDE_HOOKS_PRETTIER_AUTOFIX !== 'false',
  },
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
}

function log(message, color = 'reset') {
  if (CONFIG.debug || color !== 'gray') {
    console.log(`${colors[color]}${message}${colors.reset}`)
  }
}

function error(message) {
  console.error(`${colors.red}${message}${colors.reset}`)
}

/**
 * Parse JSON input from stdin
 */
async function parseInput() {
  return new Promise((resolve, reject) => {
    let data = ''

    process.stdin.on('data', (chunk) => {
      data += chunk
    })

    process.stdin.on('end', () => {
      try {
        const input = JSON.parse(data)
        resolve(input)
      } catch (err) {
        reject(new Error(`Failed to parse JSON input: ${err.message}`))
      }
    })

    process.stdin.on('error', reject)
  })
}

/**
 * Extract file path from tool input
 */
function extractFilePath(input) {
  // Handle different input formats
  if (typeof input === 'string') {
    return input
  }

  if (input.file_path) {
    return input.file_path
  }

  if (input.path) {
    return input.path
  }

  if (Array.isArray(input) && input.length > 0) {
    return input[0].file_path || input[0].path || input[0]
  }

  return null
}

/**
 * Check if file should be validated
 */
function shouldValidate(filePath) {
  if (!filePath) return false

  const ext = path.extname(filePath)
  const validExtensions = ['.ts', '.tsx', '.js', '.jsx']

  // Skip non-TypeScript/JavaScript files
  if (!validExtensions.includes(ext)) {
    log(`Skipping non-TS/JS file: ${filePath}`, 'gray')
    return false
  }

  // Skip generated files
  const excludePatterns = [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.next/',
    '/generated/',
    '.d.ts',
  ]

  if (excludePatterns.some((pattern) => filePath.includes(pattern))) {
    log(`Skipping excluded file: ${filePath}`, 'gray')
    return false
  }

  // Check if file exists
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(CONFIG.projectRoot, filePath)

  if (!fs.existsSync(fullPath)) {
    log(`Skipping non-existent file: ${filePath}`, 'gray')
    return false
  }

  return true
}

/**
 * Run TypeScript compilation check
 */
async function checkTypeScript(filePath) {
  if (!CONFIG.checks.typescript) {
    return { passed: true, errors: [] }
  }

  log(`Running TypeScript check on ${filePath}...`, 'gray')

  try {
    const { stdout, stderr } = await execAsync(
      `pnpm tsc --noEmit --pretty false ${filePath}`,
      { cwd: CONFIG.projectRoot }
    )

    if (stderr) {
      const errors = stderr
        .split('\n')
        .filter((line) => line.includes(filePath))
        .map((line) => line.trim())

      if (errors.length > 0) {
        return { passed: false, errors }
      }
    }

    log('✅ TypeScript check passed', 'green')
    return { passed: true, errors: [] }
  } catch (err) {
    const errors = err.stderr
      ?.split('\n')
      .filter((line) => line.includes(filePath))
      .map((line) => line.trim()) || []

    return { passed: false, errors }
  }
}

/**
 * Run ESLint check
 */
async function checkESLint(filePath) {
  if (!CONFIG.checks.eslint) {
    return { passed: true, errors: [], fixed: false }
  }

  log(`Running ESLint check on ${filePath}...`, 'gray')

  try {
    const fixFlag = CONFIG.autoFix.eslint ? '--fix' : ''
    const { stdout, stderr } = await execAsync(
      `pnpm eslint ${fixFlag} --format json ${filePath}`,
      { cwd: CONFIG.projectRoot }
    )

    if (stdout) {
      try {
        const results = JSON.parse(stdout)
        if (results.length > 0 && results[0].errorCount > 0) {
          const errors = results[0].messages.map(
            (msg) => `${filePath}:${msg.line}:${msg.column} - ${msg.message} (${msg.ruleId})`
          )
          return {
            passed: false,
            errors,
            fixed: CONFIG.autoFix.eslint && results[0].output !== undefined,
          }
        }
      } catch (parseErr) {
        // ESLint might output non-JSON on error
      }
    }

    log('✅ ESLint check passed', 'green')
    return { passed: true, errors: [], fixed: false }
  } catch (err) {
    // ESLint returns non-zero exit code on errors
    if (err.stdout) {
      try {
        const results = JSON.parse(err.stdout)
        if (results.length > 0) {
          const errors = results[0].messages.map(
            (msg) => `${filePath}:${msg.line}:${msg.column} - ${msg.message} (${msg.ruleId})`
          )
          return {
            passed: false,
            errors,
            fixed: CONFIG.autoFix.eslint && results[0].output !== undefined,
          }
        }
      } catch (parseErr) {
        return {
          passed: false,
          errors: [err.message],
          fixed: false,
        }
      }
    }

    return { passed: true, errors: [], fixed: false }
  }
}

/**
 * Run Prettier check
 */
async function checkPrettier(filePath) {
  if (!CONFIG.checks.prettier) {
    return { passed: true, errors: [], fixed: false }
  }

  log(`Running Prettier check on ${filePath}...`, 'gray')

  try {
    // Check if file needs formatting
    const { stdout } = await execAsync(
      `pnpm prettier --check ${filePath}`,
      { cwd: CONFIG.projectRoot }
    )

    log('✅ Prettier check passed', 'green')
    return { passed: true, errors: [], fixed: false }
  } catch (err) {
    // File needs formatting
    if (CONFIG.autoFix.prettier) {
      try {
        await execAsync(
          `pnpm prettier --write ${filePath}`,
          { cwd: CONFIG.projectRoot }
        )
        log('✅ Prettier auto-fixed formatting', 'yellow')
        return { passed: true, errors: [], fixed: true }
      } catch (fixErr) {
        return {
          passed: false,
          errors: [`Failed to auto-fix formatting: ${fixErr.message}`],
          fixed: false,
        }
      }
    }

    return {
      passed: false,
      errors: [`File needs formatting: ${filePath}`],
      fixed: false,
    }
  }
}

/**
 * Check for common code issues
 */
async function checkCommonPatterns(filePath) {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(CONFIG.projectRoot, filePath)

  const content = fs.readFileSync(fullPath, 'utf8')
  const lines = content.split('\n')
  const warnings = []

  // Check for 'as any' type assertions
  lines.forEach((line, index) => {
    if (line.includes('as any')) {
      warnings.push({
        line: index + 1,
        message: 'Avoid using "as any" - use proper types instead',
        severity: 'warning',
      })
    }
  })

  // Check for console statements (except in test files and dev routes)
  const isTestFile = filePath.includes('.test.') || filePath.includes('.spec.')
  const isDevRoute = filePath.includes('routes/dev.')

  if (!isTestFile && !isDevRoute) {
    lines.forEach((line, index) => {
      if (line.match(/console\.(log|warn|error|info|debug)/)) {
        warnings.push({
          line: index + 1,
          message: 'Console statement found - consider using proper logging',
          severity: 'info',
        })
      }
    })
  }

  // Check for debugger statements
  lines.forEach((line, index) => {
    if (line.includes('debugger')) {
      warnings.push({
        line: index + 1,
        message: 'Debugger statement found - remove before committing',
        severity: 'error',
      })
    }
  })

  // Check for TODO comments
  lines.forEach((line, index) => {
    if (line.match(/\/\/\s*TODO|\/\*\s*TODO/)) {
      warnings.push({
        line: index + 1,
        message: 'TODO comment found',
        severity: 'info',
      })
    }
  })

  return warnings
}

/**
 * Main quality check orchestrator
 */
async function runQualityChecks(filePath) {
  log(`\nRunning quality checks on: ${filePath}`, 'blue')
  log('─'.repeat(60), 'gray')

  const results = {
    typescript: null,
    eslint: null,
    prettier: null,
    patterns: null,
  }

  // Run all checks in parallel
  const [tsResult, eslintResult, prettierResult, patternWarnings] = await Promise.all([
    checkTypeScript(filePath),
    checkESLint(filePath),
    checkPrettier(filePath),
    checkCommonPatterns(filePath),
  ])

  results.typescript = tsResult
  results.eslint = eslintResult
  results.prettier = prettierResult
  results.patterns = patternWarnings

  return results
}

/**
 * Print results summary
 */
function printSummary(results, filePath) {
  let hasErrors = false
  let hasWarnings = false
  let autoFixed = false

  log('\n' + '─'.repeat(60), 'gray')
  log('Quality Check Results', 'blue')
  log('─'.repeat(60), 'gray')

  // TypeScript errors
  if (results.typescript && !results.typescript.passed) {
    hasErrors = true
    log('\n❌ TypeScript Errors:', 'red')
    results.typescript.errors.forEach((err) => log(`  ${err}`, 'red'))
  }

  // ESLint errors
  if (results.eslint && !results.eslint.passed) {
    if (results.eslint.fixed) {
      autoFixed = true
      log('\n✅ ESLint Auto-Fixed:', 'yellow')
      results.eslint.errors.forEach((err) => log(`  ${err}`, 'yellow'))
    } else {
      hasErrors = true
      log('\n❌ ESLint Errors:', 'red')
      results.eslint.errors.forEach((err) => log(`  ${err}`, 'red'))
    }
  }

  // Prettier errors
  if (results.prettier && !results.prettier.passed) {
    if (results.prettier.fixed) {
      autoFixed = true
      log('\n✅ Prettier Auto-Fixed formatting', 'yellow')
    } else {
      hasErrors = true
      log('\n❌ Prettier Errors:', 'red')
      results.prettier.errors.forEach((err) => log(`  ${err}`, 'red'))
    }
  }

  // Pattern warnings
  if (results.patterns && results.patterns.length > 0) {
    const errorPatterns = results.patterns.filter((w) => w.severity === 'error')
    const warnPatterns = results.patterns.filter((w) => w.severity === 'warning')
    const infoPatterns = results.patterns.filter((w) => w.severity === 'info')

    if (errorPatterns.length > 0) {
      hasErrors = true
      log('\n❌ Code Issues:', 'red')
      errorPatterns.forEach((w) => log(`  Line ${w.line}: ${w.message}`, 'red'))
    }

    if (warnPatterns.length > 0) {
      hasWarnings = true
      log('\n⚠️  Warnings:', 'yellow')
      warnPatterns.forEach((w) => log(`  Line ${w.line}: ${w.message}`, 'yellow'))
    }

    if (infoPatterns.length > 0) {
      log('\n💡 Info:', 'blue')
      infoPatterns.forEach((w) => log(`  Line ${w.line}: ${w.message}`, 'gray'))
    }
  }

  log('\n' + '─'.repeat(60), 'gray')

  if (autoFixed && !hasErrors) {
    log('✅ Quality checks passed (some issues auto-fixed)', 'green')
    return 0
  } else if (!hasErrors && !hasWarnings) {
    log('✅ All quality checks passed!', 'green')
    return 0
  } else if (hasErrors) {
    log('❌ Quality checks failed - fix errors before proceeding', 'red')
    return 2
  } else {
    log('⚠️  Quality checks passed with warnings', 'yellow')
    return 0
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Parse input from stdin
    const input = await parseInput()
    const filePath = extractFilePath(input)

    if (!filePath) {
      log('No file path provided in input', 'gray')
      process.exit(0)
    }

    // Check if file should be validated
    if (!shouldValidate(filePath)) {
      process.exit(0)
    }

    // Run quality checks
    const results = await runQualityChecks(filePath)

    // Print summary and exit with appropriate code
    const exitCode = printSummary(results, filePath)
    process.exit(exitCode)
  } catch (err) {
    error(`\n❌ Quality check error: ${err.message}`)
    if (CONFIG.debug) {
      error(err.stack)
    }
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
