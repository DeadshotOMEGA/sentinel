'use client'

import { useState } from 'react'
import { Shield, Plus, X, Calendar, AlertCircle, AlertTriangle } from 'lucide-react'
import { LoadingSpinner, ButtonSpinner } from '@/components/ui/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useMemberQualifications,
  useQualificationTypes,
  useGrantQualification,
  useRevokeQualification,
} from '@/hooks/use-qualifications'
import type { MemberResponse } from '@sentinel/contracts'

interface MemberQualificationsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: MemberResponse | null
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString()
}

export function MemberQualificationsModal({
  open,
  onOpenChange,
  member,
}: MemberQualificationsModalProps) {
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false)
  const [revokeQualId, setRevokeQualId] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [grantTypeId, setGrantTypeId] = useState<string>('')
  const [grantExpiration, setGrantExpiration] = useState<string>('')
  const [grantNotes, setGrantNotes] = useState('')

  const { data: qualifications, isLoading: loadingQuals } = useMemberQualifications(
    member?.id || ''
  )
  const { data: qualTypes } = useQualificationTypes()
  const grantQualification = useGrantQualification()
  const revokeQualification = useRevokeQualification()

  const handleGrant = async () => {
    if (!member || !grantTypeId) return

    try {
      await grantQualification.mutateAsync({
        memberId: member.id,
        data: {
          qualificationTypeId: grantTypeId,
          expiresAt: grantExpiration || undefined,
          notes: grantNotes || undefined,
        },
      })
      setIsGrantDialogOpen(false)
      setGrantTypeId('')
      setGrantExpiration('')
      setGrantNotes('')
    } catch (error) {
      console.error('Failed to grant qualification:', error)
    }
  }

  const handleRevoke = async () => {
    if (!member || !revokeQualId) return

    try {
      await revokeQualification.mutateAsync({
        memberId: member.id,
        qualificationId: revokeQualId,
        data: {
          revokeReason: revokeReason || undefined,
        },
      })
      setRevokeQualId(null)
      setRevokeReason('')
    } catch (error) {
      console.error('Failed to revoke qualification:', error)
    }
  }

  // Get qualification types not already granted to member
  const availableTypes = qualTypes?.filter(
    (type) =>
      !qualifications?.data?.some(
        (q) => q.qualificationType.id === type.id && q.status === 'active'
      )
  )

  if (!member) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Qualifications
            </DialogTitle>
            <DialogDescription>
              {member.rank} {member.firstName} {member.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingQuals ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" className="text-base-content/60" />
              </div>
            ) : qualifications?.data?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-base-content/60">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No qualifications assigned</p>
              </div>
            ) : (
              <div className="space-y-2">
                {qualifications?.data?.map((qual) => (
                  <div
                    key={qual.id}
                    className="flex items-center justify-between p-3 bg-base-200/50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`badge ${qual.status === 'active' ? 'badge-primary' : 'badge-secondary'} w-16 justify-center`}
                      >
                        {qual.qualificationType.code}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{qual.qualificationType.name}</p>
                        <div className="flex items-center gap-2 text-xs text-base-content/60">
                          <span>Granted {formatDate(qual.grantedAt)}</span>
                          {qual.expiresAt && (
                            <>
                              <span>|</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Expires {formatDate(qual.expiresAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {qual.status === 'active' && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setRevokeQualId(qual.id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {qual.status !== 'active' && (
                      <span className="badge badge-outline">{qual.status}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t">
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={() => setIsGrantDialogOpen(true)}
                disabled={!availableTypes?.length}
              >
                <Plus className="h-4 w-4 mr-2" />
                Grant Qualification
              </button>
              {!availableTypes?.length && qualTypes?.length && (
                <p className="text-xs text-base-content/60 mt-2">
                  Member has all available qualifications
                </p>
              )}
            </div>

            {/* Missed Checkout Stats */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Checkout Compliance
              </h4>
              <div className="flex items-center gap-4 p-3 bg-base-200/50 rounded-lg border">
                <div className="flex-1">
                  <p className="text-sm text-base-content/60">Missed Checkouts</p>
                  <p className="text-2xl font-bold">{member.missedCheckoutCount ?? 0}</p>
                </div>
                {member.lastMissedCheckout && (
                  <div className="flex-1">
                    <p className="text-sm text-base-content/60">Last Missed</p>
                    <p className="text-sm font-medium">{formatDate(member.lastMissedCheckout)}</p>
                  </div>
                )}
                {(member.missedCheckoutCount ?? 0) > 3 && (
                  <span className="badge badge-error">Attention Required</span>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grant Qualification Dialog */}
      <AlertDialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant Qualification</AlertDialogTitle>
            <AlertDialogDescription>
              Select a qualification to grant to {member.rank} {member.firstName} {member.lastName}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Qualification Type</legend>
              <select
                className="select"
                value={grantTypeId}
                onChange={(e) => setGrantTypeId(e.target.value)}
              >
                <option value="" disabled>
                  Select qualification...
                </option>
                {availableTypes?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.code} - {type.name}
                    {type.canReceiveLockup ? ' (Lockup)' : ''}
                  </option>
                ))}
              </select>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Expiration Date (Optional)</legend>
              <input
                className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                type="date"
                value={grantExpiration}
                onChange={(e) => setGrantExpiration(e.target.value)}
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Notes (Optional)</legend>
              <input
                className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                value={grantNotes}
                onChange={(e) => setGrantNotes(e.target.value)}
                placeholder="Additional notes..."
              />
            </fieldset>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGrant}
              disabled={!grantTypeId || grantQualification.isPending}
            >
              {grantQualification.isPending && <ButtonSpinner />}
              Grant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Qualification Dialog */}
      <AlertDialog open={!!revokeQualId} onOpenChange={() => setRevokeQualId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Qualification?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the qualification from the member. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Reason (Optional)</legend>
              <input
                className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Reason for revocation..."
              />
            </fieldset>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revokeQualification.isPending}
              className="bg-error text-error-content hover:bg-error/90"
            >
              {revokeQualification.isPending && <ButtonSpinner />}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
