'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateBadge, useUpdateBadge } from '@/hooks/use-badges'
import { useMembers } from '@/hooks/use-members'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { SetPinModal } from '@/components/members/set-pin-modal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TID } from '@/lib/test-ids'
import type {
  BadgeWithAssignmentResponse,
  CreateBadgeInput,
  UpdateBadgeInput,
} from '@sentinel/contracts'

interface BadgeFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  badge?: BadgeWithAssignmentResponse
}

type BadgeLifecycleStatus = 'active' | 'inactive' | 'lost' | 'damaged' | 'decommissioned'

export function BadgeFormModal({ open, onOpenChange, mode, badge }: BadgeFormModalProps) {
  const queryClient = useQueryClient()
  const createBadge = useCreateBadge()
  const updateBadge = useUpdateBadge()
  const { data: membersData, isLoading: isMembersLoading } = useMembers({
    limit: 500,
    status: 'active',
    scope: 'all',
  })

  const [serialNumber, setSerialNumber] = useState('')
  const [status, setStatus] = useState<BadgeLifecycleStatus>('active')
  const [assignmentType, setAssignmentType] = useState<'unassigned' | 'member'>('unassigned')
  const [assignedToId, setAssignedToId] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'edit' && badge) {
      setSerialNumber(badge.serialNumber)
      setStatus((badge.status as BadgeLifecycleStatus) || 'active')
      if (badge.assignmentType === 'member') {
        setAssignmentType('member')
        setAssignedToId(badge.assignedToId ?? '')
      } else {
        setAssignmentType('unassigned')
        setAssignedToId('')
      }
      setMemberSearch('')
      return
    }

    setSerialNumber('')
    setStatus('active')
    setAssignmentType('unassigned')
    setAssignedToId('')
    setMemberSearch('')
    setPinModalOpen(false)
    setError(null)
  }, [mode, badge, open])

  const isSubmitting = createBadge.isPending || updateBadge.isPending
  const isDecommissioned = status === 'decommissioned'

  const memberOptions = useMemo(() => {
    const members = [...(membersData?.members ?? [])]
    const search = memberSearch.trim().toLowerCase()

    members.sort((a, b) => {
      const lastNameSort = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' })
      if (lastNameSort !== 0) return lastNameSort
      return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' })
    })

    if (!search) {
      return members
    }

    return members.filter((member) => {
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
      const reverseName = `${member.lastName}, ${member.firstName}`.toLowerCase()
      return fullName.includes(search) || reverseName.includes(search)
    })
  }, [membersData, memberSearch])

  const selectedMember = useMemo(
    () => membersData?.members.find((member) => member.id === assignedToId),
    [assignedToId, membersData?.members]
  )

  const isMemberAssignmentInvalid = assignmentType === 'member' && !assignedToId
  const isSerialInvalid = !serialNumber.trim()
  const isSubmitDisabled =
    isSubmitting || isMemberAssignmentInvalid || (mode === 'create' && isSerialInvalid)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    try {
      if (mode === 'create') {
        const data: CreateBadgeInput = {
          serialNumber: serialNumber.trim(),
          status,
          assignmentType,
          assignedToId: assignmentType === 'member' ? assignedToId : undefined,
        }
        await createBadge.mutateAsync(data)
      } else if (badge) {
        const data: UpdateBadgeInput = {
          serialNumber: serialNumber.trim(),
          status,
          assignmentType,
          assignedToId: assignmentType === 'member' ? assignedToId : null,
        }
        await updateBadge.mutateAsync({ id: badge.id, data })
      }

      onOpenChange(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save badge')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" testId={TID.badges.form.modal}>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New Badge' : 'Edit Badge'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Register a new badge and optionally assign it to a member.'
              : 'Update badge details and assignment.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="input input-bordered w-full">
            <span className="label">Serial Number</span>
            <input
              className="grow disabled:opacity-50 disabled:cursor-not-allowed"
              id="badge-serial-number"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. A1B2C3D4"
              data-testid={TID.badges.form.serialNumber}
              required
            />
          </label>
          {isSerialInvalid && (
            <span className="label text-base-content/60">
              Enter a badge serial number to continue.
            </span>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="select w-full">
              <span className="label">Status</span>
              <select
                id="badge-status"
                value={status}
                onChange={(e) => {
                  const nextStatus = e.target.value as BadgeLifecycleStatus
                  setStatus(nextStatus)
                  if (nextStatus === 'decommissioned') {
                    setAssignmentType('unassigned')
                    setAssignedToId('')
                    setMemberSearch('')
                  }
                }}
                data-testid={TID.badges.form.status}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="lost">Lost</option>
                <option value="damaged">Damaged</option>
                <option value="decommissioned">Decommissioned</option>
              </select>
            </label>

            <fieldset className="fieldset">
              <label className="select w-full">
                <span className="label">Assignment Type</span>
                <select
                  id="badge-assignment"
                  value={assignmentType}
                  disabled={isDecommissioned}
                  onChange={(e) => {
                    const value = e.target.value as 'member' | 'unassigned'
                    setAssignmentType(value)
                    if (value !== 'member') {
                      setAssignedToId('')
                      setMemberSearch('')
                    }
                  }}
                  data-testid={TID.badges.form.assignmentType}
                >
                  <option value="unassigned">Unassigned</option>
                  <option value="member">Member</option>
                </select>
              </label>
              {isDecommissioned && (
                <span className="label text-base-content/60">
                  Decommissioned badges stay unassigned and hidden from normal operations.
                </span>
              )}
            </fieldset>
          </div>

          {assignmentType === 'member' && !isDecommissioned && (
            <fieldset className="fieldset">
              <label className="input input-bordered w-full mb-2">
                <span className="label">Member Search</span>
                <input
                  id="badge-member-filter"
                  type="text"
                  className="grow"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Filter members by name..."
                  data-testid={TID.badges.form.memberSearch}
                />
              </label>
              <label className="select w-full">
                <span className="label">Assigned Member</span>
                <select
                  id="badge-assigned-member"
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  data-testid={TID.badges.form.assignedTo}
                  required
                >
                  <option value="">Select a member...</option>
                  {memberOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName ??
                        `${member.rank} ${member.lastName}, ${member.firstName}`}{' '}
                      ({member.serviceNumber})
                    </option>
                  ))}
                </select>
              </label>
              {!isMembersLoading && memberOptions.length === 0 && (
                <span className="label text-base-content/60">No members match that name.</span>
              )}
              {isMemberAssignmentInvalid && (
                <span className="label text-base-content/60">
                  Select an assigned member to enable saving.
                </span>
              )}

              <div className="mt-(--space-3) rounded-box border border-base-300 p-(--space-3)">
                <div className="flex items-center justify-between gap-(--space-2)">
                  <p className="text-sm font-medium">PIN setup</p>
                  <span
                    className={`badge ${
                      selectedMember?.mustChangePin ? 'badge-warning' : 'badge-success'
                    }`}
                  >
                    {selectedMember
                      ? selectedMember.mustChangePin
                        ? 'PIN setup required'
                        : 'PIN configured'
                      : 'No member selected'}
                  </span>
                </div>

                {selectedMember?.mustChangePin && (
                  <p className="mt-(--space-2) text-sm text-warning">
                    This member currently requires PIN setup/change.
                  </p>
                )}
                {!selectedMember && (
                  <p className="mt-(--space-2) text-sm text-base-content/70">
                    Select a member to enable PIN setup before saving this badge assignment.
                  </p>
                )}

                <button
                  type="button"
                  className={`mt-(--space-2) btn btn-sm ${
                    selectedMember?.mustChangePin ? 'btn-warning' : 'btn-primary'
                  }`}
                  disabled={!selectedMember}
                  onClick={() => setPinModalOpen(true)}
                >
                  Setup PIN
                </button>
              </div>
            </fieldset>
          )}

          {error && (
            <div role="alert" className="alert alert-error">
              <div className="text-sm">{error}</div>
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              className="btn btn-outline btn-md"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              data-testid={TID.badges.form.cancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={isSubmitDisabled}
              data-testid={TID.badges.form.submit}
            >
              {isSubmitting && <ButtonSpinner />}
              {mode === 'create' ? 'Create Badge' : 'Save Changes'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
      {selectedMember && (
        <SetPinModal
          open={pinModalOpen}
          onOpenChange={setPinModalOpen}
          memberId={selectedMember.id}
          memberName={`${selectedMember.rank} ${selectedMember.lastName}`.trim()}
          onSuccess={async () => {
            await queryClient.invalidateQueries({ queryKey: ['members'] })
          }}
        />
      )}
    </Dialog>
  )
}
