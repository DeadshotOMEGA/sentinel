'use client'

import { type FormEvent, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { useCreateEventPosition } from '@/hooks/use-events'

interface EventPositionFormProps {
  eventId: string
  onClose: () => void
}

export function EventPositionForm({ eventId, onClose }: EventPositionFormProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  const createPositionMutation = useCreateEventPosition()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!code.trim() || !name.trim()) {
      window.alert('Code and Name are required')
      return
    }

    try {
      await createPositionMutation.mutateAsync({
        eventId,
        data: {
          code: code.toUpperCase(),
          name,
        },
      })

      setCode('')
      setName('')
      onClose()
    } catch (error) {
      console.error('Failed to create position:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3 p-4 bg-base-200 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">
            Code <span className="text-error">*</span>
          </legend>
          <input
            className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
            id="position-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g., OOD"
            maxLength={50}
            required
            aria-required="true"
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">
            Name <span className="text-error">*</span>
          </legend>
          <input
            className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
            id="position-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Officer of the Day"
            maxLength={100}
            required
            aria-required="true"
          />
        </fieldset>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          disabled={createPositionMutation.isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={createPositionMutation.isPending}
        >
          {createPositionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Add Position
        </button>
      </div>
    </form>
  )
}
