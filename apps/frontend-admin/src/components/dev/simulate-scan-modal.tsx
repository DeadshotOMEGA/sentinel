'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Radio, CheckCircle, LogIn, LogOut, Shield, Trash2 } from 'lucide-react'
import { LoadingSpinner, ButtonSpinner } from '@/components/ui/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDevMembers, useMockScan, useClearAllCheckins, LockupHeldError } from '@/hooks/use-dev'
import { useCheckoutOptions } from '@/hooks/use-lockup'
import { useDdsStatus } from '@/hooks/use-dds'
import { LockupOptionsModal } from '@/components/lockup/lockup-options-modal'
import { DevToolsPanel } from '@/components/dev/dev-tools-panel'
import { apiClient } from '@/lib/api-client'
import type { MockScanResponse, DevMember, CheckoutOptionsResponse } from '@sentinel/contracts'

interface SimulateScanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ModalStep = 'pick-member' | 'kiosk-result'

export function SimulateScanModal({ open, onOpenChange }: SimulateScanModalProps) {
  const [step, setStep] = useState<ModalStep>('pick-member')
  const [search, setSearch] = useState('')
  const [scanResult, setScanResult] = useState<MockScanResponse | null>(null)
  const [showLockupOptions, setShowLockupOptions] = useState(false)
  const [ddsHandled, setDdsHandled] = useState(false)
  const [lockupBlockedMember, setLockupBlockedMember] = useState<DevMember | null>(null)

  const { data: membersData, isLoading: loadingMembers } = useDevMembers()
  const mockScan = useMockScan()
  const clearAll = useClearAllCheckins()
  const { data: ddsData } = useDdsStatus()

  const presentCount = membersData?.members.filter((m) => m.isPresent).length ?? 0

  // Checkout options for the scanned member (only when checking out)
  const scannedMemberId =
    scanResult?.direction === 'out' ? scanResult.member.id : (lockupBlockedMember?.id ?? '')
  const { data: checkoutOptions, isLoading: loadingCheckoutOptions } =
    useCheckoutOptions(scannedMemberId)

  // Accept DDS mutation
  const queryClient = useQueryClient()
  const acceptDds = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiClient.dds.acceptDds({
        params: { id: memberId },
      })
      if (response.status !== 200) {
        throw new Error('Failed to accept DDS')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dds-status'] })
      queryClient.invalidateQueries({ queryKey: ['lockup-status'] })
      queryClient.invalidateQueries({ queryKey: ['eligible-openers'] })
    },
  })

  // Filter members by search
  const filteredMembers = membersData?.members.filter((m) => {
    if (!search) return true
    const query = search.toLowerCase()
    return (
      m.firstName.toLowerCase().includes(query) ||
      m.lastName.toLowerCase().includes(query) ||
      m.rank.toLowerCase().includes(query) ||
      m.division.toLowerCase().includes(query)
    )
  })

  // Check if scanned member is today's DDS and hasn't accepted yet
  const isDdsPending =
    scanResult?.direction === 'in' &&
    ddsData?.assignment &&
    ddsData.assignment.memberId === scanResult.member.id &&
    ddsData.assignment.status === 'pending' &&
    !ddsHandled

  // Auto-dismiss timer for confirmation screens
  useEffect(() => {
    if (step !== 'kiosk-result' || !scanResult) return
    // Don't auto-dismiss if DDS prompt or lockup options are showing
    if (isDdsPending) return
    if (scanResult.direction === 'out' && loadingCheckoutOptions) return
    if (scanResult.direction === 'out' && checkoutOptions?.holdsLockup) return

    const timer = setTimeout(() => {
      resetAndClose()
    }, 3000)

    return () => clearTimeout(timer)
  }, [step, scanResult, isDdsPending, loadingCheckoutOptions, checkoutOptions])

  const resetAndClose = useCallback(() => {
    setStep('pick-member')
    setSearch('')
    setScanResult(null)
    setShowLockupOptions(false)
    setDdsHandled(false)
    setLockupBlockedMember(null)
  }, [])

  const handleClose = () => {
    resetAndClose()
    onOpenChange(false)
  }

  const handleScan = async (member: DevMember) => {
    if (!member.badgeSerialNumber) return

    try {
      const result = await mockScan.mutateAsync({
        serialNumber: member.badgeSerialNumber,
        kioskId: 'dev-mock-scanner',
      })
      setScanResult(result)
      setStep('kiosk-result')
    } catch (error) {
      if (error instanceof LockupHeldError) {
        // Backend blocked checkout — member holds lockup
        // Show lockup options modal (triggered by effect once checkoutOptions loads)
        setLockupBlockedMember(member)
      } else {
        console.error('Mock scan failed:', error)
      }
    }
  }

  const handleAcceptDds = async () => {
    if (!scanResult) return
    try {
      await acceptDds.mutateAsync(scanResult.member.id)
      setDdsHandled(true)
    } catch (error) {
      console.error('Failed to accept DDS:', error)
    }
  }

  const handleSkipDds = () => {
    setDdsHandled(true)
  }

  const handleBackToList = () => {
    resetAndClose()
  }

  // When checkout options load and member holds lockup, show lockup modal
  useEffect(() => {
    if (
      checkoutOptions?.holdsLockup &&
      !checkoutOptions.canCheckout &&
      (lockupBlockedMember || scanResult?.direction === 'out')
    ) {
      setShowLockupOptions(true)
    }
  }, [scanResult, checkoutOptions, lockupBlockedMember])

  const handleLockupComplete = (action: 'transfer' | 'execute') => {
    const member = lockupBlockedMember
    setShowLockupOptions(false)
    setLockupBlockedMember(null)

    if (member && action === 'transfer') {
      // After transfer, member still needs checkout — re-scan to create the record
      handleScan(member)
    } else {
      // After execute, member was already checked out by bulk checkout
      setTimeout(() => {
        resetAndClose()
      }, 2000)
    }
  }

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleTimeString('en-CA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          {step === 'pick-member' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  Simulate Badge Scan
                </DialogTitle>
                <DialogDescription>
                  Select a member to simulate an RFID badge scan
                </DialogDescription>
              </DialogHeader>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/60 pointer-events-none" />
                <input
                  type="text"
                  className="input input-neutral w-full pl-10"
                  placeholder="Search by name, rank, or division..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Present count + Clear All */}
              {presentCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-base-content/60">{presentCount} currently checked in</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error"
                    disabled={clearAll.isPending}
                    onClick={() => clearAll.mutate()}
                  >
                    {clearAll.isPending ? (
                      <LoadingSpinner size="xs" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Clear All
                  </button>
                </div>
              )}

              {/* Dev Tools Panel */}
              <DevToolsPanel />

              {/* Member List */}
              <div className="overflow-y-auto flex-1 min-h-0 -mx-6">
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="md" className="text-base-content/60" />
                  </div>
                ) : filteredMembers?.length === 0 ? (
                  <div className="text-center py-8 text-base-content/60">
                    <p>No members found</p>
                  </div>
                ) : (
                  <ul className="list">
                    {filteredMembers?.map((member) => {
                      const hasBadge = !!member.badgeSerialNumber
                      const disabled = !hasBadge || mockScan.isPending
                      return (
                        <li
                          key={member.id}
                          role="button"
                          tabIndex={disabled ? -1 : 0}
                          aria-disabled={disabled}
                          className={`list-row transition-colors ${
                            disabled
                              ? 'opacity-40 cursor-not-allowed'
                              : 'cursor-pointer hover:bg-base-200/60'
                          }`}
                          onClick={() => !disabled && handleScan(member)}
                          onKeyDown={(e) => {
                            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault()
                              handleScan(member)
                            }
                          }}
                        >
                          {/* Status dot */}
                          <div className="flex items-center">
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${
                                member.isPresent ? 'bg-success' : 'bg-base-300'
                              }`}
                            />
                          </div>

                          {/* Member info (grows) */}
                          <div>
                            <div className="font-medium">
                              {member.rank} {member.lastName}, {member.firstName}
                            </div>
                            <div className="text-xs opacity-60">{member.division}</div>
                          </div>

                          {/* Badge serial + status */}
                          <div className="flex items-center gap-2">
                            {hasBadge ? (
                              <span className="text-xs opacity-60 font-mono">
                                {member.badgeSerialNumber!.slice(-6)}
                              </span>
                            ) : (
                              <span className="text-xs opacity-40">No badge</span>
                            )}
                            {member.isPresent ? (
                              <span className="badge badge-success badge-sm">IN</span>
                            ) : (
                              <span className="badge badge-ghost badge-sm">OUT</span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Scanning indicator */}
              {mockScan.isPending && (
                <div className="flex items-center gap-2 text-sm text-base-content/60 pt-2">
                  <LoadingSpinner size="sm" />
                  Scanning...
                </div>
              )}
            </>
          )}

          {step === 'kiosk-result' && scanResult && (
            <KioskPreview
              scanResult={scanResult}
              isDdsPending={!!isDdsPending}
              ddsHandled={ddsHandled}
              acceptingDds={acceptDds.isPending}
              onAcceptDds={handleAcceptDds}
              onSkipDds={handleSkipDds}
              onBack={handleBackToList}
              formatTimestamp={formatTimestamp}
              loadingCheckout={loadingCheckoutOptions}
              checkoutOptions={checkoutOptions ?? null}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Lockup Options Modal (renders on top) */}
      {(scanResult || lockupBlockedMember) && checkoutOptions && (
        <LockupOptionsModal
          open={showLockupOptions}
          onOpenChange={(open) => {
            setShowLockupOptions(open)
            if (!open) setLockupBlockedMember(null)
          }}
          memberId={scanResult?.member.id ?? lockupBlockedMember?.id ?? ''}
          memberName={
            scanResult
              ? `${scanResult.member.rank} ${scanResult.member.firstName} ${scanResult.member.lastName}`
              : lockupBlockedMember
                ? `${lockupBlockedMember.rank} ${lockupBlockedMember.firstName} ${lockupBlockedMember.lastName}`
                : ''
          }
          checkoutOptions={checkoutOptions}
          onCheckoutComplete={handleLockupComplete}
        />
      )}
    </>
  )
}

// ============================================================================
// Kiosk Preview Sub-component
// ============================================================================

interface KioskPreviewProps {
  scanResult: MockScanResponse
  isDdsPending: boolean
  ddsHandled: boolean
  acceptingDds: boolean
  onAcceptDds: () => void
  onSkipDds: () => void
  onBack: () => void
  formatTimestamp: (ts: string) => string
  loadingCheckout: boolean
  checkoutOptions: CheckoutOptionsResponse | null
}

function KioskPreview({
  scanResult,
  isDdsPending,
  ddsHandled,
  acceptingDds,
  onAcceptDds,
  onSkipDds,
  onBack,
  formatTimestamp,
  loadingCheckout,
  checkoutOptions,
}: KioskPreviewProps) {
  const { direction, member, timestamp } = scanResult
  const fullName = `${member.rank} ${member.firstName} ${member.lastName}`
  const isIn = direction === 'in'

  // Loading state for checkout options
  if (!isIn && loadingCheckout) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" className="text-base-content/60" />
      </div>
    )
  }

  // Checkout with lockup — LockupOptionsModal handles this, show brief message
  if (!isIn && checkoutOptions?.holdsLockup && !checkoutOptions.canCheckout) {
    return (
      <div className="py-6 text-center">
        <Shield className="h-8 w-8 mx-auto mb-3 text-warning" />
        <p className="font-medium">{fullName}</p>
        <p className="text-sm text-base-content/60 mt-1">Holds lockup — handling...</p>
      </div>
    )
  }

  // DDS acceptance prompt (check-in only)
  if (isIn && isDdsPending && !ddsHandled) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-info">
            <Shield className="h-5 w-5" />
            Duty Staff Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-info/10 mb-4">
            <Shield className="h-8 w-8 text-info" />
          </div>
          <p className="text-lg font-medium">{fullName}</p>
          <p className="text-base-content/60 mt-2">You are assigned as Duty Staff today</p>
        </div>

        <div className="flex gap-3">
          <button type="button" className="btn btn-outline btn-md flex-1" onClick={onSkipDds}>
            Skip
          </button>
          <button
            type="button"
            className="btn btn-primary btn-md flex-1"
            onClick={onAcceptDds}
            disabled={acceptingDds}
          >
            {acceptingDds && <ButtonSpinner />}
            Accept DDS
          </button>
        </div>
      </>
    )
  }

  // Standard check-in/check-out confirmation
  return (
    <>
      <DialogHeader>
        <DialogTitle className={`flex items-center gap-2 ${isIn ? 'text-success' : 'text-info'}`}>
          <CheckCircle className="h-5 w-5" />
          {isIn ? 'Checked In' : 'Checked Out'}
        </DialogTitle>
      </DialogHeader>

      <div className="py-6 text-center">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            isIn ? 'bg-success/10' : 'bg-info/10'
          }`}
        >
          {isIn ? (
            <LogIn className="h-8 w-8 text-success" />
          ) : (
            <LogOut className="h-8 w-8 text-info" />
          )}
        </div>
        <p className="text-lg font-medium">
          {isIn ? 'Welcome' : 'Goodbye'}, {fullName}
        </p>
        <p className="text-base-content/60 mt-1">
          Checked {isIn ? 'IN' : 'OUT'} at {formatTimestamp(timestamp)}
        </p>
        {ddsHandled && <p className="text-sm text-success mt-2">DDS accepted</p>}
      </div>

      <button type="button" className="btn btn-outline btn-md w-full" onClick={onBack}>
        Scan Another
      </button>
    </>
  )
}
