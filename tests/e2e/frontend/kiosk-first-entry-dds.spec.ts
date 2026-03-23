import type { APIRequestContext, APIResponse, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

interface DevMember {
  id: string
  firstName: string
  lastName: string
  rank: string
  badgeSerialNumber: string | null
  isPresent: boolean
}

interface LockupEligibleMember {
  id: string
  firstName: string
  lastName: string
  rank: string
  serviceNumber: string
  qualifications: Array<{ code: string; name: string }>
}

async function assertOk(response: APIResponse, label: string) {
  if (response.ok()) {
    return
  }

  throw new Error(`${label} failed (${response.status()}): ${await response.text()}`)
}

async function resetOperationalState(request: APIRequestContext) {
  await assertOk(await request.delete('/api/dev/checkins/clear-all'), 'clear checkins')
  await assertOk(
    await request.post('/api/dev/building-status', {
      data: { buildingStatus: 'secured' },
    }),
    'set building secured'
  )
}

async function getPresentDdsCandidate(request: APIRequestContext): Promise<{
  id: string
  firstName: string
  lastName: string
  rank: string
  badgeSerialNumber: string
}> {
  const [eligibleResponse, membersResponse] = await Promise.all([
    request.get('/api/qualifications/lockup-eligible'),
    request.get('/api/dev/members'),
  ])

  await assertOk(eligibleResponse, 'get lockup eligible members')
  await assertOk(membersResponse, 'get dev members')

  const eligibleBody = (await eligibleResponse.json()) as { data: LockupEligibleMember[] }
  const membersBody = (await membersResponse.json()) as { members: DevMember[] }

  const eligible = eligibleBody.data.find((member) =>
    member.qualifications.some((qualification) => qualification.code === 'DDS')
  )

  if (!eligible) {
    throw new Error('No DDS-qualified member was available for the kiosk DDS test')
  }

  const devMember = membersBody.members.find((member) => member.id === eligible.id)
  if (!devMember?.badgeSerialNumber) {
    throw new Error('DDS-qualified member did not have a badge serial for kiosk testing')
  }

  return {
    id: eligible.id,
    firstName: eligible.firstName,
    lastName: eligible.lastName,
    rank: eligible.rank,
    badgeSerialNumber: devMember.badgeSerialNumber,
  }
}

async function scanBadge(page: Page, serial: string) {
  await page.getByPlaceholder(/scan or enter badge serial/i).fill(serial)
  await page.getByRole('button', { name: /scan badge/i }).click()
}

test.describe('Kiosk first-entry DDS flow', () => {
  test('prompts the first member and lets the dashboard assign DDS later without another scan', async ({
    browser,
    request,
  }) => {
    await resetOperationalState(request)
    const member = await getPresentDdsCandidate(request)

    const context = await browser.newContext()
    const kioskPage = await context.newPage()
    const dashboardPage = await context.newPage()

    await kioskPage.goto('/kiosk', { waitUntil: 'domcontentloaded' })
    await scanBadge(kioskPage, member.badgeSerialNumber)

    await expect(kioskPage.getByText(/you are the first member checked in today/i)).toBeVisible()
    await expect(kioskPage.getByRole('button', { name: /accept responsibility/i })).toBeVisible()
    await kioskPage.getByRole('button', { name: /not me/i }).click()

    await expect(
      kioskPage.getByText(/building still secured and DDS still unclaimed/i)
    ).toBeVisible()

    await dashboardPage.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await dashboardPage.getByRole('button', { name: /set today's dds/i }).click()
    await expect(dashboardPage.getByText(/assign or replace the live DDS for today/i)).toBeVisible()

    await dashboardPage.getByRole('button', {
      name: new RegExp(`${member.rank} ${member.firstName} ${member.lastName}`, 'i'),
    }).click()
    await dashboardPage.getByRole('button', { name: /assign today's dds/i }).click()

    await expect(dashboardPage.locator('[data-help-id="dashboard.stat.dds"]')).toContainText(
      `${member.rank} ${member.lastName} ${member.firstName.charAt(0)}`
    )
    await expect(
      dashboardPage.locator('[data-help-id="dashboard.stat.lockup-holder"]')
    ).toContainText(`${member.rank} ${member.lastName} ${member.firstName.charAt(0)}`)

    await kioskPage.bringToFront()
    await expect(
      kioskPage.getByText(/building still secured and DDS still unclaimed/i)
    ).toHaveCount(0)
    await expect(kioskPage.getByTestId('kiosk-responsibility-prompt')).toHaveCount(0)

    await context.close()
  })
})
