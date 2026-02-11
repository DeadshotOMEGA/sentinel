'use client'

import { useState } from 'react'
import { CalendarClock, Plus } from 'lucide-react'
import { EventList } from '@/components/events/event-list'
import { EventFormModal } from '@/components/events/event-form-modal'
export default function EventsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6" aria-hidden="true" />
            Unit Events
          </h1>
          <p className="text-base-content/60">
            Manage training exercises, ceremonies, and operational events
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={() => setIsCreateModalOpen(true)}
          aria-label="Create new event"
        >
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Create Event
        </button>
      </div>

      {/* Event List */}
      <EventList />

      {/* Create Event Modal */}
      <EventFormModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </div>
  )
}
