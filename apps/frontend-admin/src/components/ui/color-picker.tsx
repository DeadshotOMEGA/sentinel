'use client'

import { HEROUI_COLORS, SEMANTIC_COLORS, type ColorName } from '@sentinel/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

interface ColorOption {
  name: ColorName
  hex: string
  label: string
  category: 'semantic' | 'base'
}

const COLOR_OPTIONS: ColorOption[] = [
  // Semantic colors (most commonly used)
  { name: 'default', hex: SEMANTIC_COLORS.default, label: 'Default', category: 'semantic' },
  { name: 'primary', hex: SEMANTIC_COLORS.primary, label: 'Primary', category: 'semantic' },
  { name: 'secondary', hex: SEMANTIC_COLORS.secondary, label: 'Secondary', category: 'semantic' },
  { name: 'success', hex: SEMANTIC_COLORS.success, label: 'Success', category: 'semantic' },
  { name: 'warning', hex: SEMANTIC_COLORS.warning, label: 'Warning', category: 'semantic' },
  { name: 'danger', hex: SEMANTIC_COLORS.danger, label: 'Danger', category: 'semantic' },

  // Base colors (additional options)
  { name: 'blue', hex: HEROUI_COLORS.blue[500], label: 'Blue', category: 'base' },
  { name: 'green', hex: HEROUI_COLORS.green[500], label: 'Green', category: 'base' },
  { name: 'pink', hex: HEROUI_COLORS.pink[500], label: 'Pink', category: 'base' },
  { name: 'purple', hex: HEROUI_COLORS.purple[500], label: 'Purple', category: 'base' },
  { name: 'red', hex: HEROUI_COLORS.red[500], label: 'Red', category: 'base' },
  { name: 'yellow', hex: HEROUI_COLORS.yellow[500], label: 'Yellow', category: 'base' },
  { name: 'cyan', hex: HEROUI_COLORS.cyan[500], label: 'Cyan', category: 'base' },
  { name: 'zinc', hex: HEROUI_COLORS.zinc[500], label: 'Zinc', category: 'base' },
]

function ColorSwatch({ hex, size = 'sm' }: { hex: string; size?: 'sm' | 'md' }) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  }

  return (
    <div
      className={cn(
        'rounded-sm border border-border/50',
        sizeClasses[size]
      )}
      style={{ backgroundColor: hex }}
    />
  )
}

export function ColorPicker({
  value,
  onValueChange,
  placeholder = 'Select color',
  className,
}: ColorPickerProps) {
  const selectedColor = COLOR_OPTIONS.find((c) => c.name === value)

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedColor && (
            <div className="flex items-center gap-2">
              <ColorSwatch hex={selectedColor.hex} size="sm" />
              <span>{selectedColor.label}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* Semantic Colors Section */}
        <div className="px-2 py-1.5">
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            Semantic Colors
          </div>
          {COLOR_OPTIONS.filter((c) => c.category === 'semantic').map((color) => (
            <SelectItem key={color.name} value={color.name}>
              <div className="flex items-center gap-2">
                <ColorSwatch hex={color.hex} size="sm" />
                <span>{color.label}</span>
              </div>
            </SelectItem>
          ))}
        </div>

        {/* Base Colors Section */}
        <div className="px-2 py-1.5 border-t">
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            Base Colors
          </div>
          {COLOR_OPTIONS.filter((c) => c.category === 'base').map((color) => (
            <SelectItem key={color.name} value={color.name}>
              <div className="flex items-center gap-2">
                <ColorSwatch hex={color.hex} size="sm" />
                <span>{color.label}</span>
              </div>
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  )
}
