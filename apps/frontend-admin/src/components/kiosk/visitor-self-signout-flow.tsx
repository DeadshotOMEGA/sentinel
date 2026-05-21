'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  buildVisitorEventTabs,
  buildVisitorSignoutGrouping,
  filterVisitorSignoutGroups,
  getPublicVisitorContextLine,
  getPublicVisitorTitle,
  type VisitorSignoutGroupSummary,
} from '@/lib/visitor-signout-grouping'

interface VisitorSelfSignoutFlowProps {
  layout?: 'modal' | 'inline'
  presentation?: 'full' | 'embedded'
  interactionDisabled?: boolean
  showCloseAction?: boolean
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
  presentation = 'full',
  interactionDisabled = false,
  showCloseAction = true,
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
  const [selectedEventTabId, setSelectedEventTabId] = useState<string | null>(null)
  const listScrollRef = useRef<globalThis.HTMLDivElement | null>(null)
  const groupRefs = useRef(new Map<string, globalThis.HTMLDetailsElement>())

  const activeVisitors = useMemo(() => data?.visitors ?? [], [data?.visitors])
  const eventTabs = useMemo(() => buildVisitorEventTabs(activeVisitors), [activeVisitors])
  const visibleVisitors = useMemo(() => {
    if (!selectedEventTabId) return activeVisitors
    return activeVisitors.filter((visitor) => visitor.unitEventId === selectedEventTabId)
  }, [activeVisitors, selectedEventTabId])
  const grouped = useMemo(() => buildVisitorSignoutGrouping(visibleVisitors), [visibleVisitors])
  const filtered = useMemo(() => filterVisitorSignoutGroups(grouped, search), [grouped, search])
  const canInteract =
    !interactionDisabled && !checkoutVisitor.isPending && !checkoutVisitorGroup.isPending
  const isInline = layout === 'inline'
  const isEmbedded = presentation === 'embedded'

  const activeGroupCount = filtered.groups.length
  const activeUngroupedCount = filtered.ungroupedVisitors.length
  const activeVisitorCount = filtered.activeVisitorCount
  const selectedEventTabExists = eventTabs.some((tab) => tab.unitEventId === selectedEventTabId)

  useEffect(() => {
    if (selectedEventTabId && !selectedEventTabExists) {
      setSelectedEventTabId(null)
    }
  }, [selectedEventTabExists, selectedEventTabId])

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

  const scrollExpandedGroupIntoView = (groupId: string) => {
    const container = listScrollRef.current
    const groupElement = groupRefs.current.get(groupId)
    if (!container || !groupElement) {
      groupElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      return
    }

    const containerRect = container.getBoundingClientRect()
    const groupRect = groupElement.getBoundingClientRect()
    const topOverflow = groupRect.top - containerRect.top
    const bottomOverflow = groupRect.bottom - containerRect.bottom
    const padding = 8
    let nextScrollTop = container.scrollTop

    if (groupRect.height > containerRect.height - padding * 2) {
      nextScrollTop += topOverflow - padding
    } else if (topOverflow < 0) {
      nextScrollTop += topOverflow - padding
    } else if (bottomOverflow > 0) {
      nextScrollTop += bottomOverflow + padding
    } else {
      return
    }

    container.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: 'smooth',
    })
  }

  const handleGroupToggle = (groupId: string, nextOpen: boolean) => {
    if (nextOpen) {
      setExpandedGroupId(groupId)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => scrollExpandedGroupIntoView(groupId))
      })
      return
    }

    setExpandedGroupId((current) => (current === groupId ? null : current))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-box border border-base-300 bg-base-200/50 p-(--space-5)">
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
          {showCloseAction ? (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex min-h-0 flex-col gap-(--space-3) ${isInline ? 'h-full' : ''} ${isEmbedded ? 'overflow-hidden' : ''}`}
    >
      {interactionDisabled ? (
        <div className="alert alert-warning">
          <span>Visitor sign-out is temporarily unavailable while services are offline.</span>
        </div>
      ) : null}

      <div className="rounded-box border border-base-300 bg-base-200/50 p-(--space-3)">
        <div className="flex flex-wrap items-center justify-between gap-(--space-3)">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
              Visitor sign-out
            </p>
            <p className="mt-(--space-1) text-base font-semibold leading-tight">
              {activeVisitorCount} active visitor{activeVisitorCount === 1 ? '' : 's'}
            </p>
            <div className="mt-(--space-1) flex flex-wrap gap-(--space-2)">
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
              placeholder="Group code, name, company, event"
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
        <div
          ref={listScrollRef}
          className="min-h-0 flex-1 space-y-(--space-3) overflow-y-auto pr-(--space-1)"
        >
          {eventTabs.length > 0 ? (
            <div
              role="tablist"
              aria-label="Visitor sign-out event filter"
              className="tabs tabs-box bg-base-100"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!selectedEventTabId}
                className={`tab ${!selectedEventTabId ? 'tab-active' : ''}`}
                onClick={() => setSelectedEventTabId(null)}
              >
                All ({activeVisitors.length})
              </button>
              {eventTabs.map((tab) => (
                <button
                  key={tab.unitEventId}
                  type="button"
                  role="tab"
                  aria-selected={selectedEventTabId === tab.unitEventId}
                  title={`${tab.title} (${tab.count})`}
                  className={`tab min-w-0 max-w-64 ${selectedEventTabId === tab.unitEventId ? 'tab-active' : ''}`}
                  onClick={() => setSelectedEventTabId(tab.unitEventId)}
                >
                  <span className="truncate">
                    {tab.title} ({tab.count})
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {activeGroupCount > 0 && (
            <section className="space-y-(--space-1)">
              <p className="text-xs uppercase tracking-[0.18em] text-base-content/55">
                Visitor groups
              </p>
              <div className="space-y-(--space-1)">
                {filtered.groups.map((group) => {
                  const selectedIds = selectedByGroup[group.groupId] ?? []
                  const selectedCount = selectedIds.length
                  const isExpanded = expandedGroupId === group.groupId
                  const accent = GROUP_ACCENT_STYLES[group.accentIndex % GROUP_ACCENT_STYLES.length]

                  return (
                    <details
                      key={group.groupId}
                      ref={(node) => {
                        if (node) {
                          groupRefs.current.set(group.groupId, node)
                        } else {
                          groupRefs.current.delete(group.groupId)
                        }
                      }}
                      open={isExpanded}
                      onToggle={(event) =>
                        handleGroupToggle(group.groupId, event.currentTarget.open)
                      }
                      className={`collapse collapse-arrow border border-base-300 bg-base-100 border-l-4 ${accent.border}`}
                    >
                      <summary className="collapse-title px-(--space-3) py-(--space-2) pr-(--space-4)">
                        <div className="flex flex-wrap items-center justify-between gap-(--space-2)">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-(--space-2)">
                              <Chip variant="faded" color={accent.chipColor} size="sm">
                                {group.groupCode}
                              </Chip>
                              <p className="truncate text-base font-semibold leading-tight">
                                {group.identityTitle}
                              </p>
                            </div>
                            {group.contextLine ? (
                              <p className="mt-0.5 truncate text-sm font-medium text-base-content/75">
                                {compactText(group.contextLine)}
                              </p>
                            ) : null}
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-(--space-2) gap-y-0.5 text-xs text-base-content/60">
                              <span>{group.identityDetail}</span>
                              <span aria-hidden="true">|</span>
                              <Clock3 className="h-3 w-3" />
                              <span>Latest check-in {formatTime(group.mostRecentCheckInTime)}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-xs btn-error"
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

                      <div className="collapse-content border-t border-base-300 bg-base-200/35 px-(--space-3) pb-(--space-3) pt-(--space-2)">
                        <div className="mb-(--space-2) flex flex-wrap gap-(--space-2)">
                          <button
                            type="button"
                            className="btn btn-sm btn-error"
                            disabled={!canInteract || selectedCount === 0}
                            onClick={() => void handleSignoutGroup(group, selectedIds)}
                          >
                            Sign out selected ({selectedCount})
                          </button>
                        </div>

                        <div className="grid gap-(--space-1)">
                          {group.members.map((visitor) => {
                            const inputId = `group-${group.groupId}-${visitor.id}`
                            return (
                              <label
                                key={visitor.id}
                                htmlFor={inputId}
                                className="flex items-start gap-(--space-2) rounded-box border border-base-300 bg-base-100 px-(--space-2) py-(--space-2)"
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
                                  <p className="text-sm font-semibold leading-tight">
                                    {displayName(visitor)}
                                  </p>
                                  <p className="text-xs text-base-content/70">
                                    Checked in {formatTime(visitor.checkInTime)}
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
            <section className="space-y-(--space-1)">
              <p className="text-xs uppercase tracking-[0.18em] text-base-content/55">
                Ungrouped visitors
              </p>
              <div className="grid gap-(--space-1)">
                {filtered.ungroupedVisitors.map((visitor) => (
                  <div
                    key={visitor.id}
                    className="flex flex-wrap items-center justify-between gap-(--space-2) rounded-box border border-base-300 bg-base-100 px-(--space-3) py-(--space-2)"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">
                        {getPublicVisitorTitle(visitor)}
                      </p>
                      <p className="text-xs text-base-content/70">
                        {[
                          getPublicVisitorContextLine(visitor),
                          `Checked in ${formatTime(visitor.checkInTime)}`,
                        ]
                          .filter(Boolean)
                          .join(' | ')}
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

      {showCloseAction ? (
        <div className="mt-auto flex flex-wrap justify-end gap-(--space-2) border-t border-base-300 pt-(--space-3)">
          {busyKey ? <span className="loading loading-spinner loading-sm mr-auto" /> : null}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={!canInteract}
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  )
}
