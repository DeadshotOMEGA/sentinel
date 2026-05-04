'use client'

import { useMemo, useState } from 'react'
import { Users, UserRoundMinus } from 'lucide-react'
import {
  useActiveVisitors,
  useCheckoutVisitor,
  useCheckoutVisitorGroup,
} from '@/hooks/use-visitors'
import type { VisitorResponse } from '@sentinel/contracts'
import type { VisitorSelfSigninCompletion } from '@/components/kiosk/visitor-self-signin-flow'

interface VisitorSelfSignoutFlowProps {
  layout?: 'modal' | 'inline'
  onCancel: () => void
  onComplete?: (completion: VisitorSelfSigninCompletion) => void
}

interface VisitorGroupSummary {
  groupId: string
  members: VisitorResponse[]
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

  const activeVisitors = data?.visitors ?? []
  const normalizedSearch = search.trim().toLowerCase()

  const grouped = useMemo(() => {
    const groupMap = new Map<string, VisitorResponse[]>()
    const soloVisitors: VisitorResponse[] = []

    for (const visitor of activeVisitors) {
      if (!visitor.visitorGroupId) {
        soloVisitors.push(visitor)
        continue
      }

      const existing = groupMap.get(visitor.visitorGroupId)
      if (existing) {
        existing.push(visitor)
      } else {
        groupMap.set(visitor.visitorGroupId, [visitor])
      }
    }

    const groups: VisitorGroupSummary[] = Array.from(groupMap.entries())
      .map(([groupId, members]) => ({
        groupId,
        members: [...members].sort((a, b) => a.checkInTime.localeCompare(b.checkInTime)),
      }))
      .sort((a, b) => b.members[0]!.checkInTime.localeCompare(a.members[0]!.checkInTime))

    const ungroupedVisitors = [...soloVisitors].sort((a, b) =>
      b.checkInTime.localeCompare(a.checkInTime)
    )

    return { groups, ungroupedVisitors }
  }, [activeVisitors])

  const filtered = useMemo(() => {
    if (!normalizedSearch) {
      return grouped
    }

    const searchMatch = (visitor: VisitorResponse): boolean => {
      const haystack =
        `${displayName(visitor)} ${visitor.organization ?? ''} ${visitor.visitType} ${visitor.visitReason ?? ''}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    }

    return {
      groups: grouped.groups.filter((group) => group.members.some(searchMatch)),
      ungroupedVisitors: grouped.ungroupedVisitors.filter(searchMatch),
    }
  }, [grouped, normalizedSearch])

  const isInline = layout === 'inline'
  const canInteract = !checkoutVisitor.isPending && !checkoutVisitorGroup.isPending

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

  const handleSignoutGroup = async (group: VisitorGroupSummary, memberIds?: string[]) => {
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-box border border-base-300 bg-base-200/50 p-(--space-5)">
        <span className="loading loading-spinner loading-md" />
        <span className="ml-(--space-3) text-sm">Loading active visitors…</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-(--space-4)">
        <div className="alert alert-error">
          <span>Unable to load active visitors for sign-out.</span>
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

  const activeCount =
    filtered.groups.reduce((sum, group) => sum + group.members.length, 0) +
    filtered.ungroupedVisitors.length

  return (
    <div className={`flex min-h-0 flex-col gap-(--space-4) ${isInline ? 'h-full' : ''}`}>
      <div className="rounded-box border border-base-300 bg-base-200/50 p-(--space-4)">
        <div className="flex flex-wrap items-center justify-between gap-(--space-3)">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
              Visitor sign-out
            </p>
            <p className="mt-(--space-1) text-lg font-semibold leading-tight">
              {activeCount} active visitor{activeCount === 1 ? '' : 's'}
            </p>
          </div>
          <label className="input input-bordered input-sm w-full sm:w-72">
            <span className="label">Search</span>
            <input
              type="text"
              className="grow"
              placeholder="Name, company, reason"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={!canInteract}
            />
          </label>
        </div>
      </div>

      {submitError && <div className="alert alert-error">{submitError}</div>}

      {activeCount === 0 ? (
        <div className="rounded-box border border-base-300 bg-base-100 p-(--space-6) text-center">
          <Users className="mx-auto h-8 w-8 text-base-content/50" />
          <p className="mt-(--space-3) text-lg font-semibold">No active visitors</p>
          <p className="mt-(--space-1) text-sm text-base-content/70">
            There are no active visitor records available for sign-out.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-(--space-3) overflow-y-auto pr-(--space-1)">
          {filtered.groups.map((group) => {
            const selectedIds = selectedByGroup[group.groupId] ?? []
            const selectedCount = selectedIds.length
            return (
              <div
                key={group.groupId}
                className="rounded-box border border-base-300 bg-base-100 p-(--space-4)"
              >
                <div className="flex flex-wrap items-center justify-between gap-(--space-3)">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                      Group
                    </p>
                    <p className="text-lg font-semibold">
                      {group.members.length} member{group.members.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-(--space-2)">
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
                </div>

                <div className="mt-(--space-3) grid gap-(--space-2)">
                  {group.members.map((visitor) => {
                    const inputId = `group-${group.groupId}-${visitor.id}`
                    return (
                      <label
                        key={visitor.id}
                        htmlFor={inputId}
                        className="flex items-start gap-(--space-3) rounded-box border border-base-300 bg-base-200/40 p-(--space-3)"
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          className="checkbox checkbox-sm mt-1"
                          checked={selectedIds.includes(visitor.id)}
                          onChange={() => handleGroupSelectionToggle(group.groupId, visitor.id)}
                          disabled={!canInteract}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight">{displayName(visitor)}</p>
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
            )
          })}

          {filtered.ungroupedVisitors.map((visitor) => (
            <div
              key={visitor.id}
              className="flex flex-wrap items-center justify-between gap-(--space-3) rounded-box border border-base-300 bg-base-100 p-(--space-4)"
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
