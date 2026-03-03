import type { APIRequestContext, APIResponse } from '@playwright/test'
import { expect, test } from '@playwright/test'

interface LockupEligibleMember {
  id: string
  firstName: string
  lastName: string
  rank: string
  serviceNumber: string
}

async function assertOk(response: APIResponse, label: string) {
  if (response.ok()) {
    return
  }

  throw new Error(`${label} failed (${response.status()}): ${await response.text()}`)
}

async function resetDashboardState(request: APIRequestContext) {
  await assertOk(await request.delete('/api/dev/checkins/clear-all'), 'clear checkins')
  await assertOk(
    await request.post('/api/dev/building-status', {
      data: { buildingStatus: 'secured' },
    }),
    'set building secured'
  )
}

async function getLockupEligibleMember(request: APIRequestContext): Promise<LockupEligibleMember> {
  const response = await request.get('/api/qualifications/lockup-eligible')
  await assertOk(response, 'get lockup eligible members')

  const body = (await response.json()) as { data: LockupEligibleMember[] }
  const member = body.data[0]

  if (!member) {
    throw new Error('No lockup-eligible member was available for the dashboard live-refresh test')
  }

  return member
}

async function ensureTodayDds(request: APIRequestContext, memberId: string) {
  const currentResponse = await request.get('/api/dds/current')
  await assertOk(currentResponse, 'get current DDS')

  const current = (await currentResponse.json()) as {
    assignment: { memberId: string } | null
  }

  if (current.assignment && current.assignment.memberId !== memberId) {
    await assertOk(
      await request.post('/api/dds/release', {
        data: { notes: 'Playwright reset' },
      }),
      'release current DDS'
    )
  }

  if (!current.assignment || current.assignment.memberId !== memberId) {
    await assertOk(
      await request.post('/api/dds/assign', {
        data: { memberId, notes: 'Playwright dashboard live-refresh test' },
      }),
      'assign DDS'
    )
  }
}

test.describe('Dashboard live refresh', () => {
  test('updates the dashboard and open-building modal when DDS auto-opens the building', async ({
    page,
    request,
  }) => {
    await resetDashboardState(request)
    const member = await getLockupEligibleMember(request)
    await ensureTodayDds(request, member.id)

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /open building/i })).toBeVisible()

    await page.getByRole('button', { name: /open building/i }).click()
    await expect(page.getByText(/select who is opening the building/i)).toBeVisible()
    await expect(
      page.getByText(/no eligible members checked in with lockup qualification/i)
    ).toBeVisible()

    await assertOk(
      await request.post('/api/checkins', {
        data: {
          memberId: member.id,
          direction: 'in',
          kioskId: 'playwright-dashboard-live-refresh',
          method: 'badge',
        },
      }),
      'create DDS checkin'
    )

    await expect(page.getByText(/the building is already open/i)).toBeVisible()
    await expect(
      page.getByText(
        `Current lockup holder: ${member.rank} ${member.firstName} ${member.lastName}`
      )
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /confirm open/i })).toBeDisabled()

    await page.getByRole('button', { name: /cancel/i }).click()

    await expect(page.getByRole('button', { name: /open building/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /execute lockup/i })).toBeVisible()
    await expect(page.locator('[data-help-id="dashboard.stat.building"]')).toContainText('Open')
    await expect(page.locator('[data-help-id="dashboard.stat.lockup-holder"]')).toContainText(
      `${member.rank} ${member.lastName} ${member.firstName.charAt(0)}`
    )
  })

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
