import { test, expect } from '@playwright/test'

test.describe('Simulate Scan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h1')
  })

  test('shows Simulate Scan button on dashboard', async ({ page }) => {
    const button = page.getByRole('button', { name: /simulate scan/i })
    await expect(button).toBeVisible()
    await page.screenshot({ path: 'test-results/simulate-scan-button.png', fullPage: true })
  })

  test('opens modal with member list', async ({ page }) => {
    await page.getByRole('button', { name: /simulate scan/i }).click()

    // Wait for dialog to open
    const dialog = page.locator('dialog.modal[open]')
    await expect(dialog).toBeVisible()

    // Should show header
    await expect(dialog.getByText(/simulate badge scan/i)).toBeVisible()

    // Should show search input
    await expect(dialog.getByPlaceholder(/search/i)).toBeVisible()

    // Wait for members to load (loading spinner should disappear)
    await dialog.locator('.animate-spin').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // spinner may have already gone
    })

    await page.screenshot({ path: 'test-results/simulate-scan-modal.png', fullPage: true })
  })

  test('simulates check-in for an OUT member', async ({ page }) => {
    await page.getByRole('button', { name: /simulate scan/i }).click()

    const dialog = page.locator('dialog.modal[open]')
    await expect(dialog).toBeVisible()

    // Wait for members to load
    await page.waitForTimeout(2000)

    // Find a member with an OUT badge and click them
    const outMember = dialog.locator('button:has(.badge-ghost):not([disabled])').first()
    const memberExists = await outMember.count() > 0

    if (memberExists) {
      await outMember.click()
      // Wait for scan result
      await page.waitForTimeout(1500)
      await page.screenshot({ path: 'test-results/simulate-scan-checkin.png', fullPage: true })
    }
  })

  test('simulates check-out for an IN member', async ({ page }) => {
    await page.getByRole('button', { name: /simulate scan/i }).click()

    const dialog = page.locator('dialog.modal[open]')
    await expect(dialog).toBeVisible()

    // Wait for members to load
    await page.waitForTimeout(2000)

    // Find a member with an IN badge and click them
    const inMember = dialog.locator('button:has(.badge-success):not([disabled])').first()
    const memberExists = await inMember.count() > 0

    if (memberExists) {
      await inMember.click()
      // Wait for scan result
      await page.waitForTimeout(1500)
      await page.screenshot({ path: 'test-results/simulate-scan-checkout.png', fullPage: true })
    }
  })
})
