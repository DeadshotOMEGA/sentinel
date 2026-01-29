'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface CheckboxProps extends Omit<React.ComponentProps<"input">, 'type' | 'checked' | 'onChange'> {
  checked?: boolean
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, indeterminate, onCheckedChange, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
      const el = innerRef.current
      if (el) {
        el.indeterminate = !!indeterminate
      }
    }, [indeterminate])

    // Merge refs
    React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLInputElement)

    return (
      <input
        ref={innerRef}
        type="checkbox"
        data-slot="checkbox"
        className={cn(
          "checkbox checkbox-sm checkbox-primary",
          className
        )}
        checked={indeterminate ? false : checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
