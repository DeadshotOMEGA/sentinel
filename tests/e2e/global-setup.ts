import { chromium, type FullConfig } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_BASE_URL = 'http://localhost:3001'
const DEFAULT_BADGE_SERIAL = 'CLAUDE-E2E-BADGE'
const DEFAULT_PIN = '9999'

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL?.toString() ?? DEFAULT_BASE_URL
  const badgeSerial = process.env.E2E_BADGE_SERIAL ?? DEFAULT_BADGE_SERIAL
  const pin = process.env.E2E_PIN ?? DEFAULT_PIN
  const authStatePath = path.resolve(__dirname, '.auth/member.json')

  await fs.mkdir(path.dirname(authStatePath), { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
    const badgeInputByTestId = page.getByTestId('auth-badge-input')
    if ((await badgeInputByTestId.count()) > 0) {
      await badgeInputByTestId.click()
    } else {
      await page.getByRole('textbox', { name: /badge number/i }).click()
    }
    await page.keyboard.type(badgeSerial)
    await page.keyboard.press('Enter')

    const pinInputByTestId = page.getByTestId('auth-pin-input')
    if ((await pinInputByTestId.count()) > 0) {
      await pinInputByTestId.click()
    } else {
      await page.getByRole('textbox', { name: /pin/i }).click()
    }
    await page.keyboard.type(pin)
    await page.keyboard.press('Enter')

    await page.waitForURL('**/dashboard', { timeout: 30_000 })
    await page.context().storageState({ path: authStatePath })
  } finally {
    await browser.close()
  }
}
