'use client'

import { useState, useMemo, useTransition, useRef, useEffect, useCallback } from 'react'
import { UsersRound, Search } from 'lucide-react'
import { usePresentPeople } from '@/hooks/use-present-people'
import { useCheckoutVisitor } from '@/hooks/use-visitors'
import { useTonightDutyWatch } from '@/hooks/use-schedules'
import { useDdsStatus } from '@/hooks/use-dds'
import { useAuthStore } from '@/store/auth-store'
import { PersonCard } from './person-card'
import type { PresentPerson } from '@sentinel/contracts'

type FilterType = 'all' | 'member' | 'visitor'

export function PersonCardGrid() {
  const { data, isLoading, isError } = usePresentPeople()
  const { data: dutyWatch } = useTonightDutyWatch()
  const { data: ddsStatus } = useDdsStatus()
  const checkoutVisitor = useCheckoutVisitor()
  const user = useAuthStore((state) => state.user)
  const canCheckout = user?.role && ['developer', 'admin', 'duty_watch'].includes(user.role)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  // Create lookup map: memberId -> position code
  const dutyPositionMap = useMemo(() => {
    if (!dutyWatch?.team) return new Map<string, string>()
    return new Map(
      dutyWatch.team
        .filter((m): m is typeof m & { position: { code: string } } => !!m.position?.code)
        .map((m) => [m.member.id, m.position.code])
    )
  }, [dutyWatch?.team])

  // Current DDS member ID (only when assignment is active/pending)
  const ddsMemberId = ddsStatus?.assignment?.memberId ?? null

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

  if (isError) {
    return (
      <div className="bg-base-100 p-6 rounded-lg border shadow-sm">
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
      <div className="bg-base-100 p-6 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <UsersRound size={32} strokeWidth={1} />
          <h2 className="text-lg font-display font-semibold">Presence</h2>
        </div>
        <SkeletonGrid />
      </div>
    )
  }

  return (
    <div className="presence-section p-4 rounded-xl shadow-lg animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 presence-section-header -mx-4 px-4 -mt-4 pt-3 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <UsersRound size={24} strokeWidth={1.5} className="text-primary" />
          </div>
          <h2 className="text-lg font-display font-semibold tracking-tight">Presence</h2>
        </div>

        {/* Filters + Search */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              className={`btn btn-xs ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              aria-pressed={filter === 'all'}
              onClick={() => handleFilterChange('all')}
            >
              All ({data?.total ?? 0})
            </button>
            <button
              className={`btn btn-xs ${filter === 'member' ? 'btn-success' : 'btn-ghost'}`}
              aria-pressed={filter === 'member'}
              onClick={() => handleFilterChange('member')}
            >
              Members ({memberCount})
            </button>
            <button
              className={`btn btn-xs ${filter === 'visitor' ? 'btn-info' : 'btn-ghost'}`}
              aria-pressed={filter === 'visitor'}
              onClick={() => handleFilterChange('visitor')}
            >
              Visitors ({visitorCount})
            </button>
          </div>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40"
            />
            <input
              type="text"
              placeholder="Search..."
              aria-label="Search people"
              className="input input-bordered input-sm pl-8 w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grid or empty state */}
      <div aria-live="polite" aria-atomic="false">
        {filteredPeople.length > 0 ? (
          <div
            className={`grid gap-3 presence-card-grid transition-opacity duration-200 ${isPending ? 'opacity-60 blur-[1px]' : ''}`}
          >
            {filteredPeople.map((person: PresentPerson, index: number) => (
              <div
                key={`${person.type}-${person.id}`}
                className={hasAnimated.current ? '' : 'animate-fade-in-up'}
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
                  dutyPosition={dutyPositionMap.get(person.id)}
                  isDds={person.type === 'member' && person.id === ddsMemberId}
                  onCheckoutVisitor={canCheckout ? handleCheckoutVisitor : undefined}
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
