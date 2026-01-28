/**
 * Lockup System Types
 *
 * Types for managing the building lockup responsibility, transfers, and execution.
 */

// ============================================================================
// Lockup Status (Daily State)
// ============================================================================

export type BuildingStatus = 'secured' | 'open' | 'locking_up'

export interface LockupStatus {
  id: string
  date: Date // Operational date (3am rollover)
  currentHolderId: string | null
  acquiredAt: Date | null
  buildingStatus: BuildingStatus
  securedAt: Date | null
  securedBy: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface LockupStatusWithHolder extends LockupStatus {
  currentHolder: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  } | null
  securedByMember?: {
    id: string
    firstName: string
    lastName: string
    rank: string
  } | null
}

export interface LockupStatusWithHistory extends LockupStatusWithHolder {
  transfers: LockupTransferWithMembers[]
  execution: LockupExecutionWithMember | null
}

// ============================================================================
// Lockup Transfer (Handoffs)
// ============================================================================

export type TransferReason = 'manual' | 'dds_handoff' | 'duty_watch_takeover'

export interface LockupTransfer {
  id: string
  lockupStatusId: string
  fromMemberId: string
  toMemberId: string
  transferredAt: Date
  reason: TransferReason
  notes: string | null
  createdAt: Date
}

export interface LockupTransferWithMembers extends LockupTransfer {
  fromMember: {
    id: string
    firstName: string
    lastName: string
    rank: string
  }
  toMember: {
    id: string
    firstName: string
    lastName: string
    rank: string
  }
}

export interface TransferLockupInput {
  fromMemberId: string
  toMemberId: string
  reason?: TransferReason
  notes?: string | null
}

// ============================================================================
// Lockup Execution (End of Day)
// ============================================================================

export interface CheckedOutEntity {
  id: string
  name: string
  type?: 'member' | 'visitor'
}

export interface LockupExecution {
  id: string
  lockupStatusId: string
  executedBy: string
  executedAt: Date
  membersCheckedOut: CheckedOutEntity[]
  visitorsCheckedOut: CheckedOutEntity[]
  totalCheckedOut: number
  notes: string | null
  createdAt: Date
}

export interface LockupExecutionWithMember extends LockupExecution {
  executedByMember: {
    id: string
    firstName: string
    lastName: string
    rank: string
  }
}

export interface ExecuteLockupInput {
  executedBy: string
  notes?: string | null
  forceCheckoutMemberIds?: string[]
  forceCheckoutVisitorIds?: string[]
}

// ============================================================================
// Missed Checkout (Tracking)
// ============================================================================

export type MissedCheckoutResolvedBy = 'lockup_sequence' | 'admin' | 'daily_reset'

export interface MissedCheckout {
  id: string
  memberId: string
  date: Date
  originalCheckinAt: Date
  forcedCheckoutAt: Date
  resolvedBy: MissedCheckoutResolvedBy
  resolvedByAdminId: string | null
  lockupExecutionId: string | null
  notes: string | null
  createdAt: Date
}

export interface MissedCheckoutWithDetails extends MissedCheckout {
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }
  resolvedByAdmin?: {
    id: string
    displayName: string
  } | null
}

// ============================================================================
// Checkout Options (Kiosk Flow)
// ============================================================================

export interface CheckoutOptions {
  memberId: string
  holdsLockup: boolean
  canCheckout: boolean
  options: ('normal' | 'lockup' | 'transfer')[]
  message?: string
}

export interface BuildingPresence {
  membersCheckedIn: Array<{
    id: string
    firstName: string
    lastName: string
    rank: string
    checkinTime: Date
  }>
  visitorsCheckedIn: Array<{
    id: string
    name: string
    organization: string | null
    checkinTime: Date
  }>
  totalCount: number
}

// ============================================================================
// Lockup History
// ============================================================================

export interface LockupHistoryEntry {
  type: 'transfer' | 'execution'
  timestamp: Date
  details: LockupTransferWithMembers | LockupExecutionWithMember
}

export interface LockupHistory {
  date: Date
  status: LockupStatusWithHolder
  entries: LockupHistoryEntry[]
}

// ============================================================================
// Current Lockup State (Dashboard)
// ============================================================================

export interface CurrentLockupState {
  date: Date
  holder: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  } | null
  buildingStatus: BuildingStatus
  acquiredAt: Date | null
  transferCount: number
  lastTransfer: LockupTransferWithMembers | null
}
