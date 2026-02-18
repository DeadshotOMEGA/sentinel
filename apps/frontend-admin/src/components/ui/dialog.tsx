'use client'

import * as React from 'react'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODAL_SIZE, type ModalSize } from '@/lib/constants/modal-sizes'

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  dismissible?: boolean
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, dismissible = true, children }: DialogProps) {
  const dialogRef = React.useRef<React.ElementRef<'dialog'>>(null)

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

    const handleCancel = (event: Event) => {
      if (!dismissible) {
        event.preventDefault()
      }
    }

    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [dismissible])

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
    <dialog ref={dialogRef} className="modal" data-slot="dialog">
      {children}
      {dismissible && (
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      )}
    </dialog>
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size,
  testId,
  closeButtonTestId,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
  size?: ModalSize
  testId?: string
  closeButtonTestId?: string
}) {
  return (
    <div
      data-slot="dialog-content"
      data-testid={testId}
      className={cn('modal-box text-base-content', size && MODAL_SIZE[size], className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <form method="dialog" className="absolute top-4 right-4">
          <button
            data-slot="dialog-close"
            data-testid={closeButtonTestId}
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

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 mb-4', className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  children,
  showCloseButton = false,
  ...props
}: React.ComponentProps<'div'> & { showCloseButton?: boolean }) {
  return (
    <div data-slot="dialog-footer" className={cn('modal-action', className)} {...props}>
      {children}
      {showCloseButton && (
        <form method="dialog">
          <button className="btn btn-outline">Close</button>
        </form>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3 data-slot="dialog-title" className={cn('text-lg font-semibold', className)} {...props} />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="dialog-description"
      className={cn('text-base-content/60 text-sm', className)}
      {...props}
    />
  )
}

// Compatibility stubs — these are no-ops for DaisyUI but keep imports working
function DialogTrigger({ children, ...props }: React.ComponentProps<'button'>) {
  return (
    <button data-slot="dialog-trigger" {...props}>
      {children}
    </button>
  )
}

function DialogClose({ children, ...props }: React.ComponentProps<'button'>) {
  return (
    <form method="dialog" style={{ display: 'inline' }}>
      <button data-slot="dialog-close" {...props}>
        {children}
      </button>
    </form>
  )
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DialogOverlay({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-overlay" className={cn('modal-backdrop', className)} {...props} />
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
