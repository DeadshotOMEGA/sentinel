import type {
  RecruitmentStep,
  VisitPurpose,
  VisitType,
  CreateVisitorInput,
  UpdateVisitorInput,
} from '@sentinel/contracts'

const VISIT_PURPOSE_LABELS: Record<VisitPurpose, string> = {
  member_invited: 'Invited by a member',
  appointment: 'Appointment at the Unit',
  information: 'Seeking information',
  other: 'Other visit purpose',
}

const RECRUITMENT_STEP_LABELS: Record<RecruitmentStep, string> = {
  information: 'New applicant information',
  testing: 'Recruitment testing',
  interview: 'Recruitment interview',
  medical_admin: 'Medical or administrative processing',
  other: 'Other recruitment step',
}

function trimOptional(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function getTypeSummary(data: {
  visitType?: VisitType
  organization?: string
  unit?: string
  recruitmentStep?: RecruitmentStep
}): string | undefined {
  switch (data.visitType) {
    case 'contractor': {
      const organization = trimOptional(data.organization)
      return organization ? `Contractor visit for ${organization}` : 'Contractor visit'
    }
    case 'military': {
      const unit = trimOptional(data.unit)
      return unit ? `Military visitor from ${unit}` : 'Military visitor'
    }
    case 'recruitment': {
      if (data.recruitmentStep) {
        return RECRUITMENT_STEP_LABELS[data.recruitmentStep]
      }
      return 'Recruitment visit'
    }
    case 'guest':
      return 'Guest visit'
    case 'official':
      return 'Official visit'
    case 'other':
      return 'Other visitor purpose'
    default:
      return undefined
  }
}

export function buildLegacyVisitReason(
  data: Pick<
    CreateVisitorInput | UpdateVisitorInput,
    'visitType' | 'organization' | 'unit' | 'recruitmentStep' | 'visitPurpose' | 'purposeDetails'
  >
): string | undefined {
  const parts = [
    getTypeSummary(data),
    data.visitPurpose ? VISIT_PURPOSE_LABELS[data.visitPurpose] : undefined,
    trimOptional(data.purposeDetails),
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : undefined
}

export function resolveVisitReason(
  data: Pick<
    CreateVisitorInput | UpdateVisitorInput,
    | 'visitReason'
    | 'visitType'
    | 'organization'
    | 'unit'
    | 'recruitmentStep'
    | 'visitPurpose'
    | 'purposeDetails'
  >
): string | undefined {
  return trimOptional(data.visitReason) ?? buildLegacyVisitReason(data)
}
