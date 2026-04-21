'use client'

/* global HTMLInputElement */

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import {
  getMaskedPinDisplay,
  sanitizePinValue,
  type PinFieldPlaceholderStyle,
} from './pin-field.logic'

interface PinFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'autoComplete' | 'maxLength' | 'size' | 'value' | 'onChange'
> {
  value: string
  onValueChange: (value: string) => void
  label?: string
  ariaLabel?: string
  size?: 'default' | 'large'
  placeholderStyle?: PinFieldPlaceholderStyle
  containerClassName?: string
  inputClassName?: string
  maskClassName?: string
}

const sizeClasses = {
  default: 'font-mono text-center tracking-[0.5em]',
  large: 'font-mono text-center text-2xl tracking-[0.45em]',
} as const

export const PinField = forwardRef<HTMLInputElement, PinFieldProps>(function PinField(
  {
    value,
    onValueChange,
    label,
    ariaLabel,
    size = 'default',
    placeholderStyle = 'bullets',
    className,
    containerClassName,
    inputClassName,
    maskClassName,
    disabled,
    ...props
  },
  ref
) {
  const sanitizedValue = sanitizePinValue(value)
  const maskedValue = getMaskedPinDisplay(sanitizedValue, placeholderStyle)

  return (
    <label className={cn('input w-full', className)}>
      {label ? <span className="label">{label}</span> : null}
      <div className={cn('relative grow', containerClassName)}>
        <input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={sanitizedValue}
          onChange={(event) => onValueChange(sanitizePinValue(event.target.value))}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'relative z-10 w-full grow bg-transparent text-transparent caret-base-content outline-none selection:bg-primary-fadded selection:text-transparent',
            sizeClasses[size],
            inputClassName
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 flex w-full items-center whitespace-pre text-base-content',
            sizeClasses[size],
            disabled ? 'text-base-content/50' : 'text-base-content',
            maskClassName
          )}
        >
          {maskedValue}
        </span>
      </div>
    </label>
  )
})
