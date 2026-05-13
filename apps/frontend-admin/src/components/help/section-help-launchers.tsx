'use client'

import {
  ProcedureHelpLauncher,
  type ProcedureGroup,
} from '@/components/help/procedure-help-launcher'
import {
  eventsProcedureDefinitions,
  historyProcedureDefinitions,
  membersProcedureDefinitions,
  schedulesProcedureDefinitions,
} from '@/help/section-procedures'
import { AccountLevel } from '@/store/auth-store'

const HISTORY_GROUPS: ProcedureGroup[] = [
  {
    title: 'Review history',
    summary: 'Find records and understand the audit table.',
    procedureIds: ['history.admin.orientation.v1'],
  },
  {
    title: 'Correct records',
    summary: 'Edit only verified member or visitor records.',
    procedureIds: ['history.admin.corrections.v1'],
  },
]

const MEMBERS_GROUPS: ProcedureGroup[] = [
  {
    title: 'Learn the roster',
    summary: 'Use filters, row actions, and bulk tools safely.',
    procedureIds: ['members.admin.orientation.v1'],
  },
  {
    title: 'Maintain records',
    summary: 'Create, import, and sync member records.',
    procedureIds: ['members.admin.records.v1'],
  },
]

const EVENTS_GROUPS: ProcedureGroup[] = [
  {
    title: 'Plan events',
    summary: 'Create events, read status, and open details.',
    procedureIds: ['events.planner.orientation.v1'],
  },
  {
    title: 'Event Duty Watch',
    summary: 'Assign event-specific support positions.',
    procedureIds: ['events.planner.duty-watch.v1'],
  },
]

const SCHEDULES_GROUPS: ProcedureGroup[] = [
  {
    title: 'Plan coverage',
    summary: 'Read week, month, and quarter schedule views.',
    procedureIds: ['schedules.scheduler.orientation.v1'],
  },
  {
    title: 'Publish coverage',
    summary: 'Assign and publish DDS or Duty Watch coverage.',
    procedureIds: ['schedules.scheduler.publish.v1'],
  },
]

export function HistoryHelpLauncher() {
  return (
    <ProcedureHelpLauncher
      routeId="checkins"
      routePath="/checkins"
      title="History Help Procedures"
      intro="Choose the procedure that matches your review or correction task. Use History as evidence, then confirm live Presence when changes affect who is on site."
      procedureGroups={HISTORY_GROUPS}
      procedures={historyProcedureDefinitions}
      minAccountLevel={AccountLevel.COMMAND}
      testId="history-help-launcher"
    />
  )
}

export function MembersHelpLauncher() {
  return (
    <ProcedureHelpLauncher
      routeId="members"
      routePath="/members"
      title="Members Help Procedures"
      intro="Choose the procedure that matches your member-record task. Member changes can affect access, schedules, badges, and qualifications."
      procedureGroups={MEMBERS_GROUPS}
      procedures={membersProcedureDefinitions}
      minAccountLevel={AccountLevel.ADMIN}
      testId="members-help-launcher"
    />
  )
}

export function EventsHelpLauncher() {
  return (
    <ProcedureHelpLauncher
      routeId="events"
      routePath="/events"
      title="Events Help Procedures"
      intro="Choose the procedure that matches your event-planning task. Keep event details current before planning supporting duties."
      procedureGroups={EVENTS_GROUPS}
      procedures={eventsProcedureDefinitions}
      minAccountLevel={AccountLevel.BASIC}
      testId="events-help-launcher"
    />
  )
}

export function SchedulesHelpLauncher() {
  return (
    <ProcedureHelpLauncher
      routeId="schedules"
      routePath="/schedules"
      title="Schedules Help Procedures"
      intro="Choose the procedure that matches your scheduling task. Publish only after validating people, dates, and coverage gaps."
      procedureGroups={SCHEDULES_GROUPS}
      procedures={schedulesProcedureDefinitions}
      minAccountLevel={AccountLevel.COMMAND}
      testId="schedules-help-launcher"
    />
  )
}
