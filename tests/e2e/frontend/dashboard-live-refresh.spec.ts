import type { APIResponse } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function assertOk(response: APIResponse, label: string) {
  if (response.ok()) {
    return
  }

  throw new Error(`${label} failed (${response.status()}): ${await response.text()}`)
}

test.describe('Dashboard live refresh', () => {
  test('shows and clears security alerts without a manual refresh', async ({ page, request }) => {
    const message = `Playwright live refresh alert ${Date.now()}`

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    await assertOk(
      await request.post('/api/security-alerts', {
        data: {
          alertType: 'system',
          severity: 'warning',
          badgeSerial: null,
          kioskId: 'playwright-dashboard-live-refresh',
          message,
        },
      }),
      'create security alert'
    )

    const alert = page.locator('[role="alert"]').filter({ hasText: message })

    await expect(alert).toBeVisible()
    await alert.getByRole('button', { name: /acknowledge/i }).click()

    const dialog = page
      .locator('[data-slot="dialog-content"]')
      .filter({ hasText: 'Acknowledge Alert' })
      .last()

    await dialog.getByLabel(/note/i).fill('Playwright acknowledgement')
    await dialog.getByRole('button', { name: /^acknowledge$/i }).click()

    await expect(alert).toHaveCount(0)
  })
})
