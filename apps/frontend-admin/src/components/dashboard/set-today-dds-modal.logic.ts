export interface DisplayMember {
  id: string
  rank: string
  firstName: string
  lastName: string
  serviceNumber?: string | null
}

export type SetTodayDdsMode = 'handover' | 'transfer' | 'confirm' | 'assign'

export type RequirementState = 'met' | 'pending' | 'missing'

export interface RequirementCheck {
  id: string
  label: string
  detail: string
  state: RequirementState
  isBlocking: boolean
}

export interface SummaryBadge {
  label: string
  tone: 'info' | 'warning' | 'success' | 'neutral'
}

export interface SetTodayDdsModalPresentationInput {
  isHandoverPending: boolean
  hasActiveDds: boolean
  hasPendingDds: boolean
  isOverrideSelection: boolean
  isPendingCurrentDds: boolean
  isAlreadyCurrentDds: boolean
  loadingEligible: boolean
  candidateCount: number
  handoverFirstOperationalDay?: string | null
  selectedMember: DisplayMember | null
  currentAssignmentMember: DisplayMember | null
  selectedScheduledMember: DisplayMember | null
  outgoingHandoverMember: DisplayMember | null
  currentHolder: DisplayMember | null
  buildingStatus: 'secured' | 'open' | 'locking_up' | null
}

export interface SetTodayDdsModalPresentation {
  mode: SetTodayDdsMode
  title: string
  primaryActionLabel: string
  primaryActionTone: 'primary' | 'success'
  summaryBadges: SummaryBadge[]
  summaryCurrentLabel: string
  summaryCurrentMemberName: string
  summaryTargetLabel: string
  summaryTargetMemberName: string
  pickerInstruction: string
  noteHelper: string
  blockers: RequirementCheck[]
  detailsChecks: RequirementCheck[]
  metChecks: RequirementCheck[]
  canSubmit: boolean
}

export function formatMemberName(member: DisplayMember | null): string {
  if (!member) return 'None selected'
  return `${member.rank} ${member.firstName} ${member.lastName}`
}

export function formatOperationalDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  if (!year || !month || !day) return dateString

  return new Date(year, month - 1, day).toLocaleDateString()
}

export function getSetTodayDdsMode({
  isHandoverPending,
  hasActiveDds,
  hasPendingDds,
}: Pick<
  SetTodayDdsModalPresentationInput,
  'isHandoverPending' | 'hasActiveDds' | 'hasPendingDds'
>): SetTodayDdsMode {
  if (isHandoverPending) return 'handover'
  if (hasActiveDds) return 'transfer'
  if (hasPendingDds) return 'confirm'
  return 'assign'
}

function getPrimaryActionTone(input: SetTodayDdsModalPresentationInput): 'primary' | 'success' {
  return input.isPendingCurrentDds ? 'success' : 'primary'
}

function getPrimaryActionLabel(
  mode: SetTodayDdsMode,
  input: SetTodayDdsModalPresentationInput
): string {
  if (mode === 'handover') {
    if (input.selectedMember?.id && input.selectedMember.id === input.selectedScheduledMember?.id) {
      return 'Complete handover'
    }

    return 'Transfer DDS'
  }

  if (mode === 'confirm') {
    if (input.isPendingCurrentDds) {
      return 'Confirm DDS'
    }

    if (input.isOverrideSelection) {
      return 'Assign different DDS'
    }

    return 'Confirm DDS'
  }

  if (mode === 'transfer') {
    return "Transfer today's DDS"
  }

  return "Assign today's DDS"
}

function getTitle(mode: SetTodayDdsMode): string {
  if (mode === 'handover') return 'Complete weekly DDS handover'
  if (mode === 'transfer') return "Transfer today's DDS"
  if (mode === 'confirm') return "Confirm today's DDS"
  return "Set today's DDS"
}

function getPickerInstruction(mode: SetTodayDdsMode): string {
  if (mode === 'handover') {
    return 'Choose who should hold DDS now. Override only when operations require it.'
  }

  if (mode === 'transfer') {
    return 'Choose the checked-in DDS-qualified member to receive today’s live DDS.'
  }

  if (mode === 'confirm') {
    return 'Confirm the scheduled member or choose another checked-in DDS-qualified member.'
  }

  return 'Choose a checked-in DDS-qualified member for today.'
}

function getNoteHelper(input: SetTodayDdsModalPresentationInput): string {
  if (input.isHandoverPending || input.isOverrideSelection) {
    return 'Optional note for the duty log (recommended for overrides and handovers).'
  }

  return 'Optional note for the duty log.'
}

function getSummaryLabels(mode: SetTodayDdsMode): {
  currentLabel: string
  targetLabel: string
} {
  if (mode === 'handover') {
    return {
      currentLabel: 'Current live DDS',
      targetLabel: 'Transfer target',
    }
  }

  if (mode === 'confirm') {
    return {
      currentLabel: 'Pending DDS',
      targetLabel: 'Selected DDS',
    }
  }

  if (mode === 'transfer') {
    return {
      currentLabel: 'Current live DDS',
      targetLabel: 'Transfer target',
    }
  }

  return {
    currentLabel: 'Current DDS',
    targetLabel: 'Selected DDS',
  }
}

function getSummaryBadges(
  mode: SetTodayDdsMode,
  input: SetTodayDdsModalPresentationInput
): SummaryBadge[] {
  const badges: SummaryBadge[] = []

  if (mode === 'handover') {
    badges.push({ label: 'Handover pending', tone: 'warning' })
    if (input.handoverFirstOperationalDay) {
      badges.push({
        label: `Since ${formatOperationalDate(input.handoverFirstOperationalDay)}`,
        tone: 'info',
      })
    }
  }

  if (input.hasPendingDds) {
    badges.push({ label: 'Confirmation required', tone: 'warning' })
  }

  if (input.isOverrideSelection) {
    badges.push({ label: 'Override selected', tone: 'info' })
  }

  if (badges.length === 0) {
    badges.push({ label: 'Ready to assign', tone: 'neutral' })
  }

  return badges
}

export function buildSetTodayDdsModalPresentation(
  input: SetTodayDdsModalPresentationInput
): SetTodayDdsModalPresentation {
  const mode = getSetTodayDdsMode(input)
  const hasNoCandidatesBlocker = !input.loadingEligible && input.candidateCount === 0
  const summaryLabels = getSummaryLabels(mode)
  const summaryCurrentMember =
    mode === 'handover'
      ? (input.outgoingHandoverMember ?? input.currentAssignmentMember)
      : input.currentAssignmentMember
  const summaryTargetMember =
    input.selectedMember ?? (mode === 'handover' ? input.selectedScheduledMember : null)

  const checks: RequirementCheck[] = [
    {
      id: 'target-selected',
      label: 'Transfer target selected',
      detail: input.selectedMember
        ? `${formatMemberName(input.selectedMember)} is currently checked in and DDS qualified.`
        : 'Choose a checked-in DDS-qualified member before you continue.',
      state: input.selectedMember ? 'met' : 'missing',
      isBlocking: true,
    },
    {
      id: 'different-from-current',
      label: 'Target differs from current live DDS',
      detail: input.isAlreadyCurrentDds
        ? 'Select a different member to transfer responsibility.'
        : 'Selected member differs from current live DDS.',
      state: input.isAlreadyCurrentDds ? 'missing' : 'met',
      isBlocking: true,
    },
    {
      id: 'scheduled-dds',
      label: 'Scheduled DDS identified',
      detail: input.selectedScheduledMember
        ? formatMemberName(input.selectedScheduledMember)
        : 'No scheduled DDS is available for today.',
      state: input.selectedScheduledMember ? 'met' : 'missing',
      isBlocking: false,
    },
    {
      id: 'building-status',
      label: 'Building status',
      detail:
        input.buildingStatus === 'secured'
          ? 'Building is secured. DDS and lockup alignment will be handled during assignment.'
          : input.buildingStatus === 'locking_up'
            ? 'Building is currently locking up.'
            : 'Building is open for today.',
      state:
        input.buildingStatus === 'open'
          ? 'met'
          : input.buildingStatus === 'locking_up'
            ? 'pending'
            : 'missing',
      isBlocking: false,
    },
    {
      id: 'lockup-holder',
      label: 'Lockup holder status',
      detail: input.currentHolder
        ? `${formatMemberName(input.currentHolder)} currently holds lockup.`
        : 'No lockup holder is currently assigned. Lockup will be aligned automatically.',
      state: input.currentHolder ? 'met' : 'missing',
      isBlocking: false,
    },
  ]

  if (hasNoCandidatesBlocker) {
    checks.unshift({
      id: 'no-candidates',
      label: 'No eligible transfer targets available',
      detail: 'No checked-in DDS-qualified members are available right now.',
      state: 'missing',
      isBlocking: true,
    })
  }

  if ((mode === 'handover' || mode === 'transfer') && !summaryCurrentMember) {
    checks.unshift({
      id: 'current-dds-missing',
      label: 'Current live DDS unavailable',
      detail: 'Refresh status and reopen this modal before transferring responsibility.',
      state: 'missing',
      isBlocking: true,
    })
  }

  const blockers = checks.filter((check) => {
    if (!check.isBlocking || check.state === 'met') return false
    if (hasNoCandidatesBlocker && check.id === 'target-selected') return false
    return true
  })
  const detailsChecks = checks.filter((check) => !check.isBlocking)
  const metChecks = checks.filter((check) => check.state === 'met')

  return {
    mode,
    title: getTitle(mode),
    primaryActionLabel: getPrimaryActionLabel(mode, input),
    primaryActionTone: getPrimaryActionTone(input),
    summaryBadges: getSummaryBadges(mode, input),
    summaryCurrentLabel: summaryLabels.currentLabel,
    summaryCurrentMemberName: formatMemberName(summaryCurrentMember),
    summaryTargetLabel: summaryLabels.targetLabel,
    summaryTargetMemberName: formatMemberName(summaryTargetMember),
    pickerInstruction: getPickerInstruction(mode),
    noteHelper: getNoteHelper(input),
    blockers,
    detailsChecks,
    metChecks,
    canSubmit: blockers.length === 0,
  }
}
