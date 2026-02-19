'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { useVisitorById, useUpdateVisitor } from '@/hooks/use-visitors'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EditVisitorModalProps {
  visitorId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const VISIT_TYPES = ['guest', 'contractor', 'official', 'other'] as const

export function EditVisitorModal({ visitorId, open, onOpenChange }: EditVisitorModalProps) {
  const { data: visitor, isLoading, isError } = useVisitorById(open ? visitorId : null)
  const updateVisitor = useUpdateVisitor()

  const [name, setName] = useState('')
  const [organization, setOrganization] = useState('')
  const [visitType, setVisitType] = useState<(typeof VISIT_TYPES)[number]>('guest')
  const [visitReason, setVisitReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    if (!visitor) return
    setName(visitor.name ?? '')
    setOrganization(visitor.organization ?? '')
    setVisitType(visitor.visitType)
    setVisitReason(visitor.visitReason ?? '')
    setAdminNotes(visitor.adminNotes ?? '')
  }, [visitor])

  const handleClose = () => onOpenChange(false)

  const handleSave = async () => {
    if (!visitorId) return
    if (!name.trim()) {
      toast.error('Visitor name is required')
      return
    }

    try {
      await updateVisitor.mutateAsync({
        id: visitorId,
        data: {
          name: name.trim(),
          organization: organization.trim() || undefined,
          visitType,
          visitReason: visitReason.trim() || undefined,
          adminNotes: adminNotes.trim() || undefined,
        },
      })
      toast.success('Visitor information updated')
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update visitor'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Visitor
          </DialogTitle>
          <DialogDescription>
            Update visitor details for history and presence records.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 text-sm text-base-content/60">Loading visitor details...</div>
        ) : isError || !visitor ? (
          <div className="alert alert-error">
            <span>Unable to load visitor details</span>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="form-control">
              <span className="label-text font-medium">Name</span>
              <input
                type="text"
                className="input input-bordered"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Visitor name"
              />
            </label>

            <label className="form-control">
              <span className="label-text font-medium">Organization</span>
              <input
                type="text"
                className="input input-bordered"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Organization"
              />
            </label>

            <label className="form-control">
              <span className="label-text font-medium">Visit Type</span>
              <select
                className="select select-bordered"
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as (typeof VISIT_TYPES)[number])}
              >
                {VISIT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text font-medium">Visit Reason</span>
              <textarea
                className="textarea textarea-bordered"
                rows={2}
                value={visitReason}
                onChange={(e) => setVisitReason(e.target.value)}
                placeholder="Purpose of visit"
              />
            </label>

            <label className="form-control">
              <span className="label-text font-medium">Admin Notes</span>
              <textarea
                className="textarea textarea-bordered"
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes"
              />
            </label>
          </div>
        )}

        <DialogFooter>
          <button type="button" className="btn btn-ghost" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isLoading || isError || !visitor || updateVisitor.isPending}
          >
            {updateVisitor.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
