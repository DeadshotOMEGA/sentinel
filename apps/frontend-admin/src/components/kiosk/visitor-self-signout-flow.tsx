'use client'

import { useMemo, useState } from 'react'
import { Clock3, Layers3, UserRoundMinus, Users } from 'lucide-react'
import {
  useActiveVisitors,
  useCheckoutVisitor,
  useCheckoutVisitorGroup,
} from '@/hooks/use-visitors'
import { Chip } from '@/components/ui/chip'
import type { VisitorResponse } from '@sentinel/contracts'
import type { VisitorSelfSigninCompletion } from '@/components/kiosk/visitor-self-signin-flow'
import {
  buildVisitorSignoutGrouping,
  filterVisitorSignoutGroups,
  type VisitorSignoutGroupSummary,
} from '@/lib/visitor-signout-grouping'

interface VisitorSelfSignoutFlowProps {
  layout?: 'modal' | 'inline'
  onCancel: () => void
  onComplete?: (completion: VisitorSelfSigninCompletion) => void
}

const GROUP_ACCENT_STYLES = [
  { border: 'border-l-primary', chipColor: 'primary' as const },
  { border: 'border-l-secondary', chipColor: 'secondary' as const },
  { border: 'border-l-accent', chipColor: 'accent' as const },
  { border: 'border-l-info', chipColor: 'info' as const },
  { border: 'border-l-success', chipColor: 'success' as const },
  { border: 'border-l-warning', chipColor: 'warning' as const },
]

function compactText(value: string, maxLength = 100): string {
  const trimmed = value.trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function displayName(visitor: VisitorResponse): string {
  return visitor.displayName || visitor.name
}

export function VisitorSelfSignoutFlow({
  layout = 'inline',
  onCancel,
  onComplete,
}: VisitorSelfSignoutFlowProps) {
  const { data, isLoading, isError, refetch } = useActiveVisitors()
  const checkoutVisitor = useCheckoutVisitor()
  const checkoutVisitorGroup = useCheckoutVisitorGroup()
  const [search, setSearch] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({})
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  const activeVisitors = data?.visitors ?? []
  const grouped = useMemo(() => buildVisitorSignoutGrouping(activeVisitors), [activeVisitors])
  const filtered = useMemo(() => filterVisitorSignoutGroups(grouped, search), [grouped, search])
  const canInteract = !checkoutVisitor.isPending && !checkoutVisitorGroup.isPending
  const isInline = layout === 'inline'

  const activeGroupCount = filtered.groups.length
  const activeUngroupedCount = filtered.ungroupedVisitors.length
  const activeVisitorCount = filtered.activeVisitorCount

  const complete = (title: string, message: string) => {
    onComplete?.({
      title,
      message,
      actionLabel: 'Done',
    })
  }

  const handleGroupSelectionToggle = (groupId: string, memberId: string) => {
    setSelectedByGroup((previous) => {
      const current = new Set(previous[groupId] ?? [])
      if (current.has(memberId)) {
        current.delete(memberId)
      } else {
        current.add(memberId)
      }

      return {
        ...previous,
        [groupId]: Array.from(current),
      }
    })
  }

  const handleSignoutVisitor = async (visitor: VisitorResponse) => {
    setSubmitError(null)
    setBusyKey(`visitor:${visitor.id}`)
    try {
      await checkoutVisitor.mutateAsync(visitor.id)
      complete('Visitor signed out', `${displayName(visitor)} has been checked out.`)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to sign out visitor')
    } finally {
      setBusyKey(null)
    }
  }

  const handleSignoutGroup = async (group: VisitorSignoutGroupSummary, memberIds?: string[]) => {
    setSubmitError(null)
    const memberScoped = Boolean(memberIds && memberIds.length > 0)
    setBusyKey(memberScoped ? `group-selected:${group.groupId}` : `group-all:${group.groupId}`)
    try {
      const response = await checkoutVisitorGroup.mutateAsync({
        groupId: group.groupId,
        memberIds,
      })
      if (memberScoped) {
        setSelectedByGroup((previous) => ({ ...previous, [group.groupId]: [] }))
      }
      complete('Visitor group signed out', response.message)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to sign out visitor group')
    } finally {
      setBusyKey(null)
    }
  }

  const handleGroupToggle = (groupId: string, nextOpen: boolean) => {
    if (nextOpen) {
      setExpandedGroupId(groupId)
      return
    }

    setExpandedGroupId((current) => (current === groupId ? null : current))
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-box border border-base-300 bg-base-200/50 p-(--space-5)">
        <span className="loading loading-spinner loading-md" />
        <span className="ml-(--space-3) text-sm">Loading grouped visitor sign-out list…</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-(--space-4)">
        <div className="alert alert-error">
          <span>Unable to load active visitors for grouped sign-out.</span>
        </div>
        <div className="flex gap-(--space-2)">
          <button type="button" className="btn btn-outline" onClick={() => void refetch()}>
            Retry
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex min-h-0 flex-col gap-(--space-4) ${isInline ? 'h-full' : ''}`}>
      <div className="rounded-box border border-base-300 bg-base-200/50 p-(--space-4)">
        <div className="flex flex-wrap items-center justify-between gap-(--space-3)">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
              Visitor sign-out
            </p>
            <p className="mt-(--space-1) text-lg font-semibold leading-tight">
              {activeVisitorCount} active visitor{activeVisitorCount === 1 ? '' : 's'}
            </p>
            <div className="mt-(--space-2) flex flex-wrap gap-(--space-2)">
              <Chip variant="faded" color="secondary" size="sm">
                <Layers3 className="h-3.5 w-3.5" />
                {activeGroupCount} group{activeGroupCount === 1 ? '' : 's'}
              </Chip>
              <Chip variant="faded" color="neutral" size="sm">
                <Users className="h-3.5 w-3.5" />
                {activeUngroupedCount} ungrouped
              </Chip>
            </div>
          </div>
          <label className="input input-bordered input-sm w-full sm:w-80">
            <span className="label">Search</span>
            <input
              type="text"
              className="grow"
              placeholder="Group code, name, company, reason"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={!canInteract}
            />
          </label>
        </div>
      </div>

      {submitError && <div className="alert alert-error">{submitError}</div>}

      {activeVisitorCount === 0 ? (
        <div className="rounded-box border border-base-300 bg-base-100 p-(--space-6) text-center">
          <Users className="mx-auto h-8 w-8 text-base-content/50" />
          <p className="mt-(--space-3) text-lg font-semibold">No active visitors</p>
          <p className="mt-(--space-1) text-sm text-base-content/70">
            There are no active visitor records available for sign-out.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-(--space-4) overflow-y-auto pr-(--space-1)">
          {activeGroupCount > 0 && (
            <section className="space-y-(--space-2)">
              <p className="text-xs uppercase tracking-[0.18em] text-base-content/55">
                Visitor groups
              </p>
              <div className="space-y-(--space-2)">
                {filtered.groups.map((group) => {
                  const selectedIds = selectedByGroup[group.groupId] ?? []
                  const selectedCount = selectedIds.length
                  const isExpanded = expandedGroupId === group.groupId
                  const accent = GROUP_ACCENT_STYLES[group.accentIndex % GROUP_ACCENT_STYLES.length]

                  return (
                    <details
                      key={group.groupId}
                      open={isExpanded}
                      onToggle={(event) =>
                        handleGroupToggle(group.groupId, event.currentTarget.open)
                      }
                      className={`collapse collapse-arrow border border-base-300 bg-base-100 border-l-4 ${accent.border}`}
                    >
                      <summary className="collapse-title pr-(--space-4)">
                        <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-(--space-2)">
                              <Chip variant="faded" color={accent.chipColor} size="sm">
                                {group.groupCode}
                              </Chip>
                              <p className="truncate text-lg font-semibold">
                                {group.identityTitle}
                              </p>
                            </div>
                            <p className="mt-(--space-1) text-sm text-base-content/70">
                              {group.identityDetail}
                            </p>
                            <p className="mt-(--space-1) truncate text-sm text-base-content/60">
                              {compactText(group.contextLine)}
                            </p>
                            <p className="mt-(--space-1) flex items-center gap-(--space-1) text-xs text-base-content/55">
                              <Clock3 className="h-3 w-3" />
                              Latest check-in {formatTime(group.mostRecentCheckInTime)}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-error"
                            disabled={!canInteract}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleSignoutGroup(group)
                            }}
                          >
                            Sign out full group
                          </button>
                        </div>
                      </summary>

                      <div className="collapse-content border-t border-base-300 bg-base-200/35 pt-(--space-3)">
                        <div className="mb-(--space-3) flex flex-wrap gap-(--space-2)">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            disabled={!canInteract || selectedCount === 0}
                            onClick={() => void handleSignoutGroup(group, selectedIds)}
                          >
                            Sign out selected ({selectedCount})
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-error"
                            disabled={!canInteract}
                            onClick={() => void handleSignoutGroup(group)}
                          >
                            Sign out full group
                          </button>
                        </div>

                        <div className="grid gap-(--space-2)">
                          {group.members.map((visitor) => {
                            const inputId = `group-${group.groupId}-${visitor.id}`
                            return (
                              <label
                                key={visitor.id}
                                htmlFor={inputId}
                                className="flex items-start gap-(--space-3) rounded-box border border-base-300 bg-base-100 px-(--space-3) py-(--space-2)"
                              >
                                <input
                                  id={inputId}
                                  type="checkbox"
                                  className="checkbox checkbox-sm mt-1"
                                  checked={selectedIds.includes(visitor.id)}
                                  onChange={() =>
                                    handleGroupSelectionToggle(group.groupId, visitor.id)
                                  }
                                  disabled={!canInteract}
                                />
                                <div className="min-w-0">
                                  <p className="font-semibold leading-tight">
                                    {displayName(visitor)}
                                  </p>
                                  <p className="text-sm text-base-content/70">
                                    Checked in {formatTime(visitor.checkInTime)}
                                    {visitor.organization ? ` • ${visitor.organization}` : ''}
                                  </p>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </details>
                  )
                })}
              </div>
            </section>
          )}

          {activeUngroupedCount > 0 && (
            <section className="space-y-(--space-2)">
              <p className="text-xs uppercase tracking-[0.18em] text-base-content/55">
                Ungrouped visitors
              </p>
              <div className="grid gap-(--space-2)">
                {filtered.ungroupedVisitors.map((visitor) => (
                  <div
                    key={visitor.id}
                    className="flex flex-wrap items-center justify-between gap-(--space-3) rounded-box border border-base-300 bg-base-100 p-(--space-3)"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{displayName(visitor)}</p>
                      <p className="text-sm text-base-content/70">
                        Checked in {formatTime(visitor.checkInTime)}
                        {visitor.organization ? ` • ${visitor.organization}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-error"
                      disabled={!canInteract}
                      onClick={() => void handleSignoutVisitor(visitor)}
                    >
                      <UserRoundMinus className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap justify-end gap-(--space-2) border-t border-base-300 pt-(--space-3)">
        {busyKey ? <span className="loading loading-spinner loading-sm mr-auto" /> : null}
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={!canInteract}>
          Close
        </button>
      </div>
    </div>
  )
}
