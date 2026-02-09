'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
interface JsonViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: unknown
  title?: string
}

export function JsonViewerModal({
  open,
  onOpenChange,
  value,
  title = 'JSON Data',
}: JsonViewerModalProps) {
  const [copied, setCopied] = useState(false)

  const formattedJson = JSON.stringify(value, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formattedJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto min-h-0">
          <pre className="bg-base-200 rounded-md p-4 text-sm font-mono overflow-x-auto">
            <code className="text-base-content">{formattedJson}</code>
          </pre>
        </div>
        <DialogFooter showCloseButton>
          <button type="button" className="btn btn-outline btn-md" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy JSON
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
