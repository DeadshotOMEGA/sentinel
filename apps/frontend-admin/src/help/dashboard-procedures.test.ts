import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { dashboardProcedureDefinitions } from './dashboard-procedures'
import { getHelpContext } from './help-registry'

const ORIENTATION_ID = 'dashboard.admin.orientation.v3'
const ORIENTATION_VERSION = 3
const STATUS_ID = 'dashboard.admin.status.v3'
const STATUS_VERSION = 3
const DAILY_START_ID = 'dashboard.admin.daily-start.v2'
const DAILY_START_VERSION = 2
const NORMAL_END_DAY_LOCKUP_ID = 'dashboard.admin.normal-end-day-lockup.v1'
const DDS_LOCKUP_HANDOFF_ID = 'dashboard.admin.dds-lockup-handoff.v1'
const DUTY_WATCH_LOCKUP_ID = 'dashboard.admin.duty-watch-lockup.v1'
const PRESENCE_ID = 'dashboard.admin.presence.v2'
const PRESENCE_VERSION = 2
const PRESENCE_TITLE = 'Member Actions'
const DDS_TRANSFER_ID = 'dashboard.admin.dds-transfer.v1'
const DDS_TRANSFER_TITLE = 'DDS Weekly Handover'
const DAILY_START_STEP_IDS = [
  'alerts',
  'system-health',
  'dds-checklist',
  'dds',
  'dds-responsibility',
  'duty-watch',
  'building',
  'lockup-holder',
  'scanner-bar',
  'escalation',
] as const
const NORMAL_END_DAY_LOCKUP_STEP_IDS = [
  'review-person-cards',
  'manual-sign-out-choice',
  'dds-checklist',
  'execute-lockup',
] as const
const DDS_LOCKUP_HANDOFF_STEP_IDS = [
  'confirm-dds',
  'confirm-evening-holder-present',
  'transfer-lockup',
  'confirm-lockup-holder',
  'swk-transfer-reminder',
] as const
const DUTY_WATCH_LOCKUP_STEP_IDS = [
  'confirm-duty-watch',
  'review-person-cards',
  'manual-sign-out-choice',
  'confirm-lockup-holder',
  'execute-lockup',
  'secured-recheck',
] as const
const PRESENCE_STEP_IDS = [
  'open-member-actions',
  'manual-checkout',
  'temporary-role',
  'tonight-override',
  'transfer-lockup',
  'recent-history',
] as const
const DDS_TRANSFER_STEP_IDS = [
  'confirm-current-dds',
  'open-transfer-dds',
  'handover-confirmation',
  'handover-pending',
  'accept-or-complete-handover',
  'confirm-new-dds',
] as const
const DASHBOARD_ALERT_TUTORIAL_STEPS = [
  { procedureId: ORIENTATION_ID, stepId: 'alerts-first' },
  { procedureId: DAILY_START_ID, stepId: 'alerts' },
] as const
const DASHBOARD_HELP_ID_SOURCE_FILES = [
  'src/app/dashboard/page.tsx',
  'src/components/dashboard/dashboard-page-shell.tsx',
  'src/components/dashboard/dashboard-scan-panel.tsx',
  'src/components/dashboard/member-action-panel.tsx',
  'src/components/dashboard/person-card-grid.tsx',
  'src/components/dashboard/person-card.tsx',
  'src/components/dashboard/security-alerts-bar.tsx',
  'src/components/dashboard/status-stats.tsx',
  'src/components/layout/app-navbar.tsx',
  'src/components/layout/app-sidebar.tsx',
]

function readSourceFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

function collectDashboardHelpIds(): Set<string> {
  const helpIds = new Set<string>()
  const helpIdPattern = /(?:data-help-id|helpId)="([^"]+)"/g

  for (const relativePath of DASHBOARD_HELP_ID_SOURCE_FILES) {
    const source = readSourceFile(relativePath)

    for (const match of source.matchAll(helpIdPattern)) {
      helpIds.add(match[1])
    }
  }

  return helpIds
}

function extractHelpIdsFromSelector(selector: string): string[] {
  return Array.from(selector.matchAll(/\[data-help-id="([^"]+)"\]/g), (match) => match[1])
}

describe('dashboardProcedureDefinitions help metadata', () => {
  it('contains wiki slugs for all steps', () => {
    for (const definition of dashboardProcedureDefinitions) {
      for (const step of definition.steps) {
        expect(step.help?.wikiSlug, `${definition.id}:${step.id}`).toBeTruthy()
      }
    }
  })

  it('registers dashboard orientation v3 as the current dashboard tour', () => {
    const orientation = dashboardProcedureDefinitions.find(
      (definition) => definition.id === ORIENTATION_ID
    )

    expect(orientation?.version).toBe(ORIENTATION_VERSION)
    expect(getHelpContext('dashboard', 5)?.tourId).toBe(ORIENTATION_ID)
  })

  it('registers dashboard status v3 as the current status tutorial', () => {
    const status = dashboardProcedureDefinitions.find((definition) => definition.id === STATUS_ID)

    expect(status?.version).toBe(STATUS_VERSION)
  })

  it('registers daily start v2 as the current daily start tutorial', () => {
    const dailyStart = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DAILY_START_ID
    )

    expect(dailyStart?.version).toBe(DAILY_START_VERSION)
  })

  it('registers the current end-of-day workflow tutorials', () => {
    const normalEndDayLockup = dashboardProcedureDefinitions.find(
      (definition) => definition.id === NORMAL_END_DAY_LOCKUP_ID
    )
    const ddsLockupHandoff = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DDS_LOCKUP_HANDOFF_ID
    )
    const dutyWatchLockup = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DUTY_WATCH_LOCKUP_ID
    )

    expect(normalEndDayLockup?.version).toBe(1)
    expect(ddsLockupHandoff?.version).toBe(1)
    expect(dutyWatchLockup?.version).toBe(1)
  })

  it('registers presence review v2 as the current person-card actions tutorial', () => {
    const presence = dashboardProcedureDefinitions.find(
      (definition) => definition.id === PRESENCE_ID
    )

    expect(presence?.version).toBe(PRESENCE_VERSION)
    expect(presence?.title).toBe(PRESENCE_TITLE)
  })

  it('registers DDS transfer as a focused responsibility handoff tutorial', () => {
    const ddsTransfer = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DDS_TRANSFER_ID
    )

    expect(ddsTransfer?.version).toBe(1)
    expect(ddsTransfer?.title).toBe(DDS_TRANSFER_TITLE)
  })

  it('lists dashboard orientation v3 in the Dashboard guided tutorials launcher', () => {
    const dashboardHelpLauncherSource = readSourceFile(
      'src/components/help/dashboard-help-launcher.tsx'
    )

    expect(dashboardHelpLauncherSource).toContain(ORIENTATION_ID)
  })

  it('lists dashboard status v3 in the Dashboard guided tutorials launcher', () => {
    const dashboardHelpLauncherSource = readSourceFile(
      'src/components/help/dashboard-help-launcher.tsx'
    )

    expect(dashboardHelpLauncherSource).toContain(STATUS_ID)
    expect(dashboardHelpLauncherSource).not.toContain('dashboard.admin.status.v2')
  })

  it('lists daily start v2 in the Dashboard guided tutorials launcher', () => {
    const dashboardHelpLauncherSource = readSourceFile(
      'src/components/help/dashboard-help-launcher.tsx'
    )

    expect(dashboardHelpLauncherSource).toContain(DAILY_START_ID)
    expect(dashboardHelpLauncherSource).not.toContain('dashboard.admin.daily-start.v1')
  })

  it('lists the end-of-day workflow tutorials in the Dashboard guided tutorials launcher', () => {
    const dashboardHelpLauncherSource = readSourceFile(
      'src/components/help/dashboard-help-launcher.tsx'
    )

    expect(dashboardHelpLauncherSource).toContain(NORMAL_END_DAY_LOCKUP_ID)
    expect(dashboardHelpLauncherSource).toContain(DDS_LOCKUP_HANDOFF_ID)
    expect(dashboardHelpLauncherSource).toContain(DUTY_WATCH_LOCKUP_ID)
    expect(dashboardHelpLauncherSource).not.toContain('dashboard.admin.daily-end.v1')
    expect(dashboardHelpLauncherSource).not.toContain('dashboard.admin.daily-end.v2')
  })

  it('lists member actions in the first Dashboard guided tutorials launcher group', () => {
    const dashboardHelpLauncherSource = readSourceFile(
      'src/components/help/dashboard-help-launcher.tsx'
    )
    const memberActionsIndex = dashboardHelpLauncherSource.indexOf(PRESENCE_ID)
    const ddsRoutineIndex = dashboardHelpLauncherSource.indexOf("title: 'DDS Routine'")

    expect(dashboardHelpLauncherSource).toContain(PRESENCE_ID)
    expect(memberActionsIndex).toBeGreaterThan(-1)
    expect(ddsRoutineIndex).toBeGreaterThan(-1)
    expect(memberActionsIndex).toBeLessThan(ddsRoutineIndex)
    expect(dashboardHelpLauncherSource).not.toContain('dashboard.admin.presence.v1')
  })

  it('lists DDS weekly handover at the end of the DDS Routine launcher group', () => {
    const dashboardHelpLauncherSource = readSourceFile(
      'src/components/help/dashboard-help-launcher.tsx'
    )
    const ddsRoutineProcedureIds = dashboardHelpLauncherSource.match(
      /title: 'DDS Routine'[\s\S]*?procedureIds: \[([^\]]*)\]/
    )?.[1]

    expect(ddsRoutineProcedureIds).toContain(DDS_TRANSFER_ID)
    expect(ddsRoutineProcedureIds?.trim().endsWith(`'${DDS_TRANSFER_ID}',`)).toBe(true)
    expect(dashboardHelpLauncherSource).not.toContain("title: 'Control Actions'")
    expect(dashboardHelpLauncherSource).not.toContain('dashboard.admin.actions.v2')
  })

  it('keeps daily start v2 steps in the expected order', () => {
    const dailyStart = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DAILY_START_ID
    )

    expect(dailyStart?.steps.map((step) => step.id)).toEqual([...DAILY_START_STEP_IDS])
  })

  it('uses ordered fallback selectors for conditional daily start targets', () => {
    const dailyStart = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DAILY_START_ID
    )

    expect(dailyStart?.steps.find((step) => step.id === 'dds-responsibility')?.target).toBe(
      '[data-help-id="dashboard.stat.dds.responsibility-action"], [data-help-id="dashboard.stat.dds"]'
    )
    expect(dailyStart?.steps.find((step) => step.id === 'duty-watch')?.target).toBe(
      '[data-help-id="dashboard.stat.duty-watch"], [data-help-id="dashboard.status-stats"]'
    )
    expect(dailyStart?.steps.find((step) => step.id === 'lockup-holder')?.target).toBe(
      '[data-help-id="dashboard.stat.lockup-holder"], [data-help-id="dashboard.stat.building"]'
    )
    expect(dailyStart?.steps.find((step) => step.id === 'scanner-bar')?.target).toBe(
      '[data-help-id="dashboard.scan-panel"], [data-help-id="dashboard.scan-panel.show"]'
    )
  })

  it('keeps normal end-of-day lockup steps in the expected order', () => {
    const normalEndDayLockup = dashboardProcedureDefinitions.find(
      (definition) => definition.id === NORMAL_END_DAY_LOCKUP_ID
    )

    expect(normalEndDayLockup?.steps.map((step) => step.id)).toEqual([
      ...NORMAL_END_DAY_LOCKUP_STEP_IDS,
    ])
  })

  it('keeps DDS lockup handoff steps in the expected order', () => {
    const ddsLockupHandoff = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DDS_LOCKUP_HANDOFF_ID
    )

    expect(ddsLockupHandoff?.steps.map((step) => step.id)).toEqual([...DDS_LOCKUP_HANDOFF_STEP_IDS])
  })

  it('describes DDS lockup handoff as an evening holder transfer before SWK arrival', () => {
    const ddsLockupHandoff = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DDS_LOCKUP_HANDOFF_ID
    )
    const ddsLockupHandoffCopy = JSON.stringify(ddsLockupHandoff)

    expect(ddsLockupHandoff?.summary).toContain('member staying')
    expect(ddsLockupHandoffCopy).toContain('before Duty Watch arrives')
    expect(ddsLockupHandoffCopy).toContain('must transfer lockup to the SWK')
    expect(ddsLockupHandoffCopy).not.toContain('oncoming SWK')
  })

  it('keeps Duty Watch lockup steps in the expected order', () => {
    const dutyWatchLockup = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DUTY_WATCH_LOCKUP_ID
    )

    expect(dutyWatchLockup?.steps.map((step) => step.id)).toEqual([...DUTY_WATCH_LOCKUP_STEP_IDS])
  })

  it('keeps presence review v2 focused on member action options', () => {
    const presence = dashboardProcedureDefinitions.find(
      (definition) => definition.id === PRESENCE_ID
    )

    expect(presence?.steps.map((step) => step.id)).toEqual([...PRESENCE_STEP_IDS])
  })

  it('keeps DDS transfer steps in the expected order', () => {
    const ddsTransfer = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DDS_TRANSFER_ID
    )

    expect(ddsTransfer?.steps.map((step) => step.id)).toEqual([...DDS_TRANSFER_STEP_IDS])
  })

  it('does not cover filters, search, or empty states in presence review v2', () => {
    const presence = dashboardProcedureDefinitions.find(
      (definition) => definition.id === PRESENCE_ID
    )
    const presenceTargets = presence?.steps.map((step) => step.target).join('\n')

    expect(presenceTargets).not.toContain('dashboard.presence.filter-buttons')
    expect(presenceTargets).not.toContain('dashboard.presence.search')
    expect(presence?.steps.map((step) => step.id)).not.toContain('presence-empty-states')
    expect(presence?.steps.map((step) => step.id)).not.toContain('presence-manual-in-out')
  })

  it('targets each member action row in presence review v2', () => {
    const presence = dashboardProcedureDefinitions.find(
      (definition) => definition.id === PRESENCE_ID
    )

    expect(presence?.steps.find((step) => step.id === 'manual-checkout')?.target).toBe(
      '[data-help-id="dashboard.presence.member-action.manual-checkout"], [data-help-id="dashboard.presence.member-action-panel"]'
    )
    expect(presence?.steps.find((step) => step.id === 'temporary-role')?.target).toBe(
      '[data-help-id="dashboard.presence.member-action.temporary-role"], [data-help-id="dashboard.presence.member-action-panel"]'
    )
    expect(presence?.steps.find((step) => step.id === 'tonight-override')?.target).toBe(
      '[data-help-id="dashboard.presence.member-action.tonight-override"], [data-help-id="dashboard.presence.member-action-panel"]'
    )
    expect(presence?.steps.find((step) => step.id === 'transfer-lockup')?.target).toBe(
      '[data-help-id="dashboard.presence.member-action.transfer-lockup"], [data-help-id="dashboard.presence.member-action-panel"]'
    )
    expect(presence?.steps.find((step) => step.id === 'recent-history')?.target).toBe(
      '[data-help-id="dashboard.presence.member-action.history"], [data-help-id="dashboard.presence.member-action-panel"]'
    )
  })

  it('targets DDS transfer and incoming DDS responsibility actions', () => {
    const ddsTransfer = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DDS_TRANSFER_ID
    )

    expect(ddsTransfer?.steps.find((step) => step.id === 'confirm-current-dds')?.target).toBe(
      '[data-help-id="dashboard.stat.dds"]'
    )
    expect(ddsTransfer?.steps.find((step) => step.id === 'confirm-current-dds')?.after).toBeTypeOf(
      'function'
    )
    expect(ddsTransfer?.steps.find((step) => step.id === 'open-transfer-dds')?.target).toBe(
      '[data-help-id="dashboard.stat.dds.handover-example"], [data-help-id="dashboard.stat.dds"]'
    )
    expect(ddsTransfer?.steps.find((step) => step.id === 'open-transfer-dds')?.after).toBeTypeOf(
      'function'
    )
    expect(ddsTransfer?.steps.find((step) => step.id === 'handover-confirmation')?.target).toBe(
      '[data-help-id="dashboard.stat.dds.handover-modal-example"]'
    )
    expect(
      ddsTransfer?.steps.find((step) => step.id === 'handover-confirmation')?.after
    ).toBeTypeOf('function')
    expect(
      ddsTransfer?.steps.find((step) => step.id === 'accept-or-complete-handover')?.target
    ).toBe(
      '[data-help-id="dashboard.stat.dds.responsibility-action"], [data-help-id="dashboard.stat.dds"]'
    )
  })

  it('opens member actions before presence review v2 highlights action rows', () => {
    const presence = dashboardProcedureDefinitions.find(
      (definition) => definition.id === PRESENCE_ID
    )

    expect(presence?.steps.find((step) => step.id === 'open-member-actions')?.target).toBe(
      '[data-help-id="dashboard.presence.person-card"]'
    )
    expect(
      presence?.steps.find((step) => step.id === 'open-member-actions')?.before
    ).toBeUndefined()
    expect(presence?.steps.find((step) => step.id === 'open-member-actions')?.after).toBeTypeOf(
      'function'
    )
    expect(presence?.steps.find((step) => step.id === 'manual-checkout')?.before).toBeTypeOf(
      'function'
    )
    expect(presence?.steps.find((step) => step.id === 'recent-history')?.before).toBeTypeOf(
      'function'
    )
  })

  it('uses ordered fallback selectors for conditional end-of-day workflow targets', () => {
    const normalEndDayLockup = dashboardProcedureDefinitions.find(
      (definition) => definition.id === NORMAL_END_DAY_LOCKUP_ID
    )
    const ddsLockupHandoff = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DDS_LOCKUP_HANDOFF_ID
    )
    const dutyWatchLockup = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DUTY_WATCH_LOCKUP_ID
    )

    expect(
      normalEndDayLockup?.steps.find((step) => step.id === 'review-person-cards')?.target
    ).toBe('[data-help-id="dashboard.presence.cards"], [data-help-id="dashboard.presence"]')
    expect(
      normalEndDayLockup?.steps.find((step) => step.id === 'manual-sign-out-choice')?.target
    ).toBe('[data-help-id="dashboard.presence.manual-in-out"], [data-help-id="dashboard.presence"]')
    expect(normalEndDayLockup?.steps.find((step) => step.id === 'execute-lockup')?.target).toBe(
      '[data-help-id="dashboard.quick-actions.execute-lockup"], [data-help-id="dashboard.stat.actions"]'
    )
    expect(
      ddsLockupHandoff?.steps.find((step) => step.id === 'confirm-evening-holder-present')?.target
    ).toBe('[data-help-id="dashboard.presence.search"], [data-help-id="dashboard.presence"]')
    expect(ddsLockupHandoff?.steps.find((step) => step.id === 'transfer-lockup')?.target).toBe(
      '[data-help-id="dashboard.quick-actions.transfer-lockup"], [data-help-id="dashboard.stat.actions"]'
    )
    expect(
      ddsLockupHandoff?.steps.find((step) => step.id === 'confirm-lockup-holder')?.target
    ).toBe(
      '[data-help-id="dashboard.stat.lockup-holder"], [data-help-id="dashboard.stat.building"]'
    )
    expect(dutyWatchLockup?.steps.find((step) => step.id === 'confirm-duty-watch')?.target).toBe(
      '[data-help-id="dashboard.stat.duty-watch"], [data-help-id="dashboard.status-stats"]'
    )
    expect(
      dutyWatchLockup?.steps.find((step) => step.id === 'manual-sign-out-choice')?.target
    ).toBe('[data-help-id="dashboard.presence.manual-in-out"], [data-help-id="dashboard.presence"]')
    expect(dutyWatchLockup?.steps.find((step) => step.id === 'confirm-lockup-holder')?.target).toBe(
      '[data-help-id="dashboard.stat.lockup-holder"], [data-help-id="dashboard.stat.building"]'
    )
    expect(dutyWatchLockup?.steps.find((step) => step.id === 'execute-lockup')?.target).toBe(
      '[data-help-id="dashboard.quick-actions.execute-lockup"], [data-help-id="dashboard.stat.actions"]'
    )
  })

  it('keeps alerts out of end-of-day workflow tutorials', () => {
    const endOfDayWorkflowIds = [
      NORMAL_END_DAY_LOCKUP_ID,
      DDS_LOCKUP_HANDOFF_ID,
      DUTY_WATCH_LOCKUP_ID,
    ]

    for (const workflowId of endOfDayWorkflowIds) {
      const workflow = dashboardProcedureDefinitions.find(
        (definition) => definition.id === workflowId
      )

      expect(
        workflow?.steps.some((step) => step.target?.includes('dashboard.security-alerts'))
      ).toBe(false)
    }
  })

  it('does not use Open Building as an end-of-day Execute Lockup fallback', () => {
    const normalEndDayLockup = dashboardProcedureDefinitions.find(
      (definition) => definition.id === NORMAL_END_DAY_LOCKUP_ID
    )
    const dutyWatchLockup = dashboardProcedureDefinitions.find(
      (definition) => definition.id === DUTY_WATCH_LOCKUP_ID
    )

    expect(
      normalEndDayLockup?.steps.find((step) => step.id === 'execute-lockup')?.target
    ).not.toContain('dashboard.quick-actions.open-building')
    expect(
      dutyWatchLockup?.steps.find((step) => step.id === 'execute-lockup')?.target
    ).not.toContain('dashboard.quick-actions.open-building')
  })

  it('shows an example alert before dashboard alert tutorial steps', () => {
    for (const { procedureId, stepId } of DASHBOARD_ALERT_TUTORIAL_STEPS) {
      const procedure = dashboardProcedureDefinitions.find(
        (definition) => definition.id === procedureId
      )
      const step = procedure?.steps.find((candidateStep) => candidateStep.id === stepId)

      expect(step?.target, `${procedureId}:${stepId} target`).toBe(
        '[data-help-id="dashboard.security-alerts-region"]'
      )
      expect(step?.before, `${procedureId}:${stepId} before`).toBeTypeOf('function')
      expect(step?.after, `${procedureId}:${stepId} after`).toBeTypeOf('function')
    }
  })

  it('does not register the retired action safety tutorial', () => {
    const dashboardProceduresSource = readSourceFile('src/help/dashboard-procedures.ts')

    expect(
      dashboardProcedureDefinitions.some(
        (definition) => definition.id === 'dashboard.admin.actions.v2'
      )
    ).toBe(false)
    expect(dashboardProceduresSource).not.toContain('DDS & SWK Actions')
    expect(dashboardProceduresSource).not.toContain(['Dashboard', 'Action', 'Safety'].join(' '))
    expect(dashboardProceduresSource).not.toContain(['Action', 'Safety'].join(' '))
  })

  it('uses existing dashboard help IDs for dashboard tutorial targets', () => {
    const dashboardTutorials = dashboardProcedureDefinitions.filter(
      (definition) => definition.route === '/dashboard'
    )
    const dashboardHelpIds = collectDashboardHelpIds()

    expect(dashboardTutorials).not.toHaveLength(0)

    for (const tutorial of dashboardTutorials) {
      for (const step of tutorial.steps) {
        expect(step.target, `${tutorial.id}:${step.id} should have a target`).toBeTruthy()

        const targetHelpIds = extractHelpIdsFromSelector(step.target ?? '')
        expect(
          targetHelpIds,
          `${tutorial.id}:${step.id} should target data-help-id selectors`
        ).not.toHaveLength(0)

        for (const helpId of targetHelpIds) {
          expect(dashboardHelpIds.has(helpId), `${tutorial.id}:${step.id} target ${helpId}`).toBe(
            true
          )
        }
      }
    }
  })

  it('opens the app sidebar before highlighting recent activity', () => {
    const orientation = dashboardProcedureDefinitions.find(
      (definition) => definition.id === ORIENTATION_ID
    )
    const recentActivityStep = orientation?.steps.find((step) => step.id === 'recent-activity')
    const sidebarToggleStep = orientation?.steps.find((step) => step.id === 'sidebar-toggle')

    expect(recentActivityStep?.before).toBeTypeOf('function')
    expect(sidebarToggleStep?.before).toBeUndefined()
  })
})
