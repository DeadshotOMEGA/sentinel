"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null)

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [open])

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => {
      onOpenChange?.(false)
    }

    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onOpenChange])

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      data-slot="dialog"
    >
      {children}
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-content"
      className={cn("modal-box", className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <form method="dialog" className="absolute top-4 right-4">
          <button
            data-slot="dialog-close"
            className="btn btn-sm btn-circle btn-ghost"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </form>
      )}
    </div>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 mb-4", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  children,
  showCloseButton = false,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("modal-action", className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <form method="dialog">
          <button className="btn btn-outline">Close</button>
        </form>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-base-content/60 text-sm", className)}
      {...props}
    />
  )
}

// Compatibility stubs — these are no-ops for DaisyUI but keep imports working
function DialogTrigger({ children, ...props }: React.ComponentProps<"button">) {
  return <button data-slot="dialog-trigger" {...props}>{children}</button>
}

function DialogClose({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <form method="dialog" style={{ display: 'inline' }}>
      <button data-slot="dialog-close" {...props}>{children}</button>
    </form>
  )
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DialogOverlay({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-overlay" className={cn("modal-backdrop", className)} {...props} />
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
