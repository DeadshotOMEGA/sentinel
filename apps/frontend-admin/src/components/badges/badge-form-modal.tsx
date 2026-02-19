'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useCreateBadge, useUpdateBadge } from '@/hooks/use-badges'
import { useMembers } from '@/hooks/use-members'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
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

export function BadgeFormModal({ open, onOpenChange, mode, badge }: BadgeFormModalProps) {
  const createBadge = useCreateBadge()
  const updateBadge = useUpdateBadge()
  const { data: membersData, isLoading: isMembersLoading } = useMembers({
    limit: 500,
    status: 'active',
  })

  const [serialNumber, setSerialNumber] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'lost' | 'damaged'>('active')
  const [assignmentType, setAssignmentType] = useState<'unassigned' | 'member'>('unassigned')
  const [assignedToId, setAssignedToId] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'edit' && badge) {
      setSerialNumber(badge.serialNumber)
      setStatus((badge.status as 'active' | 'inactive' | 'lost' | 'damaged') || 'active')
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
    setError(null)
  }, [mode, badge, open])

  const isSubmitting = createBadge.isPending || updateBadge.isPending

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
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Serial Number</legend>
            <input
              className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
              id="badge-serial-number"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. A1B2C3D4"
              data-testid={TID.badges.form.serialNumber}
              required
            />
            {isSerialInvalid && (
              <span className="label text-base-content/60">
                Enter a badge serial number to continue.
              </span>
            )}
          </fieldset>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Status</legend>
              <select
                id="badge-status"
                className="select"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'active' | 'inactive' | 'lost' | 'damaged')
                }
                data-testid={TID.badges.form.status}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="lost">Lost</option>
                <option value="damaged">Damaged</option>
              </select>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Assignment Type</legend>
              <select
                id="badge-assignment"
                className="select"
                value={assignmentType}
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
            </fieldset>
          </div>

          {assignmentType === 'member' && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Assigned Member</legend>
              <input
                id="badge-member-filter"
                type="text"
                className="input input-bordered w-full mb-2"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Filter members by name..."
                data-testid={TID.badges.form.memberSearch}
              />
              <select
                id="badge-assigned-member"
                className="select w-full"
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                data-testid={TID.badges.form.assignedTo}
                required
              >
                <option value="">Select a member...</option>
                {memberOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName ?? `${member.rank} ${member.lastName}, ${member.firstName}`}{' '}
                    ({member.serviceNumber})
                  </option>
                ))}
              </select>
              {!isMembersLoading && memberOptions.length === 0 && (
                <span className="label text-base-content/60">No members match that name.</span>
              )}
              {isMemberAssignmentInvalid && (
                <span className="label text-base-content/60">
                  Select an assigned member to enable saving.
                </span>
              )}
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
    </Dialog>
  )
}
