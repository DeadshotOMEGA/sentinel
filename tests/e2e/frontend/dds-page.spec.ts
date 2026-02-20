import { test, expect } from '@playwright/test'

test.describe('DDS Operations Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dds', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h1, h2, h3')
  })

  test('renders responsibilities and checklist sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dds operations/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /responsibilities/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /daily checklist/i })).toBeVisible()

    await page.screenshot({ path: 'test-results/dds-page-default.png', fullPage: true })
  })

  test('task checkoff persists after reload', async ({ page }) => {
    const firstTask = page.getByTestId('dds-task-0730-0')
    await expect(firstTask).toBeVisible()
    await firstTask.check()
    await expect(firstTask).toBeChecked()

    await page.reload({ waitUntil: 'domcontentloaded' })
    const firstTaskAfterReload = page.getByTestId('dds-task-0730-0')
    await expect(firstTaskAfterReload).toBeChecked()
  })

  test('navigation shows DDS link and active state', async ({ page }) => {
    const ddsNavLink = page.getByTestId('nav-link-dds')
    await expect(ddsNavLink).toBeVisible()
    await expect(ddsNavLink).toHaveClass(/active/)
  })
})
