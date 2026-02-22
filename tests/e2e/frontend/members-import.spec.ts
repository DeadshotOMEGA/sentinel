import { test, expect } from '@playwright/test'
import path from 'node:path'
import { mkdirSync } from 'node:fs'

const SCREENSHOT_DIR = 'test-results/e2e/frontend/members-import'
mkdirSync(SCREENSHOT_DIR, { recursive: true })

const FIXTURE_DIR = path.resolve(process.cwd(), 'tests/fixtures/import')

test.describe('Members Import CSV', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/members', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: /members/i, level: 1 }).waitFor({ state: 'visible' })
  })

  test('opens import dialog and loads CSV file', async ({ page }) => {
    await page.getByRole('button', { name: /import csv/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /import nominal roll/i })).toBeVisible()

    await dialog.locator('input[type="file"]#csv-file').setInputFiles(
      path.join(FIXTURE_DIR, 'nominal-roll.valid-small.csv')
    )

    await expect(dialog.getByText(/file loaded/i)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/step1-upload.png`, fullPage: true })
  })

  test('shows row validation errors for invalid CSV', async ({ page }) => {
    await page.getByRole('button', { name: /import csv/i }).click()

    const dialog = page.getByRole('dialog')
    await dialog.locator('input[type="file"]#csv-file').setInputFiles(
      path.join(FIXTURE_DIR, 'nominal-roll.invalid-missing-sn.csv')
    )

    await dialog.getByRole('button', { name: /^next$/i }).click()

    await expect(dialog.getByText(/errors:/i)).toBeVisible()
    await expect(dialog.getByText(/service number is required/i)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/step2-invalid-errors.png`, fullPage: true })
  })

  test('executes import with small valid CSV and shows completion', async ({ page }) => {
    await page.getByRole('button', { name: /import csv/i }).click()

    const dialog = page.getByRole('dialog')
    await dialog.locator('input[type="file"]#csv-file').setInputFiles(
      path.join(FIXTURE_DIR, 'nominal-roll.valid-small.csv')
    )

    await dialog.getByRole('button', { name: /^next$/i }).click()

    await expect(dialog.getByText(/step 2 of 3/i)).toBeVisible()

    const executeButton = dialog.getByRole('button', { name: /execute import/i })

    if (!(await executeButton.isEnabled())) {
      const excludeRowCheckboxes = dialog.locator('input[title=\"Exclude this row from import\"]')
      const excludeCount = await excludeRowCheckboxes.count()
      for (let i = 0; i < excludeCount; i++) {
        const checkbox = excludeRowCheckboxes.nth(i)
        if (!(await checkbox.isChecked())) {
          await checkbox.check()
        }
      }
    }

    await expect(executeButton).toBeEnabled()
    await executeButton.click()

    await expect(dialog.getByRole('heading', { name: /import complete/i })).toBeVisible()
    await expect(dialog.getByText(/added/i).first()).toBeVisible()
    await expect(dialog.getByText(/updated/i).first()).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/step3-complete.png`, fullPage: true })
  })
})
