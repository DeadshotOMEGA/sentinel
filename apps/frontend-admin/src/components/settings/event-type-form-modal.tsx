'use client'

import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  useCreateEventType,
  useUpdateEventType,
  type EventTypeInput,
} from '@/hooks/use-events'
import type { UnitEventCategory, UnitEventTypeResponse } from '@sentinel/contracts'

interface EventTypeFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  item?: UnitEventTypeResponse | null
}

interface FormValues {
  name: string
  category: UnitEventCategory
  defaultDurationMinutes: number
  requiresDutyWatch: boolean
  displayOrder: number
  defaultMetadata: string
}

const CATEGORY_OPTIONS: Array<{ value: UnitEventCategory; label: string }> = [
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

function parseMetadata(raw: string): { value: Record<string, unknown> | null; error?: string } {
  if (!raw.trim()) {
    return { value: null }
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        value: null,
        error: 'Metadata must be a JSON object.',
      }
    }
    return { value: parsed as Record<string, unknown> }
  } catch (_error) {
    return {
      value: null,
      error: 'Metadata must be valid JSON.',
    }
  }
}

export function EventTypeFormModal({ open, onOpenChange, mode, item }: EventTypeFormModalProps) {
  const createMutation = useCreateEventType()
  const updateMutation = useUpdateEventType()

  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      category: 'training',
      defaultDurationMinutes: 120,
      requiresDutyWatch: false,
      displayOrder: 0,
      defaultMetadata: '',
    },
  })

  useEffect(() => {
    if (open && mode === 'edit' && item) {
      form.reset({
        name: item.name,
        category: item.category,
        defaultDurationMinutes: item.defaultDurationMinutes,
        requiresDutyWatch: item.requiresDutyWatch,
        displayOrder: item.displayOrder,
        defaultMetadata: item.defaultMetadata ? JSON.stringify(item.defaultMetadata, null, 2) : '',
      })
      return
    }

    if (open && mode === 'create') {
      form.reset({
        name: '',
        category: 'training',
        defaultDurationMinutes: 120,
        requiresDutyWatch: false,
        displayOrder: 0,
        defaultMetadata: '',
      })
    }
  }, [open, mode, item, form])

  const onSubmit = async (values: FormValues) => {
    const metadataResult = parseMetadata(values.defaultMetadata)
    if (metadataResult.error) {
      form.setError('defaultMetadata', {
        type: 'validate',
        message: metadataResult.error,
      })
      return
    }

    const payload: EventTypeInput = {
      name: values.name.trim(),
      category: values.category,
      defaultDurationMinutes: values.defaultDurationMinutes,
      requiresDutyWatch: values.requiresDutyWatch,
      displayOrder: values.displayOrder,
      defaultMetadata: metadataResult.value,
    }

    try {
      if (mode === 'edit' && item) {
        await updateMutation.mutateAsync({ id: item.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch {
      // Mutation state shows message
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.error || updateMutation.error

  const title = useMemo(() => {
    return mode === 'edit' ? 'Edit Event Type' : 'Create Event Type'
  }, [mode])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update this event type template.'
              : 'Add a new event type template for event creation.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {mutationError && (
            <div className="alert alert-error" role="alert">
              <span>{mutationError.message}</span>
            </div>
          )}

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Name</span>
            </div>
            <input
              className="input input-bordered w-full"
              {...form.register('name', {
                required: 'Name is required',
                minLength: { value: 1, message: 'Name is required' },
                maxLength: { value: 100, message: 'Name must be at most 100 characters' },
              })}
              disabled={isPending}
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-sm text-error">{form.formState.errors.name.message}</p>
            )}
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Category</span>
            </div>
            <select
              className="select select-bordered w-full"
              {...form.register('category')}
              disabled={isPending}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Default Duration (minutes)</span>
              </div>
              <input
                type="number"
                min={15}
                max={1440}
                className="input input-bordered w-full"
                {...form.register('defaultDurationMinutes', {
                  valueAsNumber: true,
                  min: { value: 15, message: 'Minimum 15 minutes' },
                  max: { value: 1440, message: 'Maximum 1440 minutes' },
                })}
                disabled={isPending}
              />
              {form.formState.errors.defaultDurationMinutes && (
                <p className="mt-1 text-sm text-error">
                  {form.formState.errors.defaultDurationMinutes.message}
                </p>
              )}
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Display Order</span>
              </div>
              <input
                type="number"
                min={0}
                className="input input-bordered w-full"
                {...form.register('displayOrder', {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Display order must be 0 or greater' },
                })}
                disabled={isPending}
              />
              {form.formState.errors.displayOrder && (
                <p className="mt-1 text-sm text-error">{form.formState.errors.displayOrder.message}</p>
              )}
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-md border border-base-300 bg-base-200 p-3">
            <Checkbox
              checked={form.watch('requiresDutyWatch')}
              onCheckedChange={(checked) => form.setValue('requiresDutyWatch', checked === true)}
              disabled={isPending}
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">Requires duty watch by default</span>
              <span className="block text-xs text-base-content/60">
                New events of this type will default to duty-watch enabled.
              </span>
            </span>
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Default Metadata (JSON)</span>
            </div>
            <textarea
              className="textarea textarea-bordered h-32 w-full font-mono text-xs"
              placeholder='{"positions": [{"code": "SWK", "name": "Senior Watchkeeper"}]}'
              {...form.register('defaultMetadata')}
              disabled={isPending}
            />
            <div className="label">
              <span className="label-text-alt text-base-content/60">
                Optional JSON object applied as defaults for this event type.
              </span>
            </div>
            {form.formState.errors.defaultMetadata && (
              <p className="mt-1 text-sm text-error">
                {form.formState.errors.defaultMetadata.message}
              </p>
            )}
          </label>

          <DialogFooter>
            <button type="button" className="btn btn-ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending && <ButtonSpinner />}
              {mode === 'edit' ? 'Save Changes' : 'Create Event Type'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
