import * as React from 'react'
import { cn } from '@/lib/utils'

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('border border-dashed rounded-lg', className)} {...props} />
}

export { Empty }
