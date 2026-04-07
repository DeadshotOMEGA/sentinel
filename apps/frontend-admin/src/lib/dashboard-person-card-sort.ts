import type { PresentPerson } from '@sentinel/contracts'

export const DASHBOARD_PERSON_CARD_SORT_SETTING_KEY = 'dashboard.person_card_sort'
export const DASHBOARD_PERSON_CARD_SORT_SETTING_CATEGORY = 'app_config'
export const DASHBOARD_PERSON_CARD_SORT_SETTING_DESCRIPTION =
  'Defines the organization-wide ordering rules for dashboard person cards.'

export type DashboardSortCriterionType =
  | 'specific_tag'
  | 'positional_tags'
  | 'rank'
  | 'last_name'
  | 'first_name'
  | 'department'
  | 'active_dds'
  | 'scheduled_dds'
  | 'scheduled_duty_watch'
  | 'visitor'
  | 'visit_type'

export interface DashboardSortCriterion {
  id: string
  type: DashboardSortCriterionType
  note: string
  config?: {
    tagId?: string
    visitTypeId?: string
  }
  children: DashboardSortCriterion[]
}

export interface DashboardPersonCardSortConfig {
  version: 1
  criteria: DashboardSortCriterion[]
}

export interface DashboardSortContext {
  activeDdsMemberId: string | null
  scheduledDdsMemberId: string | null
}

export const DEFAULT_DASHBOARD_PERSON_CARD_SORT: DashboardPersonCardSortConfig = {
  version: 1,
  criteria: [],
}

export const DASHBOARD_SORT_CRITERIA_OPTIONS: Array<{
  type: DashboardSortCriterionType
  label: string
  description: string
  requiresConfig?: 'tagId' | 'visitTypeId'
  allowChildren: boolean
}> = [
  {
    type: 'specific_tag',
    label: 'Specific Tag',
    description: 'Group members that carry one selected direct tag.',
    requiresConfig: 'tagId',
    allowChildren: true,
  },
  {
    type: 'positional_tags',
    label: 'Positional Tags',
    description: 'Group members who currently have positional tags.',
    allowChildren: true,
  },
  {
    type: 'active_dds',
    label: 'Active DDS',
    description: 'Group the currently active DDS member.',
    allowChildren: true,
  },
  {
    type: 'scheduled_dds',
    label: 'Scheduled DDS',
    description: 'Group the currently scheduled DDS member.',
    allowChildren: true,
  },
  {
    type: 'scheduled_duty_watch',
    label: 'Scheduled Duty Watch',
    description: 'Group members scheduled for tonight’s duty watch.',
    allowChildren: true,
  },
  {
    type: 'visitor',
    label: 'Visitor',
    description: 'Group visitor cards together.',
    allowChildren: true,
  },
  {
    type: 'visit_type',
    label: 'Visit Type',
    description: 'Group visitors for one selected visit type.',
    requiresConfig: 'visitTypeId',
    allowChildren: true,
  },
  {
    type: 'rank',
    label: 'Rank',
    description: 'Sort by rank seniority from highest to lowest.',
    allowChildren: false,
  },
  {
    type: 'last_name',
    label: 'Last Name',
    description: 'Sort alphabetically by last name.',
    allowChildren: false,
  },
  {
    type: 'first_name',
    label: 'First Name',
    description: 'Sort alphabetically by first name.',
    allowChildren: false,
  },
  {
    type: 'department',
    label: 'Department',
    description: 'Sort alphabetically by division or department.',
    allowChildren: false,
  },
]

const BUCKET_CRITERIA = new Set<DashboardSortCriterionType>([
  'specific_tag',
  'positional_tags',
  'active_dds',
  'scheduled_dds',
  'scheduled_duty_watch',
  'visitor',
  'visit_type',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseCriterion(value: unknown): DashboardSortCriterion | null {
  if (!isRecord(value)) {
    return null
  }

  const { id, type, note, config, children } = value
  if (
    typeof id !== 'string' ||
    !DASHBOARD_SORT_CRITERIA_OPTIONS.some((option) => option.type === type) ||
    typeof note !== 'string' ||
    !Array.isArray(children)
  ) {
    return null
  }

  const parsedChildren = children.map(parseCriterion)
  if (parsedChildren.some((child) => child === null)) {
    return null
  }

  const parsedConfig =
    isRecord(config) &&
    (typeof config.tagId === 'string' ||
      typeof config.visitTypeId === 'string' ||
      config.tagId === undefined ||
      config.visitTypeId === undefined)
      ? {
          ...(typeof config.tagId === 'string' ? { tagId: config.tagId } : {}),
          ...(typeof config.visitTypeId === 'string' ? { visitTypeId: config.visitTypeId } : {}),
        }
      : undefined

  return {
    id,
    type: type as DashboardSortCriterionType,
    note,
    config: parsedConfig,
    children: parsedChildren.filter((child): child is DashboardSortCriterion => child !== null),
  }
}

export function parseDashboardPersonCardSort(value: unknown): DashboardPersonCardSortConfig | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.criteria)) {
    return null
  }

  const criteria = value.criteria.map(parseCriterion)
  if (criteria.some((criterion) => criterion === null)) {
    return null
  }

  return {
    version: 1,
    criteria: criteria.filter(
      (criterion): criterion is DashboardSortCriterion => criterion !== null
    ),
  }
}

function getPersonLastName(person: PresentPerson): string {
  if (person.lastName?.trim()) {
    return person.lastName.trim()
  }

  const displayName = person.displayName ?? person.name
  return displayName.split(',')[0]?.trim() ?? displayName
}

function getPersonFirstName(person: PresentPerson): string {
  if (person.firstName?.trim()) {
    return person.firstName.trim()
  }

  const displayName = person.displayName ?? person.name
  const [, trailing] = displayName.split(',')
  return trailing?.trim() ?? displayName
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a ?? '').localeCompare(b ?? '', undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function compareByCriterion(
  left: PresentPerson,
  right: PresentPerson,
  criterion: DashboardSortCriterion
): number {
  switch (criterion.type) {
    case 'rank':
      return (right.rankSortOrder ?? 0) - (left.rankSortOrder ?? 0)
    case 'last_name':
      return compareText(getPersonLastName(left), getPersonLastName(right))
    case 'first_name':
      return compareText(getPersonFirstName(left), getPersonFirstName(right))
    case 'department':
      return compareText(left.division ?? left.divisionCode, right.division ?? right.divisionCode)
    default:
      return 0
  }
}

function defaultComparator(left: PresentPerson, right: PresentPerson): number {
  const rankComparison = (right.rankSortOrder ?? 0) - (left.rankSortOrder ?? 0)
  if (rankComparison !== 0) {
    return rankComparison
  }

  const lastNameComparison = compareText(getPersonLastName(left), getPersonLastName(right))
  if (lastNameComparison !== 0) {
    return lastNameComparison
  }

  const firstNameComparison = compareText(getPersonFirstName(left), getPersonFirstName(right))
  if (firstNameComparison !== 0) {
    return firstNameComparison
  }

  return new Date(right.checkInTime).getTime() - new Date(left.checkInTime).getTime()
}

function legacyDashboardComparator(left: PresentPerson, right: PresentPerson): number {
  if (left.type !== right.type) {
    return left.type === 'visitor' ? -1 : 1
  }

  if (left.type === 'member' && right.type === 'member') {
    const rankComparison = (right.rankSortOrder ?? 0) - (left.rankSortOrder ?? 0)
    if (rankComparison !== 0) {
      return rankComparison
    }
  }

  return new Date(right.checkInTime).getTime() - new Date(left.checkInTime).getTime()
}

function sortPeople(
  people: PresentPerson[],
  comparatorCriteria: DashboardSortCriterion[]
): PresentPerson[] {
  return [...people].sort((left, right) => {
    for (const criterion of comparatorCriteria) {
      const comparison = compareByCriterion(left, right, criterion)
      if (comparison !== 0) {
        return comparison
      }
    }

    return defaultComparator(left, right)
  })
}

function matchesBucketCriterion(
  person: PresentPerson,
  criterion: DashboardSortCriterion,
  context: DashboardSortContext
): boolean {
  switch (criterion.type) {
    case 'specific_tag':
      return (
        person.type === 'member' &&
        !!criterion.config?.tagId &&
        !!person.tags?.some((tag) => tag.id === criterion.config?.tagId && tag.source === 'direct')
      )
    case 'positional_tags':
      return person.type === 'member' && !!person.tags?.some((tag) => tag.isPositional)
    case 'active_dds':
      return (
        person.type === 'member' &&
        !!context.activeDdsMemberId &&
        person.id === context.activeDdsMemberId
      )
    case 'scheduled_dds':
      return (
        person.type === 'member' &&
        !!context.scheduledDdsMemberId &&
        person.id === context.scheduledDdsMemberId
      )
    case 'scheduled_duty_watch':
      return person.type === 'member' && !!person.scheduledDutyTonight
    case 'visitor':
      return person.type === 'visitor'
    case 'visit_type':
      return (
        person.type === 'visitor' &&
        !!criterion.config?.visitTypeId &&
        person.visitType?.id === criterion.config.visitTypeId
      )
    default:
      return false
  }
}

function applyCriteria(
  people: PresentPerson[],
  criteria: DashboardSortCriterion[],
  context: DashboardSortContext
): PresentPerson[] {
  if (criteria.length === 0) {
    return sortPeople(people, [])
  }

  let remaining = [...people]
  const grouped: PresentPerson[] = []
  const comparatorCriteria: DashboardSortCriterion[] = []

  for (const criterion of criteria) {
    if (!BUCKET_CRITERIA.has(criterion.type)) {
      comparatorCriteria.push(criterion)
      continue
    }

    const matched = remaining.filter((person) => matchesBucketCriterion(person, criterion, context))
    if (matched.length === 0) {
      continue
    }

    remaining = remaining.filter(
      (person) => !matched.some((candidate) => candidate.id === person.id)
    )
    grouped.push(...applyCriteria(matched, criterion.children, context))
  }

  return [...grouped, ...sortPeople(remaining, comparatorCriteria)]
}

export function applyDashboardPersonCardSort(
  people: PresentPerson[],
  config: DashboardPersonCardSortConfig | null,
  context: DashboardSortContext
): PresentPerson[] {
  const effectiveConfig = config ?? DEFAULT_DASHBOARD_PERSON_CARD_SORT
  if (effectiveConfig.criteria.length === 0) {
    return [...people].sort(legacyDashboardComparator)
  }
  return applyCriteria(people, effectiveConfig.criteria, context)
}
