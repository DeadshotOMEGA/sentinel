import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const SCREENSHOT_DIR = 'test-results/e2e/frontend/settings-timings'
mkdirSync(SCREENSHOT_DIR, { recursive: true })

function toCompactTime(value: string): string {
  return value.replace(':', '')
}

async function openTimingsTab(page: Page): Promise<void> {
  await page.goto('/settings', { waitUntil: 'domcontentloaded' })
  const tab = page.getByTestId('settings-timings-tab')
  await expect(tab).toBeVisible()

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await tab.click()
    try {
      await expect(page.getByTestId('settings-timings-form')).toBeVisible({ timeout: 5000 })
      return
    } catch {
      await page.waitForTimeout(250)
    }
  }

  await expect(page.getByTestId('settings-timings-form')).toBeVisible()
}

async function getSelectedDutyWatchDays(page: Page): Promise<number[]> {
  const selected: number[] = []
  for (const day of [1, 2, 3, 4, 5, 6, 7]) {
    const checkbox = page.getByTestId(`settings-timings-duty-watch-day-${day}`)
    if (await checkbox.isChecked()) {
      selected.push(day)
    }
  }
  return selected
}

async function setDutyWatchDays(page: Page, desiredDays: number[]): Promise<void> {
  for (const day of [1, 2, 3, 4, 5, 6, 7]) {
    const checkbox = page.getByTestId(`settings-timings-duty-watch-day-${day}`)
    const shouldBeChecked = desiredDays.includes(day)
    const isChecked = await checkbox.isChecked()
    if (shouldBeChecked !== isChecked) {
      await checkbox.click()
    }
  }
}

test.describe('Settings Timings tab', () => {
  test('loads, saves, persists, updates duty-watch UI, and syncs DDS copy', async ({ page }) => {
    test.setTimeout(120_000)

    await openTimingsTab(page)

    const saveButton = page.getByTestId('settings-timings-save-btn')
    await expect(saveButton).toBeDisabled()

    const dutyWatchAlertInput = page.getByTestId('settings-timings-duty-watch-alert-time')
    const regularEndInput = page.getByTestId('settings-timings-regular-end')
    const summerEndInput = page.getByTestId('settings-timings-summer-end')

    const originalDutyWatchAlert = await dutyWatchAlertInput.inputValue()
    const originalRegularEnd = await regularEndInput.inputValue()
    const originalSummerEnd = await summerEndInput.inputValue()
    const originalDutyWatchDays = await getSelectedDutyWatchDays(page)

    const updatedDutyWatchAlert = originalDutyWatchAlert === '19:00' ? '18:45' : '19:00'
    const updatedRegularEnd = originalRegularEnd === '16:00' ? '16:15' : '16:00'
    const updatedSummerEnd = originalSummerEnd === '15:00' ? '14:45' : '15:00'
    const updatedDutyWatchDays = [1, 3, 5]

    try {
      await dutyWatchAlertInput.fill(updatedDutyWatchAlert)
      await regularEndInput.fill(updatedRegularEnd)
      await summerEndInput.fill(updatedSummerEnd)
      await setDutyWatchDays(page, updatedDutyWatchDays)

      await expect(saveButton).toBeEnabled()
      await saveButton.click()
      await expect(saveButton).toBeDisabled()

      await openTimingsTab(page)

      await expect(page.getByTestId('settings-timings-duty-watch-alert-time')).toHaveValue(
        updatedDutyWatchAlert
      )
      await expect(page.getByTestId('settings-timings-regular-end')).toHaveValue(updatedRegularEnd)
      await expect(page.getByTestId('settings-timings-summer-end')).toHaveValue(updatedSummerEnd)

      for (const day of [1, 2, 3, 4, 5, 6, 7]) {
        const checkbox = page.getByTestId(`settings-timings-duty-watch-day-${day}`)
        if (updatedDutyWatchDays.includes(day)) {
          await expect(checkbox).toBeChecked()
        } else {
          await expect(checkbox).not.toBeChecked()
        }
      }

      await page.goto('/schedules', { waitUntil: 'domcontentloaded' })
      await page.waitForURL('**/schedules')
      await page.waitForSelector('h1')
      await expect(
        page.getByText(/Monday,\s*Wednesday,\s*Friday evening watch/i).first()
      ).toBeVisible()

      await page.getByRole('tab', { name: /month/i }).click()
      await expect(page.getByRole('tab', { name: /month/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )

      await page.waitForSelector('table[role=\"grid\"]', { timeout: 30_000 })
      const monthGrid = page.getByRole('grid').first()
      await expect(monthGrid).toBeVisible()

      const monHeader = monthGrid.getByRole('columnheader', { name: /Mon/i })
      const wedHeader = monthGrid.getByRole('columnheader', { name: /Wed/i })
      const friHeader = monthGrid.getByRole('columnheader', { name: /Fri/i })
      const tueHeader = monthGrid.getByRole('columnheader', { name: /Tue/i })
      const thuHeader = monthGrid.getByRole('columnheader', { name: /Thu/i })

      await expect(monHeader.getByText('(DW)')).toBeVisible()
      await expect(wedHeader.getByText('(DW)')).toBeVisible()
      await expect(friHeader.getByText('(DW)')).toBeVisible()
      await expect(tueHeader.getByText('(DW)')).toHaveCount(0)
      await expect(thuHeader.getByText('(DW)')).toHaveCount(0)

      const mondayDutyWatchBadge = page
        .locator('button[aria-label^="Duty Watch Mon:"]:not([disabled])')
        .first()
      await expect(mondayDutyWatchBadge).toBeVisible()
      await mondayDutyWatchBadge.click()

      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Monday' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Wednesday' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Friday' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Tuesday' })).toHaveCount(0)
      await expect(page.getByRole('tab', { name: 'Thursday' })).toHaveCount(0)

      await page.goto('/dds', { waitUntil: 'domcontentloaded' })

      const compactDutyWatch = toCompactTime(updatedDutyWatchAlert)
      const compactRegularEnd = toCompactTime(updatedRegularEnd)
      const compactSummerEnd = toCompactTime(updatedSummerEnd)

      await expect(
        page.getByText(new RegExp(`Duty Watch starts at\\s+${compactDutyWatch}`, 'i'))
      ).toBeVisible()
      await expect(
        page.getByText(
          new RegExp(
            `\\(${compactRegularEnd} standard / ${compactSummerEnd} modified summer hours\\)`,
            'i'
          )
        )
      ).toBeVisible()

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/timings-updated-and-synced.png`,
        fullPage: true,
      })
    } finally {
      if (!page.isClosed()) {
        await openTimingsTab(page)
        await page.getByTestId('settings-timings-duty-watch-alert-time').fill(originalDutyWatchAlert)
        await page.getByTestId('settings-timings-regular-end').fill(originalRegularEnd)
        await page.getByTestId('settings-timings-summer-end').fill(originalSummerEnd)
        await setDutyWatchDays(page, originalDutyWatchDays)

        const restoreSaveButton = page.getByTestId('settings-timings-save-btn')
        if (await restoreSaveButton.isEnabled()) {
          await restoreSaveButton.click()
          await expect(restoreSaveButton).toBeDisabled()
        }
      }
    }
  })
})
