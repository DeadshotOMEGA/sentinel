"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const DropdownContext = React.createContext<{ popoverId: string; anchorName: string } | null>(null)

function useDropdownContext() {
  const ctx = React.useContext(DropdownContext)
  if (!ctx) throw new Error("Dropdown components must be used within <DropdownMenu>")
  return ctx
}

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const id = React.useId()
  const popoverId = `dropdown${id}`
  const anchorName = `--anchor${id}`

  return (
    <DropdownContext.Provider value={{ popoverId, anchorName }}>
      {children}
    </DropdownContext.Provider>
  )
}

function DropdownMenuTrigger({
  className,
  asChild: _asChild,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { popoverId, anchorName } = useDropdownContext()

  return (
    <button
      type="button"
      data-slot="dropdown-menu-trigger"
      popoverTarget={popoverId}
      className={className}
      style={{ anchorName } as React.CSSProperties}
      {...props}
    >
      {children}
    </button>
  )
}

function DropdownMenuContent({
  className,
  align: _align,
  sideOffset: _sideOffset,
  children,
  ...props
}: React.ComponentProps<"ul"> & { align?: string; sideOffset?: number }) {
  const { popoverId, anchorName } = useDropdownContext()

  return (
    <ul
      popover="auto"
      id={popoverId}
      data-slot="dropdown-menu-content"
      className={cn(
        "dropdown menu bg-base-100 text-base-content rounded-box w-52 p-2 shadow-xl",
        className
      )}
      style={{ positionAnchor: anchorName } as React.CSSProperties}
      {...props}
    >
      {children}
    </ul>
  )
}

function DropdownMenuGroup({ children, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dropdown-menu-group" {...props}>{children}</div>
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  onClick,
  children,
  ...props
}: React.ComponentProps<"li"> & {
  inset?: boolean
  variant?: "default" | "destructive"
  onClick?: () => void
}) {
  return (
    <li data-slot="dropdown-menu-item" data-variant={variant} {...props}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          variant === "destructive" && "text-error",
          inset && "pl-8",
          className
        )}
      >
        {children}
      </button>
    </li>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<"li"> & { inset?: boolean }) {
  return (
    <li data-slot="dropdown-menu-label" className={cn("menu-title", inset && "pl-8", className)} {...props}>
      {children}
    </li>
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("border-base-content/10 border-t my-1", className)} {...props} />
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ml-auto text-xs opacity-50", className)}
      {...props}
    />
  )
}

// Compatibility stubs for unused sub-components
function DropdownMenuPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuSub({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuSubTrigger({ children, ...props }: React.ComponentProps<"li"> & { inset?: boolean }) {
  return <li {...props}><a>{children}</a></li>
}

function DropdownMenuSubContent({ children, ...props }: React.ComponentProps<"ul">) {
  return <ul className="menu" {...props}>{children}</ul>
}

function DropdownMenuCheckboxItem({ children, checked, ...props }: React.ComponentProps<"li"> & { checked?: boolean }) {
  return <li {...props}><a>{checked && "✓ "}{children}</a></li>
}

function DropdownMenuRadioGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuRadioItem({ children, ...props }: React.ComponentProps<"li">) {
  return <li {...props}><a>{children}</a></li>
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
