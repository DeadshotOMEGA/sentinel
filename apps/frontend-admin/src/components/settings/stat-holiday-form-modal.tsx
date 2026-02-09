'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { useCreateStatHoliday, useUpdateStatHoliday } from '@/hooks/use-stat-holidays'
import type { StatHoliday, CreateStatHolidayInput } from '@sentinel/contracts'

interface StatHolidayFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  holiday?: StatHoliday | null
  mode: 'create' | 'edit'
}

/**
 * Canadian provinces with federal (null) as the first option
 */
const PROVINCE_OPTIONS = [
  { value: '', label: 'Federal (all provinces)' },
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' },
]

interface FormData {
  date: string
  name: string
  province: string
  isActive: boolean
}

export function StatHolidayFormModal({
  open,
  onOpenChange,
  holiday,
  mode,
}: StatHolidayFormModalProps) {
  const createMutation = useCreateStatHoliday()
  const updateMutation = useUpdateStatHoliday()

  const form = useForm<FormData>({
    defaultValues: {
      date: '',
      name: '',
      province: '',
      isActive: true,
    },
  })

  // Reset form when modal opens/closes or holiday changes
  useEffect(() => {
    if (open && holiday && mode === 'edit') {
      form.reset({
        date: holiday.date,
        name: holiday.name,
        province: holiday.province ?? '',
        isActive: holiday.isActive,
      })
    } else if (open && mode === 'create') {
      form.reset({
        date: '',
        name: '',
        province: '',
        isActive: true,
      })
    }
  }, [open, holiday, mode, form])

  const onSubmit = async (data: FormData) => {
    try {
      const payload: CreateStatHolidayInput = {
        date: data.date,
        name: data.name,
        province: data.province || null,
        isActive: data.isActive,
      }

      if (mode === 'edit' && holiday) {
        await updateMutation.mutateAsync({ id: holiday.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch {
      // Error is handled by the mutation
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const error = createMutation.error || updateMutation.error

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Statutory Holiday' : 'Add Statutory Holiday'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the details for this statutory holiday.'
              : 'Add a new statutory holiday to the system. Stat holidays affect DDS handover timing.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              rules={{
                required: 'Date is required',
                pattern: {
                  value: /^\d{4}-\d{2}-\d{2}$/,
                  message: 'Date must be in YYYY-MM-DD format',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <input
                      className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      type="date"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>The date of the statutory holiday</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              rules={{
                required: 'Name is required',
                maxLength: { value: 100, message: 'Name must be 100 characters or less' },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Holiday Name</FormLabel>
                  <FormControl>
                    <input
                      className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="e.g., Canada Day, Remembrance Day"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>The name of the statutory holiday</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Province/Territory</FormLabel>
                  <FormControl>
                    <select
                      className="select select-bordered w-full"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="" disabled>
                        Select province
                      </option>
                      {PROVINCE_OPTIONS.map((option) => (
                        <option key={option.value || 'federal'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormDescription>
                    Leave as Federal for holidays that apply to all provinces
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Inactive holidays are ignored when calculating operational days
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {error && (
              <div className="rounded-lg bg-error/10 border border-error/20 p-3 text-sm text-error">
                {error.message}
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                className="btn btn-outline btn-md"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-md" disabled={isPending}>
                {isPending ? (
                  <>
                    <ButtonSpinner />
                    {mode === 'edit' ? 'Saving...' : 'Creating...'}
                  </>
                ) : mode === 'edit' ? (
                  'Save Changes'
                ) : (
                  'Add Holiday'
                )}
              </button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
