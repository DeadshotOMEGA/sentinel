'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { registerOpenModal } from '@/lib/modal-root-scrollbar-gutter'

interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  children: React.ReactNode
}

function AlertDialog({ open, onOpenChange, className, children }: AlertDialogProps) {
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

    const handleClose = () => {
      onOpenChange?.(false)
    }

    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onOpenChange])

  React.useEffect(() => {
    if (!open) return
    return registerOpenModal()
  }, [open])

  return (
    <dialog ref={dialogRef} className={cn('modal', className)} data-slot="alert-dialog">
      {children}
    </dialog>
  )
}

function AlertDialogContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-content" className={cn('modal-box', className)} {...props} />
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 mb-4', className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('modal-action', className)} {...props} />
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-lg font-semibold', className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-base-content/60', className)} {...props} />
}

function AlertDialogAction({ className, ...props }: React.ComponentProps<'button'>) {
  return <button className={cn('btn btn-primary', className)} {...props} />
}

function AlertDialogCancel({ className, ...props }: React.ComponentProps<'button'>) {
  return <button className={cn('btn btn-outline', className)} {...props} />
}

// Compatibility stubs
function AlertDialogTrigger({ children, ...props }: React.ComponentProps<'button'>) {
  return <button {...props}>{children}</button>
}

function AlertDialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function AlertDialogOverlay(props: React.ComponentProps<'div'>) {
  return <div {...props} />
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
