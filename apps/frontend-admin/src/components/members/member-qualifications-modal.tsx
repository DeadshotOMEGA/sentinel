'use client'

import { useState } from 'react'
import { Shield, Plus, X, Loader2, Calendar, AlertCircle, AlertTriangle } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const availableTypes = qualTypes?.data?.filter(
    (type) =>
      !qualifications?.data?.some(
        (q) => q.qualificationType.id === type.id && q.status === 'active'
      )
  )

  if (!member) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
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
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : qualifications?.data?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No qualifications assigned</p>
              </div>
            ) : (
              <div className="space-y-2">
                {qualifications?.data?.map((qual) => (
                  <div
                    key={qual.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={qual.status === 'active' ? 'default' : 'secondary'}
                        className="w-16 justify-center"
                      >
                        {qual.qualificationType.code}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">
                          {qual.qualificationType.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevokeQualId(qual.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {qual.status !== 'active' && (
                      <Badge variant="outline">{qual.status}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t">
              <Button
                onClick={() => setIsGrantDialogOpen(true)}
                disabled={!availableTypes?.length}
              >
                <Plus className="h-4 w-4 mr-2" />
                Grant Qualification
              </Button>
              {!availableTypes?.length && qualTypes?.data?.length && (
                <p className="text-xs text-muted-foreground mt-2">
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
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Missed Checkouts</p>
                  <p className="text-2xl font-bold">
                    {member.missedCheckoutCount ?? 0}
                  </p>
                </div>
                {member.lastMissedCheckout && (
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Last Missed</p>
                    <p className="text-sm font-medium">
                      {formatDate(member.lastMissedCheckout)}
                    </p>
                  </div>
                )}
                {(member.missedCheckoutCount ?? 0) > 3 && (
                  <Badge variant="destructive">Attention Required</Badge>
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
              Select a qualification to grant to {member.rank} {member.firstName}{' '}
              {member.lastName}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Qualification Type</Label>
              <Select value={grantTypeId} onValueChange={setGrantTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select qualification..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {type.code}
                        </Badge>
                        <span>{type.name}</span>
                        {type.canReceiveLockup && (
                          <Badge variant="secondary" className="text-xs">
                            Lockup
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expiration Date (Optional)</Label>
              <Input
                type="date"
                value={grantExpiration}
                onChange={(e) => setGrantExpiration(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input
                value={grantNotes}
                onChange={(e) => setGrantNotes(e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGrant}
              disabled={!grantTypeId || grantQualification.isPending}
            >
              {grantQualification.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
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
              This will revoke the qualification from the member. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label>Reason (Optional)</Label>
            <Input
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Reason for revocation..."
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revokeQualification.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeQualification.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
