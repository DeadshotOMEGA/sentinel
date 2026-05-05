import type { ComponentPropsWithoutRef } from 'react'
import {
  Activity,
  ArrowUpDown,
  BadgePlus,
  BookOpen,
  Clock3,
  Database,
  Download,
  ListChecks,
  Network,
  ScrollText,
  Shield,
  Terminal,
} from 'lucide-react'
import type { AdminIconKey } from '@/lib/admin-routes'

interface AdminIconProps extends ComponentPropsWithoutRef<typeof Activity> {
  icon: AdminIconKey
}

export function AdminIcon({ icon, ...props }: AdminIconProps) {
  switch (icon) {
    case 'activity':
      return <Activity {...props} />
    case 'arrow-up-down':
      return <ArrowUpDown {...props} />
    case 'badge':
      return <BadgePlus {...props} />
    case 'book-open':
      return <BookOpen {...props} />
    case 'clock':
      return <Clock3 {...props} />
    case 'database':
      return <Database {...props} />
    case 'download':
      return <Download {...props} />
    case 'list':
      return <ListChecks {...props} />
    case 'logs':
      return <ScrollText {...props} />
    case 'network':
      return <Network {...props} />
    case 'shield':
      return <Shield {...props} />
    case 'terminal':
      return <Terminal {...props} />
  }
}
