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
import { ColorPicker } from '@/components/ui/color-picker'
import { Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  useCreateEnum,
  useUpdateEnum,
  type EnumType,
  type EnumItem,
  type CreateEnumInput,
} from '@/hooks/use-enum-management'

interface EnumFormModalProps {
  enumType: EnumType
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: EnumItem | null
  mode: 'create' | 'edit'
}

const ENUM_TYPE_LABELS: Record<EnumType, string> = {
  'visit-types': 'Visit Type',
  'member-statuses': 'Member Status',
  'member-types': 'Member Type',
  'badge-statuses': 'Badge Status',
  'tags': 'Tag',
}

const CHIP_VARIANTS: { value: ChipVariant; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'bordered', label: 'Bordered' },
  { value: 'light', label: 'Light' },
  { value: 'flat', label: 'Flat' },
  { value: 'faded', label: 'Faded' },
  { value: 'shadow', label: 'Shadow' },
  { value: 'dot', label: 'Dot' },
]

const CHIP_COLORS: { value: ChipColor; label: string }[] = [
  // Semantic colors
  { value: 'default', label: 'Default' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Danger' },
  // Base colors
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'pink', label: 'Pink' },
  { value: 'purple', label: 'Purple' },
  { value: 'red', label: 'Red' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'zinc', label: 'Zinc' },
]

export function EnumFormModal({
  enumType,
  open,
  onOpenChange,
  item,
  mode,
}: EnumFormModalProps) {
  const label = ENUM_TYPE_LABELS[enumType]
  const isTagType = enumType === 'tags'
  const createEnum = useCreateEnum(enumType)
  const updateEnum = useUpdateEnum(enumType)

  const form = useForm<CreateEnumInput>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      color: '',
      chipVariant: 'solid',
      chipColor: 'default',
      isPositional: false,
    },
  })

  const watchedVariant = form.watch('chipVariant') as ChipVariant
  const watchedColor = form.watch('chipColor') as ChipColor
  const watchedName = form.watch('name')

  // Reset form when modal opens/closes or item changes
  useEffect(() => {
    if (open && item && mode === 'edit') {
      form.reset({
        code: item.code || '',
        name: item.name,
        description: item.description || '',
        color: item.color || '',
        chipVariant: (item.chipVariant as ChipVariant) || 'solid',
        chipColor: (item.chipColor as ChipColor) || 'default',
        isPositional: item.isPositional || false,
      })
    } else if (open && mode === 'create') {
      form.reset({
        code: '',
        name: '',
        description: '',
        color: '',
        chipVariant: 'solid',
        chipColor: 'default',
        isPositional: false,
      })
    }
  }, [open, item, mode, form])

  const onSubmit = async (data: CreateEnumInput) => {
    try {
      // Clean up empty strings
      const cleanData = {
        ...data,
        code: isTagType ? undefined : data.code,
        description: data.description || undefined,
        color: data.color || undefined,
        chipVariant: data.chipVariant || 'solid',
        chipColor: data.chipColor || 'default',
        isPositional: isTagType ? data.isPositional : undefined,
      }

      if (mode === 'edit' && item) {
        await updateEnum.mutateAsync({ id: item.id, data: cleanData })
      } else {
        await createEnum.mutateAsync(cleanData)
      }
      onOpenChange(false)
    } catch {
      // Error is handled by the mutation
    }
  }

  const isPending = createEnum.isPending || updateEnum.isPending
  const error = createEnum.error || updateEnum.error

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? `Edit ${label}` : `Create ${label}`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? `Update the details for this ${label.toLowerCase()}.`
              : `Add a new ${label.toLowerCase()} to the system.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Code field - only for non-tag types */}
            {!isTagType && (
              <FormField
                control={form.control}
                name="code"
                rules={{
                  required: 'Code is required',
                  pattern: {
                    value: /^[a-z0-9_]+$/,
                    message: 'Code must be lowercase letters, numbers, and underscores only',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., active, pending_review"
                        {...field}
                        disabled={mode === 'edit'} // Code cannot be changed after creation
                      />
                    </FormControl>
                    <FormDescription>
                      Unique identifier used internally (cannot be changed after creation)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Active, Pending Review" {...field} />
                  </FormControl>
                  <FormDescription>
                    Human-readable name shown in the UI
                  </FormDescription>
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
                    <Input placeholder="Optional description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Chip Style Section */}
            <div className="space-y-4 pt-2 border-t">
              <div className="text-sm font-medium">Chip Style</div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="chipVariant"
                  render={({ field }) => (
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Variant</legend>
                      <select
                        className="select"
                        value={field.value || 'solid'}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        {CHIP_VARIANTS.map((variant) => (
                          <option key={variant.value} value={variant.value}>
                            {variant.label}
                          </option>
                        ))}
                      </select>
                    </fieldset>
                  )}
                />

                <FormField
                  control={form.control}
                  name="chipColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <ColorPicker
                          value={field.value || 'default'}
                          onValueChange={field.onChange}
                          placeholder="Select color"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Live Preview */}
              <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg">
                <span className="text-sm text-base-content/60">Preview:</span>
                <Chip
                  variant={watchedVariant || 'solid'}
                  color={watchedColor || 'default'}
                >
                  {watchedName || 'Sample'}
                </Chip>
              </div>
            </div>

            {/* Positional toggle - only for tags */}
            {isTagType && (
              <FormField
                control={form.control}
                name="isPositional"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0 pt-2 border-t">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div>
                      <FormLabel>Positional tag</FormLabel>
                      <FormDescription>
                        Positional tags display as chips only and never appear in the avatar
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {error && (
              <div className="text-sm text-error">
                {error.message}
              </div>
            )}

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
