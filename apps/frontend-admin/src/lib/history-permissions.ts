import { AccountLevel } from '@/store/auth-store'

interface HistoryPermissionMember {
  id: string
  accountLevel: number
}

interface CurrentDdsLike {
  dds?: {
    member: {
      id: string
    }
    status: string
  } | null
}

export function getCurrentDdsEditorId(currentDds: CurrentDdsLike | undefined): string | null {
  const dds = currentDds?.dds

  if (!dds || dds.status === 'released') {
    return null
  }

  return dds.member.id
}

export function canEditHistoryEntries(
  member: HistoryPermissionMember | null | undefined,
  currentDdsMemberId: string | null
): boolean {
  if ((member?.accountLevel ?? 0) >= AccountLevel.ADMIN) {
    return true
  }

  return Boolean(member?.id && currentDdsMemberId && member.id === currentDdsMemberId)
}
