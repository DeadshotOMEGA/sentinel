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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Chip, type ChipVariant, type ChipColor } from '@/components/ui/chip'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import {
  useCreateQualificationType,
  useUpdateQualificationType,
  useTagsForSelector,
  type QualificationTypeItem,
  type CreateQualificationTypeInput,
} from '@/hooks/use-qualification-type-management'

interface QualificationTypeFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: QualificationTypeItem | null
  mode: 'create' | 'edit'
}

export function QualificationTypeFormModal({
  open,
  onOpenChange,
  item,
  mode,
}: QualificationTypeFormModalProps) {
  const createMutation = useCreateQualificationType()
  const updateMutation = useUpdateQualificationType()
  const { data: tags, isLoading: tagsLoading } = useTagsForSelector()

  const form = useForm<CreateQualificationTypeInput>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      canReceiveLockup: true,
      displayOrder: 0,
      tagId: null,
    },
  })

  const watchedName = form.watch('name')
  const watchedTagId = form.watch('tagId')

  // Find the selected tag for preview
  const selectedTag = tags?.find((t) => t.id === watchedTagId)

  // Reset form when modal opens/closes or item changes
  useEffect(() => {
    if (open && item && mode === 'edit') {
      form.reset({
        code: item.code,
        name: item.name,
        description: item.description || '',
        canReceiveLockup: item.canReceiveLockup,
        displayOrder: item.displayOrder,
        tagId: item.tagId,
      })
    } else if (open && mode === 'create') {
      form.reset({
        code: '',
        name: '',
        description: '',
        canReceiveLockup: true,
        displayOrder: 0,
        tagId: null,
      })
    }
  }, [open, item, mode, form])

  const onSubmit = async (data: CreateQualificationTypeInput) => {
    try {
      const cleanData = {
        ...data,
        description: data.description || null,
        tagId: data.tagId || null,
      }

      if (mode === 'edit' && item) {
        await updateMutation.mutateAsync({ id: item.id, data: cleanData })
      } else {
        await createMutation.mutateAsync(cleanData)
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Qualification Type' : 'Create Qualification Type'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the details for this qualification type.'
              : 'Add a new qualification type to the system.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              rules={{
                required: 'Code is required',
                pattern: {
                  value: /^[A-Z0-9_]+$/,
                  message: 'Code must be uppercase letters, numbers, and underscores only',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., DDS, SWK, BUILDING_AUTH"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      disabled={mode === 'edit'}
                    />
                  </FormControl>
                  <FormDescription>
                    Unique identifier (uppercase, cannot be changed after creation)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., DDS Qualified, SWK Qualified" {...field} />
                  </FormControl>
                  <FormDescription>Human-readable name shown in the UI</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional description" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canReceiveLockup"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Can Receive Lockup</FormLabel>
                    <FormDescription>
                      Members with this qualification can receive lockup responsibility
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <FormDescription>Order in which qualifications are displayed</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tag Linking Section */}
            <div className="space-y-4 pt-2 border-t">
              <div className="text-sm font-medium">Visual Styling (via Tag)</div>

              <FormField
                control={form.control}
                name="tagId"
                render={({ field }) => (
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Linked Tag</legend>
                    <select
                      className="select"
                      value={field.value || 'none'}
                      onChange={(e) => field.onChange(e.target.value === 'none' ? null : e.target.value)}
                      disabled={tagsLoading}
                    >
                      <option value="none">No tag (default styling)</option>
                      {tags?.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                    <span className="label">
                      Link to a tag to inherit its chip variant and color for display
                    </span>
                  </fieldset>
                )}
              />

              {/* Live Preview */}
              <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg">
                <span className="text-sm text-base-content/60">Preview:</span>
                {selectedTag ? (
                  <Chip
                    variant={(selectedTag.chipVariant as ChipVariant) || 'solid'}
                    color={(selectedTag.chipColor as ChipColor) || 'default'}
                  >
                    {watchedName || 'Qualification'}
                  </Chip>
                ) : (
                  <Chip variant="solid" color="default">
                    {watchedName || 'Qualification'}
                  </Chip>
                )}
              </div>
            </div>

            {error && <div className="text-sm text-error">{error.message}</div>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {mode === 'edit' ? 'Saving...' : 'Creating...'}
                  </>
                ) : mode === 'edit' ? (
                  'Save Changes'
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
