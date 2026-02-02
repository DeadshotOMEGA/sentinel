'use client'

import { useState, useMemo } from 'react'
import { UsersRound, Search } from 'lucide-react'
import { usePresentPeople } from '@/hooks/use-present-people'
import { useCheckoutVisitor } from '@/hooks/use-visitors'
import { useAuthStore } from '@/store/auth-store'
import { PersonCard } from './person-card'
import type { PresentPerson } from '@sentinel/contracts'

type FilterType = 'all' | 'member' | 'visitor'

export function PersonCardGrid() {
  const { data, isLoading, isError } = usePresentPeople()
  const checkoutVisitor = useCheckoutVisitor()
  const user = useAuthStore((state) => state.user)
  const canCheckout = user?.role && ['developer', 'admin', 'duty_watch'].includes(user.role)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const handleCheckoutVisitor = async (visitorId: string) => {
    try {
      await checkoutVisitor.mutateAsync(visitorId)
    } catch (error) {
      console.error('Failed to sign out visitor:', error)
    }
  }

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

  const memberCount = data?.people?.filter((p) => p.type === 'member').length ?? 0
  const visitorCount = data?.people?.filter((p) => p.type === 'visitor').length ?? 0

  if (isError) {
    return (
      <div className="bg-base-100 p-6 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UsersRound size={32} strokeWidth={1} className="text-error" />
          <h2 className="text-lg font-semibold">Presence</h2>
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
          <h2 className="text-lg font-semibold">Presence</h2>
        </div>
        <SkeletonGrid />
      </div>
    )
  }

  return (
    <div className="bg-base-100 p-6 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <UsersRound size={32} strokeWidth={1} />
          <h2 className="text-lg font-semibold">Presence</h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            type="text"
            placeholder="Search..."
            className="input input-bordered input-sm pl-8 w-48"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4">
        <button
          className={`btn btn-xs ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilter('all')}
        >
          All ({data?.total ?? 0})
        </button>
        <button
          className={`btn btn-xs ${filter === 'member' ? 'btn-success' : 'btn-ghost'}`}
          onClick={() => setFilter('member')}
        >
          Members ({memberCount})
        </button>
        <button
          className={`btn btn-xs ${filter === 'visitor' ? 'btn-info' : 'btn-ghost'}`}
          onClick={() => setFilter('visitor')}
        >
          Visitors ({visitorCount})
        </button>
      </div>

      {/* Grid or empty state */}
      {filteredPeople.length > 0 ? (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 300px))' }}
        >
          {filteredPeople.map((person: PresentPerson) => (
            <PersonCard
              key={`${person.type}-${person.id}`}
              person={person}
              onCheckoutVisitor={canCheckout ? handleCheckoutVisitor : undefined}
            />
          ))}
        </div>
      ) : (
        <SkeletonGrid />
      )}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="flex flex-wrap gap-4">
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
