'use client'

import type { HTMLMotionProps } from 'motion/react'
import { motion, useReducedMotion } from 'motion/react'

interface MotionButtonProps extends HTMLMotionProps<'button'> {
  hoverPreset?: 'lift' | 'micro'
}

export function MotionButton({
  children,
  disabled,
  hoverPreset = 'lift',
  type = 'button',
  ...props
}: MotionButtonProps) {
  const shouldReduceMotion = useReducedMotion()

  const whileHover =
    shouldReduceMotion || disabled
      ? undefined
      : hoverPreset === 'micro'
        ? { y: -1, scale: 1.015 }
        : { y: -2, scale: 1.02 }

  const whileTap = shouldReduceMotion || disabled ? undefined : { y: 0, scale: 0.985 }
  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: 'easeOut' as const }

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={whileHover}
      whileTap={whileTap}
      transition={transition}
      {...props}
    >
      {children}
    </motion.button>
  )
}
