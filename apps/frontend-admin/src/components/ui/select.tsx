"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Helper to recursively extract <option> elements from nested children
// (SelectTrigger, SelectContent, etc. render null but their children get passed through)
function extractOptions(children: React.ReactNode): React.ReactNode[] {
  const options: React.ReactNode[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as Record<string, unknown>
    // If it's an <option>, keep it
    if (child.type === 'option' || (child.type as React.FC)?.displayName === 'SelectItem') {
      options.push(child)
    }
    // If it has children, recurse
    if (props.children != null) {
      options.push(...extractOptions(props.children as React.ReactNode))
    }
  })
  return options
}

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  className?: string
  id?: string
  disabled?: boolean
}

function Select({
  className,
  value,
  onValueChange,
  children,
  id,
  disabled,
}: SelectProps) {
  // Find placeholder from SelectValue if present
  let placeholder: string | undefined
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as Record<string, unknown>
    if (props.children != null) {
      React.Children.forEach(props.children as React.ReactNode, (grandchild) => {
        if (!React.isValidElement(grandchild)) return
        const gProps = grandchild.props as Record<string, unknown>
        if (gProps.placeholder != null) {
          placeholder = gProps.placeholder as string
        }
      })
    }
    if (props.placeholder != null) {
      placeholder = props.placeholder as string
    }
  })

  const options = extractOptions(children)

  return (
    <select
      data-slot="select"
      className={cn("select select-bordered w-full", className)}
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
      id={id}
      disabled={disabled}
    >
      {placeholder && !value && (
        <option value="" disabled>{placeholder}</option>
      )}
      {options}
    </select>
  )
}

function SelectTrigger({ children, ...props }: { children?: React.ReactNode; className?: string; id?: string; [key: string]: unknown }) {
  return <>{children}</>
}

function SelectContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function SelectValue({ placeholder, children }: { placeholder?: string; children?: React.ReactNode }) {
  return null
}

function SelectItem({
  children,
  value,
  ...props
}: { children: React.ReactNode; value: string; className?: string; disabled?: boolean }) {
  return (
    <option value={value} {...props}>
      {typeof children === 'string' ? children : value}
    </option>
  )
}
SelectItem.displayName = 'SelectItem'

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function SelectLabel({ children }: { children: React.ReactNode }) {
  return <option disabled>{children}</option>
}

function SelectSeparator() {
  return null
}

function SelectScrollUpButton() {
  return null
}

function SelectScrollDownButton() {
  return null
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
