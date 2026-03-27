import type { RecruitmentStep, VisitPurpose } from '@sentinel/contracts'

export type SelfServiceVisitType = 'guest' | 'military' | 'recruitment' | 'contractor'

export interface VisitorInstructionInput {
  visitType: SelfServiceVisitType
  visitPurpose?: VisitPurpose
  hostDisplayName?: string
}

export const SELF_SERVICE_VISIT_TYPE_OPTIONS: Array<{
  value: SelfServiceVisitType
  label: string
  description: string
}> = [
  {
    value: 'guest',
    label: 'Guest',
    description: 'Family, friends, and general visitors to the Unit.',
  },
  {
    value: 'military',
    label: 'Military',
    description: 'Serving members visiting from another unit or formation.',
  },
  {
    value: 'recruitment',
    label: 'Recruitment',
    description: 'Prospective members visiting for information or intake steps.',
  },
  {
    value: 'contractor',
    label: 'Contractor',
    description: 'Trades, vendors, and service providers conducting work.',
  },
]

export const RECRUITMENT_STEP_OPTIONS: Array<{
  value: RecruitmentStep
  label: string
}> = [
  { value: 'information', label: 'New and looking for information' },
  { value: 'testing', label: 'Testing' },
  { value: 'interview', label: 'Interview' },
  { value: 'medical_admin', label: 'Medical / Admin processing' },
  { value: 'other', label: 'Other recruitment step' },
]

export const VISIT_PURPOSE_OPTIONS: Array<{
  value: VisitPurpose
  label: string
  description: string
}> = [
  {
    value: 'member_invited',
    label: 'Invited by a member',
    description: 'You were invited to the Unit by a serving member.',
  },
  {
    value: 'appointment',
    label: 'Appointment',
    description: 'You have an appointment with someone at the Unit.',
  },
  {
    value: 'information',
    label: 'Information',
    description: 'You are here to get information or direction.',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Your visit does not match the other options.',
  },
]

const RECRUITMENT_STEP_LABELS: Record<RecruitmentStep, string> = {
  information: 'New and looking for information',
  testing: 'Testing',
  interview: 'Interview',
  medical_admin: 'Medical / Admin processing',
  other: 'Other recruitment step',
}

const VISIT_PURPOSE_LABELS: Record<VisitPurpose, string> = {
  member_invited: 'Invited by a member',
  appointment: 'Appointment',
  information: 'Information',
  other: 'Other',
}

export function getSelfServiceVisitTypeLabel(visitType: SelfServiceVisitType): string {
  return (
    SELF_SERVICE_VISIT_TYPE_OPTIONS.find((option) => option.value === visitType)?.label ?? visitType
  )
}

export function getRecruitmentStepLabel(step: RecruitmentStep): string {
  return RECRUITMENT_STEP_LABELS[step]
}

export function getVisitPurposeLabel(purpose: VisitPurpose): string {
  return VISIT_PURPOSE_LABELS[purpose]
}

export function buildVisitorReasonSummary(input: {
  visitType: SelfServiceVisitType
  visitPurpose: VisitPurpose
  recruitmentStep?: RecruitmentStep
  organization?: string
  unit?: string
  hostDisplayName?: string
  purposeDetails?: string
}): string {
  const parts: string[] = []
  const details = input.purposeDetails?.trim()

  if (input.visitType === 'recruitment' && input.recruitmentStep) {
    parts.push(getRecruitmentStepLabel(input.recruitmentStep))
  } else if (input.visitType === 'contractor' && input.organization) {
    parts.push(`Contractor visit for ${input.organization}`)
  } else if (input.visitType === 'military' && input.unit) {
    parts.push(`Military visitor from ${input.unit}`)
  } else {
    parts.push(`${getSelfServiceVisitTypeLabel(input.visitType)} visit`)
  }

  if (input.visitType === 'contractor') {
    if (details) {
      parts.push(`Work: ${details}`)
    }

    return parts.join(' | ')
  }

  if (input.hostDisplayName && ['member_invited', 'appointment'].includes(input.visitPurpose)) {
    parts.push(`${getVisitPurposeLabel(input.visitPurpose)} with ${input.hostDisplayName}`)
  } else if (!(input.visitPurpose === 'other' && details)) {
    parts.push(getVisitPurposeLabel(input.visitPurpose))
  }

  if (details) {
    parts.push(details)
  }

  return parts.join(' | ')
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
