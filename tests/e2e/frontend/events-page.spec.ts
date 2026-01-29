import { test, expect } from '@playwright/test'

test.describe('Events Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events', { waitUntil: 'domcontentloaded' })
    // Wait for the page to hydrate
    await page.waitForSelector('h1')
  })

  test('shows page header with title and Create Event button', async ({ page }) => {
    // Page header
    await expect(page.getByRole('heading', { name: /unit events/i, level: 1 })).toBeVisible()

    // Description text
    await expect(
      page.getByText(/manage training exercises, ceremonies, and operational events/i)
    ).toBeVisible()

    // Create Event button (aria-label is "Create new event")
    await expect(page.getByRole('button', { name: /create new event/i })).toBeVisible()

    await page.screenshot({ path: 'test-results/events-page-default.png', fullPage: true })
  })

  test('shows event filters', async ({ page }) => {
    // Filter section
    const filterSection = page.getByRole('search', { name: /event filters/i })
    await expect(filterSection).toBeVisible()

    // Category dropdown (combobox)
    await expect(filterSection.getByRole('combobox', { name: /category/i })).toBeVisible()

    // Status dropdown (combobox)
    await expect(filterSection.getByRole('combobox', { name: /status/i })).toBeVisible()

    // Date inputs
    await expect(filterSection.getByRole('textbox', { name: /start date/i })).toBeVisible()
    await expect(filterSection.getByRole('textbox', { name: /end date/i })).toBeVisible()

    // Clear filters button
    await expect(page.getByRole('button', { name: /clear filters/i })).toBeVisible()
  })

  test('shows event table with correct columns', async ({ page }) => {
    // Table should exist (even if empty)
    const table = page.getByRole('table')

    // If table visible, check headers
    if (await table.isVisible()) {
      await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /title/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /type/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /duty watch/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /actions/i })).toBeVisible()
    } else {
      // Empty state
      await expect(page.getByText(/no events found/i)).toBeVisible()
    }

    await page.screenshot({ path: 'test-results/events-table.png', fullPage: true })
  })

  test('Create Event modal opens and has required fields', async ({ page }) => {
    // Click Create Event button
    await page.getByRole('button', { name: /create new event/i }).click()

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: /create event/i })).toBeVisible()

    // Required fields
    await expect(page.getByLabel(/title/i)).toBeVisible()

    // Event type selector
    await expect(page.getByText('Event Type', { exact: true })).toBeVisible()

    // Collapsible sections
    await expect(page.getByText(/location & details/i)).toBeVisible()
    await expect(page.getByText(/duty watch/i).first()).toBeVisible()
    await expect(page.getByText(/additional information/i)).toBeVisible()

    // Action buttons
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()

    await page.screenshot({ path: 'test-results/events-create-modal.png', fullPage: true })
  })

  test('Create Event modal closes on Cancel', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create new event/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Click Cancel
    await page.getByRole('button', { name: /cancel/i }).click()

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
