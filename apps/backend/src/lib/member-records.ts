import type { MemberSource } from '@sentinel/types'

export type MemberScope = MemberSource | 'all'

interface ResolveMemberTypePersistenceInput {
  mode: 'create' | 'update'
  requestedMemberType?: string
  requestedMemberTypeId?: string | null
  resolvedMemberTypeCodeById?: string | null
  resolvedMemberTypeIdByCode?: string | null
  defaultMemberType?: string
}

export function resolveMemberScope(
  requestedScope: MemberScope | undefined,
  isAdmin: boolean
): MemberScope {
  if (!isAdmin) {
    return 'nominal_roll'
  }

  return requestedScope ?? 'nominal_roll'
}

export function resolveMemberTypePersistence({
  mode,
  requestedMemberType,
  requestedMemberTypeId,
  resolvedMemberTypeCodeById,
  resolvedMemberTypeIdByCode,
  defaultMemberType = 'class_a',
}: ResolveMemberTypePersistenceInput): {
  memberType?: string
  memberTypeId?: string | null
} {
  if (requestedMemberTypeId !== undefined) {
    return {
      memberType: resolvedMemberTypeCodeById ?? requestedMemberType ?? defaultMemberType,
      memberTypeId: requestedMemberTypeId,
    }
  }

  if (requestedMemberType !== undefined) {
    return {
      memberType: requestedMemberType,
      memberTypeId: resolvedMemberTypeIdByCode ?? null,
    }
  }

  if (mode === 'create') {
    return {
      memberType: defaultMemberType,
      memberTypeId: resolvedMemberTypeIdByCode ?? null,
    }
  }

  return {}
}
