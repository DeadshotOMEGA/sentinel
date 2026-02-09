'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Loader2, Eye, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useUnitEvents, useEventTypes } from '@/hooks/use-events'
import { EventStatusBadge } from './event-status-badge'

import type { UnitEventCategory, UnitEventStatus } from '@sentinel/contracts'

const categories: Array<{ value: UnitEventCategory; label: string }> = [
  { value: 'mess_dinner', label: 'Mess Dinner' },
  { value: 'ceremonial', label: 'Ceremonial' },
  { value: 'training', label: 'Training' },
  { value: 'social', label: 'Social' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'vip_visit', label: 'VIP Visit' },
  { value: 'remembrance', label: 'Remembrance' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'other', label: 'Other' },
]

const statuses: Array<{ value: UnitEventStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'planned', label: 'Planned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'postponed', label: 'Postponed' },
]

export function EventList() {
  const [categoryFilter, setCategoryFilter] = useState<UnitEventCategory | ''>('')
  const [statusFilter, setStatusFilter] = useState<UnitEventStatus | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const queryParams = useMemo(() => {
    const params: {
      category?: UnitEventCategory
      status?: UnitEventStatus
      startDate?: string
      endDate?: string
    } = {}

    if (categoryFilter) params.category = categoryFilter
    if (statusFilter) params.status = statusFilter
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate

    return params
  }, [categoryFilter, statusFilter, startDate, endDate])

  const { data: eventsData, isLoading } = useUnitEvents(queryParams)
  const { data: eventTypesData } = useEventTypes()

  const events = eventsData?.data ?? []
  const eventTypes = eventTypesData ?? []

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
    })
  }, [events])

  const getEventTypeName = (eventTypeId: string | null) => {
    if (!eventTypeId) return 'N/A'
    const eventType = eventTypes.find((t) => t.id === eventTypeId)
    return eventType?.name ?? 'Unknown'
  }

  const handleClearFilters = () => {
    setCategoryFilter('')
    setStatusFilter('')
    setStartDate('')
    setEndDate('')
  }

  return (
    <div className="p-0">
      {/* Filters */}
      <div className="p-4" role="search" aria-label="Event filters">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Category</legend>
            <select
              id="category-filter"
              className="select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as UnitEventCategory | '')}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Status</legend>
            <select
              id="status-filter"
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UnitEventStatus | '')}
            >
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Start Date</legend>
            <input
              className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Filter by start date"
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">End Date</legend>
            <input
              className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="Filter by end date"
            />
          </fieldset>
        </div>

        <div className="flex justify-end mt-4">
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleClearFilters}
            disabled={!categoryFilter && !statusFilter && !startDate && !endDate}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-base-100 border shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-base-content/60" />
            <span className="sr-only">Loading events...</span>
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="text-center py-12 text-base-content/60" role="status" aria-live="polite">
            <p>No events found</p>
          </div>
        ) : (
          <table className="table table-zebra w-full" role="table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Duty Watch</th>
                <th scope="col" className="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEvents.map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap">
                    {format(new Date(event.eventDate), 'MMM dd, yyyy')}
                  </td>
                  <td className="font-medium">{event.title}</td>
                  <td>{getEventTypeName(event.eventTypeId)}</td>
                  <td>
                    <EventStatusBadge status={event.status} />
                  </td>
                  <td>
                    {event.requiresDutyWatch ? (
                      <CheckCircle
                        className="h-4 w-4 text-success"
                        aria-label="Requires duty watch"
                      />
                    ) : (
                      <XCircle
                        className="h-4 w-4 text-base-content/30"
                        aria-label="No duty watch required"
                      />
                    )}
                  </td>
                  <td className="text-right">
                    <Link href={`/events/${event.id}`} passHref>
                      <button
                        className="btn btn-ghost btn-square btn-sm"
                        aria-label={`View ${event.title}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
