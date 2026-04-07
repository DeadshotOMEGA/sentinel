/* global process */
'use client'

import { useState, useMemo, useTransition, useRef, useEffect, useCallback } from 'react'
import { UsersRound, Search, Radio } from 'lucide-react'
import { usePresentPeople } from '@/hooks/use-present-people'
import { useCheckoutVisitor } from '@/hooks/use-visitors'
import { useDdsStatus } from '@/hooks/use-dds'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { SimulateScanModal } from '@/components/dev/simulate-scan-modal'
import {
  MemberActionPanel,
  type MemberActionDrawerSide,
  type MemberActionView,
} from './member-action-panel'
import { PersonCard } from './person-card'
import type { PresentPerson } from '@sentinel/contracts'
import { TID } from '@/lib/test-ids'
import { MotionButton } from '@/components/ui/motion-button'
import { isSentinelBootstrapServiceNumber } from '@/lib/system-bootstrap'
import { cn } from '@/lib/utils'

type FilterType = 'all' | 'member' | 'visitor'

export function PersonCardGrid() {
  const { data, isLoading, isError } = usePresentPeople()
  const { data: ddsStatus } = useDdsStatus()
  const checkoutVisitor = useCheckoutVisitor()
  const member = useAuthStore((state) => state.member)
  const canCheckout = (member?.accountLevel ?? 0) >= AccountLevel.QUARTERMASTER
  const isDevMode = process.env.NODE_ENV === 'development'
  const isSentinelSystem = isSentinelBootstrapServiceNumber(member?.serviceNumber)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [selectedMemberActionView, setSelectedMemberActionView] = useState<MemberActionView>('menu')
  const [selectedMemberActionSide, setSelectedMemberActionSide] =
    useState<MemberActionDrawerSide>('right')
  const [isPending, startTransition] = useTransition()

  // Current DDS member ID (only when assignment is active/pending)
  const ddsMemberId = ddsStatus?.assignment?.memberId ?? null

  const selectedMember =
    data?.people.find(
      (person): person is PresentPerson =>
        person.type === 'member' && person.id === selectedMemberId
    ) ?? null

  const closeSelectedMemberActions = useCallback(() => {
    setSelectedMemberId(null)
    setSelectedMemberActionView('menu')
  }, [])

  const handleFilterChange = (newFilter: FilterType) => {
    startTransition(() => setFilter(newFilter))
  }

  const handleCheckoutVisitor = useCallback(
    async (visitorId: string) => {
      try {
        await checkoutVisitor.mutateAsync(visitorId)
      } catch (error) {
        console.error('Failed to sign out visitor:', error)
      }
    },
    [checkoutVisitor]
  )

  const filteredPeople = useMemo(() => {
    if (!data?.people) return []

    let people = [...data.people]

    // Filter by type
    if (filter !== 'all') {
      people = people.filter((p) => p.type === filter)
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase()
      people = people.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.division?.toLowerCase().includes(q) ||
          p.organization?.toLowerCase().includes(q) ||
          p.rank?.toLowerCase().includes(q)
      )
    }

    // Sort: visitors first, then members by rank (senior first), then by check-in time
    people.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'visitor' ? -1 : 1
      }
      // For members, sort by rank (higher displayOrder = more senior = first)
      if (a.type === 'member' && b.type === 'member') {
        const rankA = a.rankSortOrder ?? 0
        const rankB = b.rankSortOrder ?? 0
        if (rankA !== rankB) return rankB - rankA
      }
      return new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
    })

    return people
  }, [data?.people, filter, search])

  const memberCount = useMemo(
    () => data?.people?.filter((p) => p.type === 'member').length ?? 0,
    [data?.people]
  )
  const visitorCount = useMemo(
    () => data?.people?.filter((p) => p.type === 'visitor').length ?? 0,
    [data?.people]
  )

  // Track whether initial animation has played to prevent replay on data updates
  const hasAnimated = useRef(false)
  useEffect(() => {
    if (filteredPeople.length > 0) hasAnimated.current = true
  }, [filteredPeople.length])

  // Force re-render every 60s to keep relative timestamps fresh
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedMemberId && !selectedMember) {
      closeSelectedMemberActions()
    }
  }, [closeSelectedMemberActions, selectedMember, selectedMemberId])

  useEffect(() => {
    if (selectedMemberId && !filteredPeople.some((person) => person.id === selectedMemberId)) {
      closeSelectedMemberActions()
    }
  }, [closeSelectedMemberActions, filteredPeople, selectedMemberId])

  useEffect(() => {
    if (!selectedMemberId) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSelectedMemberActions()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeSelectedMemberActions, selectedMemberId])

  if (isError) {
    return (
      <div className="bg-base-100 p-6 border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UsersRound size={32} strokeWidth={1} className="text-error" />
          <h2 className="text-lg font-display font-semibold">Presence</h2>
        </div>
        <p className="text-sm text-error">Failed to load presence data</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-base-100 p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <UsersRound size={32} strokeWidth={1} />
          <h2 className="text-lg font-display font-semibold">Presence</h2>
        </div>
        <SkeletonGrid />
      </div>
    )
  }

  return (
    <div
      className="presence-section p-3 sm:p-4 shadow-md animate-fade-in"
      data-help-id="dashboard.presence"
    >
      {/* Header */}
      <div
        className="flex flex-wrap items-start justify-between gap-3 mb-3 pb-3 presence-section-header -mx-3 px-3 sm:-mx-4 sm:px-4 -mt-3 sm:-mt-4 pt-3"
        data-help-id="dashboard.presence.filters"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10">
            <UsersRound size={24} strokeWidth={1.5} className="text-primary" />
          </div>
          <h2 className="text-lg font-display font-semibold tracking-tight">Presence</h2>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap gap-1">
            <MotionButton
              className={`btn btn-xs ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              aria-pressed={filter === 'all'}
              onClick={() => handleFilterChange('all')}
            >
              All ({data?.total ?? 0})
            </MotionButton>
            <MotionButton
              className={`btn btn-xs ${filter === 'member' ? 'btn-success' : 'btn-ghost'}`}
              aria-pressed={filter === 'member'}
              onClick={() => handleFilterChange('member')}
            >
              Members ({memberCount})
            </MotionButton>
            <MotionButton
              className={`btn btn-xs ${filter === 'visitor' ? 'btn-info' : 'btn-ghost'}`}
              aria-pressed={filter === 'visitor'}
              onClick={() => handleFilterChange('visitor')}
            >
              Visitors ({visitorCount})
            </MotionButton>
          </div>
          {(isDevMode || isSentinelSystem) && (
            <MotionButton
              className="btn btn-xs btn-ghost border-base-300 text-base-content/70 hover:text-base-content"
              onClick={() => setIsScanModalOpen(true)}
              data-testid={TID.dashboard.quickAction.simulateScan}
            >
              <Radio className="size-[1em] shrink-0" />
              Simulate Scan
            </MotionButton>
          )}
          <div className="relative w-full sm:w-auto">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40"
            />
            <input
              type="text"
              placeholder="Search..."
              aria-label="Search people"
              className="input input-bordered input-sm pl-8 w-full sm:w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-help-id="dashboard.presence.search"
            />
          </div>
        </div>
      </div>

      {(isDevMode || isSentinelSystem) && (
        <SimulateScanModal open={isScanModalOpen} onOpenChange={setIsScanModalOpen} />
      )}

      <div
        className={cn(
          'drawer presence-member-drawer overflow-visible',
          selectedMember && 'drawer-open'
        )}
        data-open={selectedMember ? 'true' : 'false'}
        data-side={selectedMemberActionSide}
      >
        <input
          type="checkbox"
          className="drawer-toggle"
          checked={Boolean(selectedMember)}
          readOnly
          aria-hidden="true"
        />

        <div className="drawer-content min-w-0">
          <div className="presence-card-grid-shell" aria-live="polite" aria-atomic="false">
            {filteredPeople.length > 0 ? (
              <div
                className={`grid gap-3 presence-card-grid transition-opacity duration-200 ${isPending ? 'opacity-60 blur-[1px]' : ''}`}
              >
                {filteredPeople.map((person: PresentPerson, index: number) => (
                  <div
                    key={`${person.type}-${person.id}`}
                    className={`relative h-full min-w-0${person.type === 'member' && person.id === selectedMemberId ? ' z-(--z-dropdown)' : ''}${hasAnimated.current ? '' : ' animate-fade-in-up'}`}
                    style={
                      hasAnimated.current
                        ? undefined
                        : {
                            animationDelay: `${Math.min(index, 12) * 50}ms`,
                            animationFillMode: 'backwards',
                          }
                    }
                  >
                    <PersonCard
                      person={person}
                      dutyPosition={
                        person.type === 'member'
                          ? (person.liveDutyAssignment?.dutyPosition.code ??
                            person.scheduledDutyTonight?.dutyPosition?.code ??
                            null)
                          : null
                      }
                      isDds={person.type === 'member' && person.id === ddsMemberId}
                      isSelected={person.type === 'member' && person.id === selectedMemberId}
                      onCheckoutVisitor={canCheckout ? handleCheckoutVisitor : undefined}
                      onSelectMember={
                        person.type === 'member'
                          ? (selectedPerson, sideHint) => {
                              if (selectedMemberId === selectedPerson.id) {
                                closeSelectedMemberActions()
                                return
                              }

                              const visibleMembers = filteredPeople.filter(
                                (candidate): candidate is PresentPerson & { type: 'member' } =>
                                  candidate.type === 'member'
                              )
                              const memberIndex = visibleMembers.findIndex(
                                (candidate) => candidate.id === selectedPerson.id
                              )
                              const midpoint = Math.ceil(visibleMembers.length / 2)
                              const resolvedSide =
                                memberIndex >= 0
                                  ? memberIndex < midpoint
                                    ? 'right'
                                    : 'left'
                                  : sideHint

                              setSelectedMemberActionSide(resolvedSide)
                              setSelectedMemberId(selectedPerson.id)
                              setSelectedMemberActionView('menu')
                            }
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-base-content/50">
                <UsersRound size={32} strokeWidth={1} className="mb-2" />
                <p className="text-sm">
                  {search.trim() || filter !== 'all'
                    ? 'No people match your filters'
                    : 'No one is currently checked in'}
                </p>
              </div>
            )}
          </div>
        </div>

        {selectedMember && (
          <div className="drawer-side presence-member-drawer-side min-w-0">
            <MemberActionPanel
              open
              className="presence-member-drawer-panel"
              person={selectedMember}
              view={selectedMemberActionView}
              onViewChange={setSelectedMemberActionView}
              onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                  closeSelectedMemberActions()
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="flex flex-wrap gap-4" role="status" aria-label="Loading">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex w-52 flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="skeleton h-16 w-16 shrink-0 rounded-full"></div>
            <div className="flex flex-col gap-4">
              <div className="skeleton h-4 w-20"></div>
              <div className="skeleton h-4 w-28"></div>
            </div>
          </div>
          <div className="skeleton h-32 w-full"></div>
        </div>
      ))}
    </div>
  )
}
