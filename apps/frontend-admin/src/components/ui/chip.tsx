import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const chipVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1.5 transition-all",
  {
    variants: {
      variant: {
        solid: "",
        bordered: "border-2 bg-transparent",
        light: "bg-opacity-20 border-transparent",
        flat: "border-transparent",
        faded: "border-2 bg-opacity-10",
        shadow: "shadow-md border-transparent",
        dot: "bg-transparent border-transparent",
      },
      color: {
        // Semantic colors
        default: "",
        primary: "",
        secondary: "",
        success: "",
        warning: "",
        danger: "",
        // Base colors
        blue: "",
        green: "",
        pink: "",
        purple: "",
        red: "",
        yellow: "",
        cyan: "",
        zinc: "",
      },
      size: {
        sm: "px-2 py-0.5 text-xs gap-1",
        md: "px-2.5 py-1 text-sm gap-1.5",
        lg: "px-3 py-1.5 text-base gap-2",
      },
    },
    compoundVariants: [
      // Solid variants
      { variant: "solid", color: "default", className: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200" },
      { variant: "solid", color: "primary", className: "bg-primary text-primary-foreground" },
      { variant: "solid", color: "secondary", className: "bg-secondary text-secondary-foreground" },
      { variant: "solid", color: "success", className: "bg-emerald-500 text-white" },
      { variant: "solid", color: "warning", className: "bg-amber-500 text-white" },
      { variant: "solid", color: "danger", className: "bg-red-500 text-white" },

      // Bordered variants
      { variant: "bordered", color: "default", className: "border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300" },
      { variant: "bordered", color: "primary", className: "border-primary text-primary" },
      { variant: "bordered", color: "secondary", className: "border-secondary text-secondary-foreground" },
      { variant: "bordered", color: "success", className: "border-emerald-500 text-emerald-600 dark:text-emerald-400" },
      { variant: "bordered", color: "warning", className: "border-amber-500 text-amber-600 dark:text-amber-400" },
      { variant: "bordered", color: "danger", className: "border-red-500 text-red-600 dark:text-red-400" },

      // Light variants
      { variant: "light", color: "default", className: "bg-zinc-500/20 text-zinc-700 dark:text-zinc-300" },
      { variant: "light", color: "primary", className: "bg-primary/20 text-primary dark:text-primary" },
      { variant: "light", color: "secondary", className: "bg-secondary/40 text-secondary-foreground" },
      { variant: "light", color: "success", className: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
      { variant: "light", color: "warning", className: "bg-amber-500/20 text-amber-700 dark:text-amber-400" },
      { variant: "light", color: "danger", className: "bg-red-500/20 text-red-700 dark:text-red-400" },

      // Flat variants
      { variant: "flat", color: "default", className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
      { variant: "flat", color: "primary", className: "bg-primary/15 text-primary" },
      { variant: "flat", color: "secondary", className: "bg-secondary/50 text-secondary-foreground" },
      { variant: "flat", color: "success", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
      { variant: "flat", color: "warning", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
      { variant: "flat", color: "danger", className: "bg-red-500/15 text-red-700 dark:text-red-400" },

      // Faded variants
      { variant: "faded", color: "default", className: "border-zinc-200 bg-zinc-100/50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400" },
      { variant: "faded", color: "primary", className: "border-primary/30 bg-primary/10 text-primary/80" },
      { variant: "faded", color: "secondary", className: "border-secondary/30 bg-secondary/20 text-secondary-foreground/80" },
      { variant: "faded", color: "success", className: "border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400" },
      { variant: "faded", color: "warning", className: "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400" },
      { variant: "faded", color: "danger", className: "border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400" },

      // Shadow variants
      { variant: "shadow", color: "default", className: "bg-zinc-200 text-zinc-800 shadow-zinc-400/50 dark:bg-zinc-700 dark:text-zinc-200 dark:shadow-zinc-900/50" },
      { variant: "shadow", color: "primary", className: "bg-primary text-primary-foreground shadow-primary/40" },
      { variant: "shadow", color: "secondary", className: "bg-secondary text-secondary-foreground shadow-secondary/40" },
      { variant: "shadow", color: "success", className: "bg-emerald-500 text-white shadow-emerald-500/40" },
      { variant: "shadow", color: "warning", className: "bg-amber-500 text-white shadow-amber-500/40" },
      { variant: "shadow", color: "danger", className: "bg-red-500 text-white shadow-red-500/40" },

      // Dot variants (text only, dot provides color)
      { variant: "dot", color: "default", className: "text-zinc-700 dark:text-zinc-300" },
      { variant: "dot", color: "primary", className: "text-primary" },
      { variant: "dot", color: "secondary", className: "text-secondary-foreground" },
      { variant: "dot", color: "success", className: "text-emerald-700 dark:text-emerald-400" },
      { variant: "dot", color: "warning", className: "text-amber-700 dark:text-amber-400" },
      { variant: "dot", color: "danger", className: "text-red-700 dark:text-red-400" },

      // BASE COLORS - Solid variants
      { variant: "solid", color: "blue", className: "bg-blue-500 text-white dark:bg-blue-600" },
      { variant: "solid", color: "green", className: "bg-green-500 text-white dark:bg-green-600" },
      { variant: "solid", color: "pink", className: "bg-pink-500 text-white dark:bg-pink-600" },
      { variant: "solid", color: "purple", className: "bg-purple-500 text-white dark:bg-purple-600" },
      { variant: "solid", color: "red", className: "bg-red-500 text-white dark:bg-red-600" },
      { variant: "solid", color: "yellow", className: "bg-yellow-500 text-white dark:bg-yellow-600" },
      { variant: "solid", color: "cyan", className: "bg-cyan-500 text-white dark:bg-cyan-600" },
      { variant: "solid", color: "zinc", className: "bg-zinc-500 text-white dark:bg-zinc-600" },

      // BASE COLORS - Bordered variants
      { variant: "bordered", color: "blue", className: "border-blue-500 text-blue-600 dark:text-blue-400" },
      { variant: "bordered", color: "green", className: "border-green-500 text-green-600 dark:text-green-400" },
      { variant: "bordered", color: "pink", className: "border-pink-500 text-pink-600 dark:text-pink-400" },
      { variant: "bordered", color: "purple", className: "border-purple-500 text-purple-600 dark:text-purple-400" },
      { variant: "bordered", color: "red", className: "border-red-500 text-red-600 dark:text-red-400" },
      { variant: "bordered", color: "yellow", className: "border-yellow-500 text-yellow-600 dark:text-yellow-400" },
      { variant: "bordered", color: "cyan", className: "border-cyan-500 text-cyan-600 dark:text-cyan-400" },
      { variant: "bordered", color: "zinc", className: "border-zinc-500 text-zinc-600 dark:text-zinc-400" },

      // BASE COLORS - Light variants
      { variant: "light", color: "blue", className: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
      { variant: "light", color: "green", className: "bg-green-500/20 text-green-700 dark:text-green-400" },
      { variant: "light", color: "pink", className: "bg-pink-500/20 text-pink-700 dark:text-pink-400" },
      { variant: "light", color: "purple", className: "bg-purple-500/20 text-purple-700 dark:text-purple-400" },
      { variant: "light", color: "red", className: "bg-red-500/20 text-red-700 dark:text-red-400" },
      { variant: "light", color: "yellow", className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" },
      { variant: "light", color: "cyan", className: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400" },
      { variant: "light", color: "zinc", className: "bg-zinc-500/20 text-zinc-700 dark:text-zinc-400" },

      // BASE COLORS - Flat variants
      { variant: "flat", color: "blue", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
      { variant: "flat", color: "green", className: "bg-green-500/15 text-green-700 dark:text-green-400" },
      { variant: "flat", color: "pink", className: "bg-pink-500/15 text-pink-700 dark:text-pink-400" },
      { variant: "flat", color: "purple", className: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
      { variant: "flat", color: "red", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
      { variant: "flat", color: "yellow", className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
      { variant: "flat", color: "cyan", className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400" },
      { variant: "flat", color: "zinc", className: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400" },

      // BASE COLORS - Faded variants
      { variant: "faded", color: "blue", className: "border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400" },
      { variant: "faded", color: "green", className: "border-green-300 bg-green-50 text-green-600 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400" },
      { variant: "faded", color: "pink", className: "border-pink-300 bg-pink-50 text-pink-600 dark:border-pink-800 dark:bg-pink-950/50 dark:text-pink-400" },
      { variant: "faded", color: "purple", className: "border-purple-300 bg-purple-50 text-purple-600 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-400" },
      { variant: "faded", color: "red", className: "border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400" },
      { variant: "faded", color: "yellow", className: "border-yellow-300 bg-yellow-50 text-yellow-600 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-400" },
      { variant: "faded", color: "cyan", className: "border-cyan-300 bg-cyan-50 text-cyan-600 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-400" },
      { variant: "faded", color: "zinc", className: "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400" },

      // BASE COLORS - Shadow variants
      { variant: "shadow", color: "blue", className: "bg-blue-500 text-white shadow-blue-500/40" },
      { variant: "shadow", color: "green", className: "bg-green-500 text-white shadow-green-500/40" },
      { variant: "shadow", color: "pink", className: "bg-pink-500 text-white shadow-pink-500/40" },
      { variant: "shadow", color: "purple", className: "bg-purple-500 text-white shadow-purple-500/40" },
      { variant: "shadow", color: "red", className: "bg-red-500 text-white shadow-red-500/40" },
      { variant: "shadow", color: "yellow", className: "bg-yellow-500 text-white shadow-yellow-500/40" },
      { variant: "shadow", color: "cyan", className: "bg-cyan-500 text-white shadow-cyan-500/40" },
      { variant: "shadow", color: "zinc", className: "bg-zinc-500 text-white shadow-zinc-500/40" },

      // BASE COLORS - Dot variants
      { variant: "dot", color: "blue", className: "text-blue-700 dark:text-blue-400" },
      { variant: "dot", color: "green", className: "text-green-700 dark:text-green-400" },
      { variant: "dot", color: "pink", className: "text-pink-700 dark:text-pink-400" },
      { variant: "dot", color: "purple", className: "text-purple-700 dark:text-purple-400" },
      { variant: "dot", color: "red", className: "text-red-700 dark:text-red-400" },
      { variant: "dot", color: "yellow", className: "text-yellow-700 dark:text-yellow-400" },
      { variant: "dot", color: "cyan", className: "text-cyan-700 dark:text-cyan-400" },
      { variant: "dot", color: "zinc", className: "text-zinc-700 dark:text-zinc-400" },
    ],
    defaultVariants: {
      variant: "solid",
      color: "default",
      size: "md",
    },
  }
)

const dotColorVariants: Record<string, string> = {
  // Semantic colors
  default: "bg-zinc-500",
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  // Base colors
  blue: "bg-blue-500",
  green: "bg-green-500",
  pink: "bg-pink-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  cyan: "bg-cyan-500",
  zinc: "bg-zinc-500",
}

const dotSizeVariants: Record<string, string> = {
  sm: "size-1.5",
  md: "size-2",
  lg: "size-2.5",
}

export interface ChipProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof chipVariants> {
  /** Show dot indicator (always shown for "dot" variant) */
  showDot?: boolean
}

function Chip({
  className,
  variant = "solid",
  color = "default",
  size = "md",
  showDot,
  children,
  ...props
}: ChipProps) {
  const shouldShowDot = showDot || variant === "dot"
  const colorKey = color ?? "default"
  const sizeKey = size ?? "md"

  return (
    <span
      data-slot="chip"
      data-variant={variant}
      data-color={color}
      className={cn(chipVariants({ variant, color, size }), className)}
      {...props}
    >
      {shouldShowDot && (
        <span
          className={cn(
            "rounded-full shrink-0",
            dotColorVariants[colorKey],
            dotSizeVariants[sizeKey]
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

export type ChipVariant = NonNullable<VariantProps<typeof chipVariants>["variant"]>
export type ChipColor = NonNullable<VariantProps<typeof chipVariants>["color"]>
export type ChipSize = NonNullable<VariantProps<typeof chipVariants>["size"]>

export { Chip, chipVariants }
