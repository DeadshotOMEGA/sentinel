import type { CreateVisitorInput, RecruitmentStep, VisitPurpose } from '@sentinel/contracts'

export type SelfServiceVisitType = 'guest' | 'military' | 'recruitment' | 'contractor'

export type SelfServiceVisitReason =
  | 'recruitment'
  | 'contract_work'
  | 'event'
  | 'museum'
  | 'meeting'
  | 'other'

export type SelfServiceVisitorBranch = 'military' | 'civilian'

export const RECRUITMENT_DEFAULT_STEP: RecruitmentStep = 'information'

export const SELF_SERVICE_REASON_OPTIONS: Array<{
  value: SelfServiceVisitReason
  label: string
  description: string
}> = [
  {
    value: 'recruitment',
    label: 'Recruitment',
    description: 'Prospective members visiting for recruiting support.',
  },
  {
    value: 'contract_work',
    label: 'Contract Work',
    description: 'Trades, service providers, and delivery-related work visits.',
  },
  {
    value: 'event',
    label: 'Event',
    description: 'Visitors attending an organized unit event.',
  },
  {
    value: 'museum',
    label: 'Museum',
    description: 'Museum-related visit or historical inquiry.',
  },
  {
    value: 'meeting',
    label: 'Meeting',
    description: 'Scheduled meeting with a specific member.',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'A reason that does not fit the listed options.',
  },
]

export const SELF_SERVICE_BRANCH_OPTIONS: Array<{
  value: SelfServiceVisitorBranch
  label: string
  description: string
}> = [
  {
    value: 'military',
    label: 'Military',
    description: 'Visiting in military capacity from another unit or formation.',
  },
  {
    value: 'civilian',
    label: 'Civilian',
    description: 'Civilian visitor profile.',
  },
]

const VISIT_REASON_LABELS: Record<SelfServiceVisitReason, string> = {
  recruitment: 'Recruitment',
  contract_work: 'Contract Work',
  event: 'Event',
  museum: 'Museum',
  meeting: 'Meeting',
  other: 'Other',
}

const BRANCH_LABELS: Record<SelfServiceVisitorBranch, string> = {
  military: 'Military',
  civilian: 'Civilian',
}

const VISIT_TYPE_LABELS: Record<SelfServiceVisitType, string> = {
  guest: 'Guest',
  military: 'Military',
  recruitment: 'Recruitment',
  contractor: 'Contractor',
}

const VISIT_PURPOSE_LABELS: Record<VisitPurpose, string> = {
  member_invited: 'Invited by a member',
  appointment: 'Appointment',
  information: 'Information',
  other: 'Other',
}

function trimValue(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function requireValue(value: string | null | undefined, message: string): string {
  const trimmed = trimValue(value)
  if (!trimmed) {
    throw new Error(message)
  }

  return trimmed
}

export function getSelfServiceVisitReasonLabel(reason: SelfServiceVisitReason): string {
  return VISIT_REASON_LABELS[reason]
}

export function getSelfServiceBranchLabel(branch: SelfServiceVisitorBranch): string {
  return BRANCH_LABELS[branch]
}

export function getSelfServiceVisitTypeLabel(visitType: SelfServiceVisitType): string {
  return VISIT_TYPE_LABELS[visitType]
}

export function getVisitPurposeLabel(purpose: VisitPurpose): string {
  return VISIT_PURPOSE_LABELS[purpose]
}

export function reasonRequiresBranch(reason: SelfServiceVisitReason): boolean {
  return reason !== 'recruitment'
}

export function reasonRequiresMemberSelection(reason: SelfServiceVisitReason): boolean {
  return reason === 'meeting'
}

export function reasonRequiresEventSelection(reason: SelfServiceVisitReason): boolean {
  return reason === 'event'
}

export function reasonUsesContractInputs(reason: SelfServiceVisitReason): boolean {
  return reason === 'contract_work'
}

function resolveVisitType(
  reason: SelfServiceVisitReason,
  branch?: SelfServiceVisitorBranch
): SelfServiceVisitType {
  if (reason === 'recruitment') return 'recruitment'
  if (reason === 'contract_work') return 'contractor'

  if (!branch) {
    throw new Error('Select Military or Civilian to continue')
  }

  return branch === 'military' ? 'military' : 'guest'
}

function resolveVisitPurpose(reason: SelfServiceVisitReason): VisitPurpose {
  if (reason === 'contract_work') return 'other'
  if (reason === 'meeting') return 'appointment'
  return 'information'
}

export interface ReasonFirstVisitSummaryInput {
  reason: SelfServiceVisitReason
  branch?: SelfServiceVisitorBranch
  organization?: string
  workDescription?: string
  eventTitle?: string
  eventDateLabel?: string
  hostDisplayName?: string
  rankPrefix?: string
  unit?: string
}

export function buildReasonFirstVisitSummary(input: ReasonFirstVisitSummaryInput): string {
  const parts: string[] = [`Reason: ${getSelfServiceVisitReasonLabel(input.reason)}`]

  if (input.branch) {
    parts.push(`Category: ${getSelfServiceBranchLabel(input.branch)}`)
  }

  const rankPrefix = trimValue(input.rankPrefix)
  if (rankPrefix) {
    parts.push(`Rank: ${rankPrefix}`)
  }

  const unit = trimValue(input.unit)
  if (unit) {
    parts.push(`Unit: ${unit}`)
  }

  const organization = trimValue(input.organization)
  if (organization) {
    parts.push(`Company/Organization: ${organization}`)
  }

  const workDescription = trimValue(input.workDescription)
  if (workDescription) {
    parts.push(`Work: ${workDescription}`)
  }

  const eventTitle = trimValue(input.eventTitle)
  if (eventTitle) {
    const eventDate = trimValue(input.eventDateLabel)
    parts.push(eventDate ? `Event: ${eventTitle} (${eventDate})` : `Event: ${eventTitle}`)
  }

  const hostDisplayName = trimValue(input.hostDisplayName)
  if (hostDisplayName) {
    parts.push(`Meeting with: ${hostDisplayName}`)
  }

  return parts.join(' | ')
}

export interface BuildReasonFirstVisitorPayloadInput {
  kioskId: string
  reason: SelfServiceVisitReason
  branch?: SelfServiceVisitorBranch
  firstName?: string
  lastName?: string
  initials?: string
  rankPrefix?: string
  unit?: string
  organization?: string
  workDescription?: string
  licensePlate?: string
  hostMemberId?: string
  hostDisplayName?: string
  eventId?: string
  eventTitle?: string
  eventDateLabel?: string
}

export function buildReasonFirstVisitorPayload(
  input: BuildReasonFirstVisitorPayloadInput
): CreateVisitorInput {
  const visitType = resolveVisitType(input.reason, input.branch)
  const visitPurpose = resolveVisitPurpose(input.reason)

  if (reasonRequiresBranch(input.reason) && !input.branch) {
    throw new Error('Select Military or Civilian to continue')
  }

  const rankPrefix = trimValue(input.rankPrefix)
  const unit = trimValue(input.unit)

  const isMilitaryIdentity = input.reason !== 'recruitment' && input.branch === 'military'

  const firstName = isMilitaryIdentity
    ? requireValue(input.initials, 'Initials are required for military visitors')
    : requireValue(input.firstName, 'First name is required')

  const lastName = requireValue(input.lastName, 'Last name is required')

  if (isMilitaryIdentity) {
    if (!rankPrefix) {
      throw new Error('Rank is required for military visitors')
    }

    if (!unit) {
      throw new Error('Unit is required for military visitors')
    }
  }

  const payload: CreateVisitorInput = {
    firstName,
    lastName,
    name: [rankPrefix, firstName, lastName].filter(Boolean).join(' '),
    visitType,
    kioskId: input.kioskId,
    checkInMethod: 'kiosk_self_service',
    visitPurpose,
    visitReason: buildReasonFirstVisitSummary({
      reason: input.reason,
      branch: input.branch,
      organization: input.organization,
      workDescription: input.workDescription,
      eventTitle: input.eventTitle,
      eventDateLabel: input.eventDateLabel,
      hostDisplayName: input.hostDisplayName,
      rankPrefix,
      unit,
    }),
  }

  if (rankPrefix) {
    payload.rankPrefix = rankPrefix
  }

  if (unit) {
    payload.unit = unit
  }

  const licensePlate = trimValue(input.licensePlate)
  if (licensePlate) {
    payload.licensePlate = licensePlate
  }

  if (input.reason === 'recruitment') {
    payload.recruitmentStep = RECRUITMENT_DEFAULT_STEP
  }

  if (input.reason === 'contract_work') {
    const organization = requireValue(
      input.organization,
      'Company/Organization name is required for contract work visits'
    )
    const workDescription = requireValue(
      input.workDescription,
      'Work description is required for contract work visits'
    )

    payload.organization = organization
    payload.purposeDetails = workDescription
  }

  if (reasonRequiresMemberSelection(input.reason)) {
    payload.hostMemberId = requireValue(
      input.hostMemberId,
      'Select a member for meeting visits before continuing'
    )
  } else {
    const optionalHostMemberId = trimValue(input.hostMemberId)
    if (optionalHostMemberId) {
      payload.hostMemberId = optionalHostMemberId
    }
  }

  if (reasonRequiresEventSelection(input.reason)) {
    const eventId = requireValue(input.eventId, 'Select an event before continuing')
    payload.eventId = eventId

    const eventTitle = trimValue(input.eventTitle)
    const eventDateLabel = trimValue(input.eventDateLabel)

    if (eventTitle) {
      payload.purposeDetails = eventDateLabel
        ? `Event selected: ${eventTitle} (${eventDateLabel})`
        : `Event selected: ${eventTitle}`
    } else {
      payload.purposeDetails = 'Event visit'
    }
  }

  return payload
}

export interface VisitorInstructionInput {
  visitType: SelfServiceVisitType
  visitPurpose?: VisitPurpose
  hostDisplayName?: string
}

export function getVisitorFinalInstructions(input: VisitorInstructionInput): {
  title: string
  message: string
  actionLabel: string
} {
  if (input.visitType === 'recruitment') {
    return {
      title: 'Recruitment Check-In Complete',
      message:
        'Please proceed to Brow to receive your pass and further direction for the recruitment process.',
      actionLabel: 'Proceed to Brow',
    }
  }

  if (input.visitType === 'contractor') {
    return {
      title: 'Contractor Check-In Complete',
      message:
        'Please report to the Quartermaster or duty desk for contractor processing before continuing inside the Unit.',
      actionLabel: 'Report to Duty Desk',
    }
  }

  if (
    input.hostDisplayName &&
    ['member_invited', 'appointment'].includes(input.visitPurpose ?? '')
  ) {
    return {
      title: 'Welcome to the Unit',
      message: `Please report to the duty desk and let them know you are here to see ${input.hostDisplayName}.`,
      actionLabel: 'Report to Duty Desk',
    }
  }

  if (input.visitPurpose === 'information') {
    return {
      title: 'Welcome to the Unit',
      message: 'Please report to the duty desk for information and further assistance.',
      actionLabel: 'Report to Duty Desk',
    }
  }

  return {
    title: 'Welcome to the Unit',
    message: 'Please report to the duty desk for visitor processing and directions.',
    actionLabel: 'Report to Duty Desk',
  }
}
