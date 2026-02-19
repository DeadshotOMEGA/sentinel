'use client'

import { useState } from 'react'
import { Clock, ArrowDownCircle, ArrowUpCircle, PanelLeftClose, Pencil, Trash2, Check, X } from 'lucide-react'
import { useRecentActivity, useUpdateCheckin, useDeleteCheckin } from '@/hooks/use-checkins'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import type { RecentActivityItem } from '@sentinel/contracts'
import { TID } from '@/lib/test-ids'
import { formatPersonLabel } from '@/lib/name-format'

interface AppSidebarProps {
  drawerId: string
}

function getOptionalDisplayName(item: RecentActivityItem): string | undefined {
  const value = (item as { displayName?: unknown }).displayName
  return typeof value === 'string' && value.trim() ? value : undefined
}

// ── Inline edit row (dev only, member checkins only) ─────────────────────────

interface EditRowProps {
  item: RecentActivityItem
  onDone: () => void
}

function EditRow({ item, onDone }: EditRowProps) {
  const update = useUpdateCheckin()
  const remove = useDeleteCheckin()

  // Pre-fill time from the existing timestamp (HH:MM in local time)
  const existing = new Date(item.timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  const initialTime = `${pad(existing.getHours())}:${pad(existing.getMinutes())}`
  const [time, setTime] = useState(initialTime)

  const handleSave = async () => {
    const [hours, minutes] = time.split(':').map(Number)
    const updated = new Date(existing)
    updated.setHours(hours, minutes, 0, 0)
    await update.mutateAsync({ id: item.id, data: { timestamp: updated.toISOString() } })
    onDone()
  }

  const handleDelete = async () => {
    await remove.mutateAsync(item.id)
    onDone()
  }

  const busy = update.isPending || remove.isPending

  return (
    <div className="bg-base-100 px-3 py-2 flex flex-col gap-2">
      {/* Time input */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-base-content/50 whitespace-nowrap">Time</label>
        <input
          type="time"
          className="input input-xs input-bordered flex-1"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={busy}
        />
      </div>
      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          type="button"
          className="btn btn-xs btn-success flex-1"
          onClick={handleSave}
          disabled={busy || time === initialTime}
          data-testid={TID.sidebar.saveBtn}
        >
          {update.isPending ? <ButtonSpinner /> : <Check className="h-3 w-3" />}
          Save
        </button>
        <button
          type="button"
          className="btn btn-xs btn-error flex-1"
          onClick={handleDelete}
          disabled={busy}
          data-testid={TID.sidebar.deleteBtn}
        >
          {remove.isPending ? <ButtonSpinner /> : <Trash2 className="h-3 w-3" />}
          Delete
        </button>
        <button
          type="button"
          className="btn btn-xs btn-ghost"
          onClick={onDone}
          disabled={busy}
          data-testid={TID.sidebar.cancelBtn}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {(update.isError || remove.isError) && (
        <p className="text-xs text-error">
          {update.error?.message ?? remove.error?.message}
        </p>
      )}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function AppSidebar({ drawerId }: AppSidebarProps) {
  const { data, isLoading, isError } = useRecentActivity()
  const activities = data?.activities ?? []
  const isDeveloper = useAuthStore((s) => s.hasMinimumLevel(AccountLevel.DEVELOPER))
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="flex min-h-full w-72.5 flex-col bg-base-300 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="font-semibold whitespace-nowrap">Recent Activity</h2>
        </div>
        {/* Close button - visible on desktop */}
        <label
          htmlFor={drawerId}
          aria-label="close sidebar"
          className="btn btn-ghost btn-sm btn-square hidden lg:flex"
          data-tip="Close sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </label>
      </div>

      {/* Error State */}
      {isError && (
        <div className="alert alert-error">
          <span className="text-sm">Failed to load recent activity</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      )}

      {/* Activity List */}
      {!isLoading && !isError && activities.length > 0 && (
        <ul className="menu menu-sm w-full flex-1 gap-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-0">
          {activities.map((item: RecentActivityItem) => {
            const isCheckIn = item.direction === 'in'
            const isVisitor = item.type === 'visitor'
            const isEditing = editingId === item.id
            const Icon = isCheckIn ? ArrowDownCircle : ArrowUpCircle
            const itemDisplayName = formatPersonLabel({
              name: item.name,
              displayName: getOptionalDisplayName(item),
              rank: item.rank,
              compact: true,
            })
            // Visitors don't have a checkin record to edit/delete
            const canEdit = isDeveloper && !isVisitor

            return (
              <li key={`${item.type}-${item.id}-${item.direction}`}>
                {isEditing ? (
                  <EditRow item={item} onDone={() => setEditingId(null)} />
                ) : (
                  <div
                    className={`flex items-start gap-2 bg-base-100 p-3 rounded-none ${canEdit ? 'group' : ''}`}
                  >
                    <Icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${isCheckIn ? 'text-success' : 'text-error'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{itemDisplayName}</div>

                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="text-xs text-base-content/60">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isVisitor && (
                          <span className="badge badge-info badge-sm shrink-0">Visitor</span>
                        )}
                      </div>
                    </div>

                    {/* Dev edit button — visible on hover */}
                    {canEdit && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-1"
                        aria-label="Edit entry"
                        onClick={() => setEditingId(item.id)}
                        data-testid={TID.sidebar.editBtn(item.id)}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Empty State */}
      {!isLoading && !isError && activities.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center text-base-content/60">
          <Clock className="mb-2 h-12 w-12 opacity-20" />
          <p className="text-sm">No recent activity</p>
        </div>
      )}
    </div>
  )
}
