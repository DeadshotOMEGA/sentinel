'use client'

import { useState, useMemo } from 'react'
import { Eye, CheckCircle, XCircle, Calendar, Edit, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Link from 'next/link'
import { useUnitEvents, useEventTypes } from '@/hooks/use-events'
import { EventStatusBadge } from './event-status-badge'
import { EventDeleteDialog } from './event-delete-dialog'
import { EventFormModal } from './event-form-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { TID } from '@/lib/test-ids'
import { formatUnitEventDateRange } from '@/lib/unit-event-dates'

import type { UnitEventCategory, UnitEventResponse, UnitEventStatus } from '@sentinel/contracts'

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
  const [eventToEdit, setEventToEdit] = useState<UnitEventResponse | null>(null)
  const [eventToDelete, setEventToDelete] = useState<UnitEventResponse | null>(null)

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
      const dateCompare = new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
      if (dateCompare !== 0) {
        return dateCompare
      }
      return a.title.localeCompare(b.title)
    })
  }, [events])

  const eventTypeMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of eventTypes) {
      map.set(t.id, t.name)
    }
    return map
  }, [eventTypes])

  const getEventTypeName = (eventTypeId: string | null) => {
    if (!eventTypeId) return 'N/A'
    return eventTypeMap.get(eventTypeId) ?? 'Unknown'
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
      <div className="p-4" role="search" aria-label="Event filters" data-help-id="events.filters">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="select w-full">
            <span className="label">Category</span>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as UnitEventCategory | '')}
              data-testid={TID.events.filter.category}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>

          <label className="select w-full">
            <span className="label">Status</span>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UnitEventStatus | '')}
              data-testid={TID.events.filter.status}
            >
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label className="input w-full">
            <span className="label">Start Date</span>
            <input
              id="start-date"
              className="grow"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Filter by start date"
              data-testid={TID.events.filter.startDate}
            />
          </label>

          <label className="input w-full">
            <span className="label">End Date</span>
            <input
              id="end-date"
              className="grow"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="Filter by end date"
              data-testid={TID.events.filter.endDate}
            />
          </label>
        </div>

        <div className="flex justify-end mt-4">
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleClearFilters}
            disabled={!categoryFilter && !statusFilter && !startDate && !endDate}
            data-testid={TID.events.filter.clear}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-base-100 border shadow-sm" data-help-id="events.list">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
            <LoadingSpinner size="lg" label="Loading events..." />
          </div>
        ) : sortedEvents.length === 0 ? (
          <EmptyState icon={Calendar} title="No events found" />
        ) : (
          <table className="table table-zebra w-full" role="table">
            <thead>
              <tr>
                <th scope="col">Dates</th>
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
                <tr key={event.id} data-testid={TID.events.listItem(event.id)}>
                  <td className="whitespace-nowrap">{formatUnitEventDateRange(event)}</td>
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
                    <div className="flex justify-end gap-1">
                      <Link href={`/events/${event.id}`} passHref>
                        <button
                          className="btn btn-ghost btn-square btn-sm"
                          aria-label={`View ${event.title}`}
                          title="View event"
                          data-testid={TID.events.viewBtn(event.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost btn-square btn-sm"
                        aria-label={`Edit ${event.title}`}
                        title="Edit event"
                        onClick={() => setEventToEdit(event)}
                        data-testid={TID.events.editBtn(event.id)}
                      >
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-square btn-sm text-error hover:bg-error-fadded"
                        aria-label={`Delete ${event.title}`}
                        title="Delete event"
                        onClick={() => setEventToDelete(event)}
                        data-testid={TID.events.deleteBtn(event.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <EventFormModal
        open={eventToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setEventToEdit(null)
        }}
        event={eventToEdit}
      />
      <EventDeleteDialog
        event={eventToDelete}
        open={eventToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setEventToDelete(null)
        }}
      />
    </div>
  )
}
