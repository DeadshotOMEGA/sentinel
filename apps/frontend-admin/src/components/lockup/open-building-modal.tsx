'use client'

import { useState, useMemo } from 'react'
import { DoorOpen, Search, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useOpenBuilding, useEligibleOpeners } from '@/hooks/use-lockup'

interface SelectedMember {
  id: string
  firstName: string
  lastName: string
  rank: string
}

interface OpenBuildingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OpenBuildingModal({ open, onOpenChange }: OpenBuildingModalProps) {
  const [openBuildingNote, setOpenBuildingNote] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<SelectedMember | null>(null)

  const { data: eligibleOpeners, isLoading: isLoadingOpeners } = useEligibleOpeners()
  const openBuildingMutation = useOpenBuilding()

  const filteredOpeners = useMemo(() => {
    if (!eligibleOpeners) return []
    if (!memberSearch.trim()) return eligibleOpeners
    const searchLower = memberSearch.toLowerCase()
    return eligibleOpeners.filter(
      (m) =>
        m.firstName.toLowerCase().includes(searchLower) ||
        m.lastName.toLowerCase().includes(searchLower) ||
        m.rank.toLowerCase().includes(searchLower) ||
        m.serviceNumber.toLowerCase().includes(searchLower)
    )
  }, [eligibleOpeners, memberSearch])

  const handleOpenBuilding = () => {
    if (!selectedMember) return
    openBuildingMutation.mutate(
      {
        memberId: selectedMember.id,
        data: openBuildingNote ? { note: openBuildingNote } : undefined,
      },
      {
        onSuccess: () => {
          handleClose()
        },
      }
    )
  }

  const handleClose = () => {
    onOpenChange(false)
    setOpenBuildingNote('')
    setMemberSearch('')
    setSelectedMember(null)
  }

  const handleSelectMember = (member: SelectedMember) => {
    setSelectedMember(member)
    setMemberSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5" />
            Open Building
          </DialogTitle>
          <DialogDescription>
            Select who is opening the building. They will become the lockup holder for today.
          </DialogDescription>
        </DialogHeader>

        {/* Member selector */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Opening Member</span>
          </label>

          {selectedMember ? (
            <div className="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
              <div className="flex-1">
                <span className="font-medium">
                  {selectedMember.rank} {selectedMember.firstName} {selectedMember.lastName}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => setSelectedMember(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/50" />
                <input
                  type="text"
                  className="input input-bordered w-full pl-10"
                  placeholder="Search by name, rank, or service number..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>

              {/* Search results dropdown */}
              {memberSearch.trim() && (
                <div className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {isLoadingOpeners ? (
                    <div className="p-3 text-center">
                      <span
                        className="loading loading-spinner loading-sm"
                        role="status"
                        aria-label="Loading"
                      ></span>
                    </div>
                  ) : filteredOpeners.length === 0 ? (
                    <div className="p-3 text-center text-base-content/60">
                      No eligible members found
                    </div>
                  ) : (
                    filteredOpeners.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className="w-full p-3 text-left hover:bg-base-200 transition-colors border-b border-base-200 last:border-b-0"
                        onClick={() => handleSelectMember(member)}
                      >
                        <div className="font-medium">
                          {member.rank} {member.firstName} {member.lastName}
                        </div>
                        <div className="text-sm text-base-content/60">{member.serviceNumber}</div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Show all eligible when not searching */}
              {!memberSearch.trim() && eligibleOpeners && eligibleOpeners.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-base-200 rounded-lg">
                  {eligibleOpeners.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="w-full p-3 text-left hover:bg-base-200 transition-colors border-b border-base-200 last:border-b-0"
                      onClick={() => handleSelectMember(member)}
                    >
                      <div className="font-medium">
                        {member.rank} {member.firstName} {member.lastName}
                      </div>
                      <div className="text-sm text-base-content/60">{member.serviceNumber}</div>
                    </button>
                  ))}
                </div>
              )}

              {!memberSearch.trim() && eligibleOpeners && eligibleOpeners.length === 0 && (
                <div className="mt-2 p-3 text-center text-warning bg-warning/10 rounded-lg">
                  No eligible members checked in with lockup qualification
                </div>
              )}
            </div>
          )}
        </div>

        {/* Note field */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Note (optional)</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="e.g., Alarm disarmed, rounds complete"
            value={openBuildingNote}
            onChange={(e) => setOpenBuildingNote(e.target.value)}
          />
        </div>

        {openBuildingMutation.isError && (
          <div className="alert alert-error mt-4">
            <span>{openBuildingMutation.error.message}</span>
          </div>
        )}

        <DialogFooter>
          <button className="btn" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn btn-success"
            disabled={!selectedMember || openBuildingMutation.isPending}
            onClick={handleOpenBuilding}
          >
            {openBuildingMutation.isPending ? (
              <span
                className="loading loading-spinner loading-sm"
                role="status"
                aria-label="Loading"
              ></span>
            ) : (
              <DoorOpen className="h-4 w-4" />
            )}
            Confirm Open
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
