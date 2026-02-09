'use client'

import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'

interface PositionDef {
  id: string
  code: string
  name: string
  required: boolean
  maxSlots: number
}

interface SlotEntry {
  id: string
  member: { id: string; firstName: string; lastName: string; rank: string }
  isOverride?: boolean
  overrideType?: 'replace' | 'add' | 'remove'
}

interface DwPositionGridProps {
  positions: PositionDef[]
  slotsByPosition: Record<string, SlotEntry[]>
  canEdit: boolean
  onAssign?: (positionCode: string) => void
  onRemove?: (entryId: string) => void
  isAssigning?: boolean
  isRemoving?: boolean
}

export function DwPositionGrid({
  positions,
  slotsByPosition,
  canEdit,
  onAssign,
  onRemove,
  isAssigning = false,
  isRemoving = false,
}: DwPositionGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {positions.flatMap((position) => {
        const slots = slotsByPosition[position.code] ?? []
        const filledSlots = slots.map((slot, idx) => (
          <div
            key={`${position.code}-${idx}`}
            className={`flex items-center justify-between p-2 bg-base-200/50 rounded-lg border ${
              slot.isOverride ? 'border-accent/40 border-dashed' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <Chip
                variant="flat"
                color={slot.member ? 'primary' : 'default'}
                size="sm"
                className="w-16 justify-center"
              >
                {position.code}
              </Chip>
              <div>
                <p className="font-medium text-sm">
                  {slot.member.rank} {slot.member.firstName} {slot.member.lastName}
                </p>
                {slot.isOverride && slot.overrideType && (
                  <p className="text-xs text-accent">
                    {slot.overrideType === 'replace'
                      ? 'Replacement'
                      : slot.overrideType === 'add'
                        ? 'Added for this night'
                        : 'Removed for this night'}
                  </p>
                )}
              </div>
            </div>
            {canEdit && onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(slot.id)}
                disabled={isRemoving}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))

        const emptySlotCount = Math.max(0, position.maxSlots - slots.length)
        const emptySlots = Array.from({ length: emptySlotCount }, (_, idx) => (
          <div
            key={`${position.code}-empty-${idx}`}
            className="flex items-center justify-between p-2 bg-base-200/50 rounded-lg border"
          >
            <div className="flex items-center gap-3">
              <Chip variant="flat" color="default" size="sm" className="w-16 justify-center">
                {position.code}
              </Chip>
              <div>
                <p className="font-medium text-sm">{position.name}</p>
                <p className="text-xs text-base-content/60">
                  {position.required ? 'Required' : 'Optional'}
                </p>
              </div>
            </div>
            {canEdit && onAssign && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAssign(position.code)}
                disabled={isAssigning}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))

        return [...filledSlots, ...emptySlots]
      })}
    </div>
  )
}
