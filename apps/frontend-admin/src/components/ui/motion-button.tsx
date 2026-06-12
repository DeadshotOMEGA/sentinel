'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

interface MotionButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  children?: ReactNode
  hoverPreset?: 'lift' | 'micro'
}

export function MotionButton({
  children,
  className,
  disabled,
  hoverPreset = 'lift',
  onClick,
  tabIndex,
  type = 'button',
  ...props
}: MotionButtonProps) {
  const shouldReduceMotion = useReducedMotion()
  const isDisabled = Boolean(disabled)
  const disabledClassName = isDisabled ? 'pointer-events-none opacity-40' : ''
  const resolvedClassName = [className, disabledClassName].filter(Boolean).join(' ')

  const handleClick: NonNullable<ComponentPropsWithoutRef<'button'>['onClick']> = (event) => {
    if (isDisabled) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    onClick?.(event)
  }

  const whileHover =
    shouldReduceMotion || isDisabled
      ? undefined
      : hoverPreset === 'micro'
        ? { y: -1, scale: 1.015 }
        : { y: -2, scale: 1.02 }

  const whileTap = shouldReduceMotion || isDisabled ? undefined : { y: 0, scale: 0.985 }
  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: 'easeOut' as const }

  return (
    <motion.button
      {...(props as ComponentPropsWithoutRef<typeof motion.button>)}
      type={type}
      aria-disabled={isDisabled || undefined}
      className={resolvedClassName}
      onClick={handleClick}
      tabIndex={isDisabled ? -1 : tabIndex}
      whileHover={whileHover}
      whileTap={whileTap}
      transition={transition}
    >
      {children}
    </motion.button>
  )
}
