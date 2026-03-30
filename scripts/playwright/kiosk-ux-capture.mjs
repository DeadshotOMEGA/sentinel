#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const [cycle, stage] = process.argv.slice(2)

if (!cycle || !stage) {
  console.error('Usage: node scripts/playwright/kiosk-ux-capture.mjs <cycle-XX> <pre|post>')
  process.exit(1)
}

const repoRoot = '/home/sauk/projects/sentinel'
const baseUrl = process.env.KIOSK_BASE_URL ?? 'http://localhost:3001'
const apiUrl = process.env.KIOSK_API_URL ?? 'http://localhost:3000'
const session = `kiosk-${cycle}-${stage}`
const outputDir = path.join(repoRoot, 'test-results', 'kiosk-ux-review', cycle, stage)
const authStatePath = path.join(repoRoot, 'test-results', 'kiosk-ux-review', 'auth-state.json')

mkdirSync(outputDir, { recursive: true })

const viewports = [
  { label: 'desktop', width: 1920, height: 1080 },
  { label: 'narrow', width: 1024, height: 768 },
]

function run(commandArgs, options = {}) {
  return execFileSync('playwright-cli', ['-s', session, ...commandArgs], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  })
}

function logStep(message) {
  process.stdout.write(`${message}\n`)
}

function runCode(code) {
  return run(['run-code', code])
}

function screenshot(filename) {
  run(['screenshot', '--filename', filename])
}

function snapshot(filename) {
  run(['snapshot', '--filename', filename])
}

function resize(width, height) {
  run(['resize', String(width), String(height)])
}

function goto(url) {
  run(['goto', url])
}

function closeSession() {
  try {
    run(['close'])
  } catch {
    // Ignore close errors when session does not exist.
  }
}

async function requestJson(url, init, attempts = 3) {
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init)
      if (!response.ok) {
        throw new Error(`Request failed ${response.status} ${response.statusText}: ${url}`)
      }
      return response.json()
    } catch (error) {
      lastError = error
      await new Promise(resolve => setTimeout(resolve, 250 * attempt))
    }
  }

  throw lastError
}

function escapeForTemplateLiteral(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('`', '\\`')
}

async function bootstrapAuth() {
  closeSession()
  run(['open', `${baseUrl}/login`])

  const loginCode = `
    async page => {
      await page.goto('${baseUrl}/login', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('auth-badge-input').fill('CLAUDE-E2E-BADGE');
      await page.getByTestId('auth-badge-input').press('Enter');
      await page.getByTestId('auth-pin-input').fill('9999');
      await page.waitForURL('**/dashboard', { timeout: 30000 });
      return page.url();
    }
  `

  runCode(loginCode)
  run(['state-save', authStatePath])
}

async function resetOperationalState(buildingStatus) {
  await requestJson(`${apiUrl}/api/dev/checkins/clear-all`, {
    method: 'DELETE',
  })

  await requestJson(`${apiUrl}/api/dev/building-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buildingStatus }),
  })
}

async function getValidMemberBadgeSerial() {
  const membersBody = await requestJson(`${apiUrl}/api/dev/members`)
  const member = membersBody.members.find(
    candidate => candidate.badgeSerialNumber && !candidate.isPresent
  )

  if (!member?.badgeSerialNumber) {
    throw new Error('No available member badge serial found for kiosk capture.')
  }

  return member.badgeSerialNumber
}

async function getDdsMemberBadgeSerial() {
  const [eligibleBody, membersBody] = await Promise.all([
    requestJson(`${apiUrl}/api/qualifications/lockup-eligible`),
    requestJson(`${apiUrl}/api/dev/members`),
  ])

  const eligible = eligibleBody.data.find(member =>
    member.qualifications.some(qualification => qualification.code === 'DDS')
  )

  const devMember = membersBody.members.find(member => member.id === eligible?.id)
  if (!devMember?.badgeSerialNumber) {
    throw new Error('No DDS-qualified badge serial found for kiosk capture.')
  }

  return devMember.badgeSerialNumber
}

function waitForKioskReadyCode() {
  return `
    async page => {
      await page.goto('${baseUrl}/kiosk', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('kiosk-badge-input').waitFor({ state: 'visible', timeout: 30000 });
      await page.waitForTimeout(400);
    }
  `
}

function invalidScanCode() {
  return `
    async page => {
      await page.getByTestId('kiosk-badge-input').fill('NOT-A-REAL-BADGE');
      await page.getByTestId('kiosk-scan-submit').click();
      await page.getByText(/scan not accepted/i).waitFor({ state: 'visible', timeout: 30000 });
      await page.waitForTimeout(300);
    }
  `
}

function successScanCode(serial) {
  const escapedSerial = escapeForTemplateLiteral(serial)
  return `
    async page => {
      await page.getByTestId('kiosk-badge-input').fill(\`${escapedSerial}\`);
      await page.getByTestId('kiosk-scan-submit').click();
      await page.getByText(/welcome to the unit|safe travels/i).waitFor({
        state: 'visible',
        timeout: 30000,
      });
      await page.waitForTimeout(300);
    }
  `
}

function responsibilityScanCode(serial) {
  const escapedSerial = escapeForTemplateLiteral(serial)
  return `
    async page => {
      await page.getByTestId('kiosk-badge-input').fill(\`${escapedSerial}\`);
      await page.getByTestId('kiosk-scan-submit').click();
      await page.getByTestId('kiosk-responsibility-prompt').waitFor({
        state: 'visible',
        timeout: 30000,
      });
      await page.waitForTimeout(300);
    }
  `
}

function visitorModalCode() {
  return `
    async page => {
      await page.getByRole('button', { name: /visitor sign-in/i }).click();
      await page.getByText(/follow the steps below to check into the unit/i).waitFor({
        state: 'visible',
        timeout: 30000,
      });
      await page.getByRole('button', {
        name: /guest family, friends, and general visitors to the unit/i,
      }).click();
      await page.getByRole('button', { name: /^continue$/i }).click();
      await page.getByRole('textbox', { name: /first name/i }).click();
      await page.getByText(/tap one of the text fields above to open the keyboard/i).waitFor({
        state: 'hidden',
        timeout: 30000,
      });
      await page.waitForTimeout(300);
    }
  `
}

async function captureState(viewport, stateName, scenarioCode, setup) {
  if (setup) {
    await setup()
  }

  resize(viewport.width, viewport.height)
  runCode(waitForKioskReadyCode())

  if (scenarioCode) {
    runCode(scenarioCode)
  }

  const baseFilename = path.join(
    'test-results',
    'kiosk-ux-review',
    cycle,
    stage,
    `${viewport.label}-${stateName}`
  )

  snapshot(`${baseFilename}.yml`)
  screenshot(`${baseFilename}.png`)
}

async function main() {
  await bootstrapAuth()

  const successSerial = await getValidMemberBadgeSerial()
  const ddsSerial = await getDdsMemberBadgeSerial()

  for (const viewport of viewports) {
    logStep(`Capturing ${cycle} ${stage} at ${viewport.label}...`)

    await captureState(viewport, 'idle', null, async () => {
      await resetOperationalState('open')
    })

    await captureState(viewport, 'invalid', invalidScanCode(), async () => {
      await resetOperationalState('open')
    })

    await captureState(viewport, 'success', successScanCode(successSerial), async () => {
      await resetOperationalState('open')
    })

    await captureState(viewport, 'responsibility', responsibilityScanCode(ddsSerial), async () => {
      await resetOperationalState('secured')
    })

    await captureState(viewport, 'visitor', visitorModalCode(), async () => {
      await resetOperationalState('open')
    })
  }

  closeSession()
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  closeSession()
  process.exit(1)
})
