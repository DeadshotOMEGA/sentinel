'use client'

import { useState, useMemo } from 'react'
import { UserPlus, Users, FileText, Lock, Radio, DoorOpen, Search, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { ManualCheckinModal } from '@/components/checkins/manual-checkin-modal'
import { ExecuteLockupModal } from '@/components/lockup/execute-lockup-modal'
import { VisitorSigninModal } from '@/components/visitors/visitor-signin-modal'
import { SimulateScanModal } from '@/components/dev/simulate-scan-modal'
import { useLockupStatus, useOpenBuilding, useEligibleOpeners } from '@/hooks/use-lockup'

interface SelectedMember {
  id: string
  firstName: string
  lastName: string
  rank: string
}

export function QuickActionButtons() {
  const user = useAuthStore((state) => state.user)
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false)
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false)
  const [isLockupModalOpen, setIsLockupModalOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const [isOpenBuildingConfirmOpen, setIsOpenBuildingConfirmOpen] = useState(false)
  const [openBuildingNote, setOpenBuildingNote] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<SelectedMember | null>(null)
  const isDevMode = process.env.NODE_ENV === 'development'

  const { data: lockupStatus } = useLockupStatus()
  const { data: eligibleOpeners, isLoading: isLoadingOpeners } = useEligibleOpeners()
  const openBuildingMutation = useOpenBuilding()
  const currentHolder = lockupStatus?.currentHolder
  const buildingStatus = lockupStatus?.buildingStatus

  // Check user role for permissions
  const canManualCheckin = user?.role && ['developer', 'admin', 'duty_watch'].includes(user.role)
  const isAdmin = user?.role && ['developer', 'admin'].includes(user.role)

  // Context-sensitive lockup button logic
  const isSecured = buildingStatus === 'secured'
  const isOpenWithHolder = buildingStatus === 'open' && !!currentHolder
  const isOpenNoHolder = buildingStatus === 'open' && !currentHolder

  // Filter eligible openers based on search
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
      { memberId: selectedMember.id, data: openBuildingNote ? { note: openBuildingNote } : undefined },
      {
        onSuccess: () => {
          setIsOpenBuildingConfirmOpen(false)
          setOpenBuildingNote('')
          setMemberSearch('')
          setSelectedMember(null)
        },
      }
    )
  }

  const handleCloseDialog = () => {
    setIsOpenBuildingConfirmOpen(false)
    setOpenBuildingNote('')
    setMemberSearch('')
    setSelectedMember(null)
  }

  const handleSelectMember = (member: SelectedMember) => {
    setSelectedMember(member)
    setMemberSearch('')
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        className="btn btn-primary"
        disabled={!canManualCheckin}
        onClick={() => setIsCheckinModalOpen(true)}
      >
        <UserPlus className="h-4 w-4" />
        Manual Check-in
      </button>

      <button
        className="btn btn-primary"
        disabled={!canManualCheckin}
        onClick={() => setIsVisitorModalOpen(true)}
      >
        <Users className="h-4 w-4" />
        Visitor Sign-in
      </button>

      <button
        className="btn btn-primary"
        onClick={() => {
          // TODO: Navigate to reports
          console.log('Reports clicked')
        }}
      >
        <FileText className="h-4 w-4" />
        Reports
      </button>

      {isSecured ? (
        <button
          className="btn btn-success"
          disabled={!isAdmin}
          onClick={() => setIsOpenBuildingConfirmOpen(true)}
        >
          <DoorOpen className="h-4 w-4" />
          Open Building
        </button>
      ) : (
        <button
          className="btn btn-secondary"
          disabled={!isAdmin || isOpenNoHolder}
          onClick={() => setIsLockupModalOpen(true)}
        >
          <Lock className="h-4 w-4" />
          Execute Lockup
        </button>
      )}

      {isDevMode && (
        <button
          className="btn btn-accent"
          onClick={() => setIsScanModalOpen(true)}
        >
          <Radio className="h-4 w-4" />
          Simulate Scan
        </button>
      )}

      <ManualCheckinModal open={isCheckinModalOpen} onOpenChange={setIsCheckinModalOpen} />
      <VisitorSigninModal open={isVisitorModalOpen} onOpenChange={setIsVisitorModalOpen} />
      {isOpenWithHolder && currentHolder && (
        <ExecuteLockupModal
          open={isLockupModalOpen}
          onOpenChange={setIsLockupModalOpen}
          memberId={currentHolder.id}
          memberName={`${currentHolder.rank} ${currentHolder.firstName} ${currentHolder.lastName}`}
          onComplete={() => setIsLockupModalOpen(false)}
        />
      )}
      {isDevMode && (
        <SimulateScanModal open={isScanModalOpen} onOpenChange={setIsScanModalOpen} />
      )}

      {/* Open Building confirmation dialog */}
      <dialog className={`modal ${isOpenBuildingConfirmOpen ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">Open Building</h3>
          <p className="py-4">
            Select who is opening the building. They will become the lockup holder for today.
          </p>

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
                        <span className="loading loading-spinner loading-sm"></span>
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
                          <div className="text-sm text-base-content/60">
                            {member.serviceNumber}
                          </div>
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
                        <div className="text-sm text-base-content/60">
                          {member.serviceNumber}
                        </div>
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

          <div className="modal-action">
            <button className="btn" onClick={handleCloseDialog}>
              Cancel
            </button>
            <button
              className="btn btn-success"
              disabled={!selectedMember || openBuildingMutation.isPending}
              onClick={handleOpenBuilding}
            >
              {openBuildingMutation.isPending ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <DoorOpen className="h-4 w-4" />
              )}
              Confirm Open
            </button>
          </div>
          {openBuildingMutation.isError && (
            <div className="alert alert-error mt-4">
              <span>{openBuildingMutation.error.message}</span>
            </div>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleCloseDialog}>close</button>
        </form>
      </dialog>
    </div>
  )
}
