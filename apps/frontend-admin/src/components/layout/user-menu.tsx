'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChangePinModal } from '@/components/auth/change-pin-modal'
import { User, LogOut, KeyRound } from 'lucide-react'
import { TID } from '@/lib/test-ids'

const LEVEL_LABELS: Record<number, string> = {
  [AccountLevel.BASIC]: 'Basic',
  [AccountLevel.QUARTERMASTER]: 'Quartermaster',
  [AccountLevel.LOCKUP]: 'Lockup',
  [AccountLevel.COMMAND]: 'Command',
  [AccountLevel.ADMIN]: 'Admin',
  [AccountLevel.DEVELOPER]: 'Developer',
}

export function UserMenu() {
  const router = useRouter()
  const { member, logout } = useAuthStore()
  const [changePinOpen, setChangePinOpen] = useState(false)

  const handleLogout = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Logout locally even if API call fails
    }
    logout()
    router.push('/login')
  }

  if (!member) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="btn btn-ghost btn-sm" testId={TID.nav.userMenu}>
          <User className="h-5 w-5" />
          {member.rank} {member.lastName}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            Signed in as {member.firstName} {member.lastName}
            <br />
            {LEVEL_LABELS[member.accountLevel] ?? `Level ${member.accountLevel}`}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setChangePinOpen(true)} testId={TID.nav.changePin}>
            <KeyRound className="h-5 w-5" />
            Change PIN
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} testId={TID.nav.logout}>
            <LogOut className="h-5 w-5" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePinModal open={changePinOpen} onOpenChange={setChangePinOpen} />
    </>
  )
}
