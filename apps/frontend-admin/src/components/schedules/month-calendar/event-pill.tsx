import { memo } from 'react'
import { useModalContext } from '../modals/modal-context'

interface EventPillProps {
  id: string
  title: string
  isPastWeek?: boolean
}

export const EventPill = memo(function EventPill({ id, title, isPastWeek }: EventPillProps) {
  const { openEventModal } = useModalContext()

  return (
    <button
      type="button"
      className={`badge badge-sm truncate max-w-full transition-colors text-left ${isPastWeek ? 'badge-secondary' : 'badge-secondary hover:brightness-110'}`}
      style={
        isPastWeek
          ? {
              backgroundColor: 'var(--color-secondary-fadded)',
              color: 'var(--color-secondary-fadded-content)',
            }
          : undefined
      }
      title={title}
      aria-label={`Event: ${title}`}
      onClick={(e) => {
        e.stopPropagation()
        openEventModal(id)
      }}
    >
      {title}
    </button>
  )
})
