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
import { Button } from '@/components/ui/button'

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
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto min-h-0">
          <pre className="bg-muted rounded-md p-4 text-sm font-mono overflow-x-auto">
            <code className="text-foreground">{formattedJson}</code>
          </pre>
        </div>
        <DialogFooter showCloseButton>
          <Button variant="outline" onClick={handleCopy}>
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
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
