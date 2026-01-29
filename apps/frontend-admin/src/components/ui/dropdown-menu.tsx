"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function DropdownMenu({ children }: { children: React.ReactNode }) {
  return <div className="dropdown dropdown-end" data-slot="dropdown-menu">{children}</div>
}

function DropdownMenuTrigger({
  className,
  asChild: _asChild,
  children,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  return (
    <div tabIndex={0} role="button" data-slot="dropdown-menu-trigger" className={className} {...props}>
      {children}
    </div>
  )
}

function DropdownMenuContent({
  className,
  align: _align,
  sideOffset: _sideOffset,
  children,
  ...props
}: React.ComponentProps<"ul"> & { align?: string; sideOffset?: number }) {
  return (
    <ul
      tabIndex={0}
      data-slot="dropdown-menu-content"
      className={cn(
        "dropdown-content menu bg-base-100 rounded-box z-50 w-56 p-2 shadow-lg border border-base-300",
        className
      )}
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
      <a
        onClick={onClick}
        className={cn(
          variant === "destructive" && "text-error hover:bg-error/10",
          inset && "pl-8",
          className
        )}
      >
        {children}
      </a>
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
    <li data-slot="dropdown-menu-label" className={cn("menu-title", inset && "pl-8")} {...props}>
      {children}
    </li>
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("divider", className)} {...props} />
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("text-base-content/50 ml-auto text-xs", className)}
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
