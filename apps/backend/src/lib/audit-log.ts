import type { Request } from 'express'
import type { AuditAction, AuditRepository } from '../repositories/audit-repository.js'

type AuditedMember = {
  id?: string
  rank?: string
  firstName?: string
  lastName?: string
  displayName?: string | null
  serviceNumber?: string
}

type AuditedRequest = Pick<Request, 'ip' | 'socket'> & {
  member?: AuditedMember
}

export function getAuditClientIp(req: AuditedRequest): string {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

export function formatAuditMemberName(member?: AuditedMember | null): string | null {
  if (!member) {
    return null
  }

  if (typeof member.displayName === 'string' && member.displayName.trim().length > 0) {
    return member.displayName.trim()
  }

  const nameParts = [member.rank, member.firstName, member.lastName].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  )

  if (nameParts.length === 0) {
    return null
  }

  return nameParts.join(' ')
}

export function getAuditActorDetails(req: AuditedRequest) {
  const actorName = formatAuditMemberName(req.member)

  if (!req.member) {
    return {
      actorMemberId: null,
      actorName: null,
      actorServiceNumber: null,
      actorType: 'system' as const,
    }
  }

  return {
    actorMemberId: req.member.id ?? null,
    actorName,
    actorServiceNumber: req.member.serviceNumber ?? null,
    actorType: 'member' as const,
  }
}

export async function logRequestAudit(
  auditRepo: AuditRepository,
  req: AuditedRequest,
  entry: {
    action: AuditAction
    entityType: string
    entityId: string | null
    details?: Record<string, unknown>
  }
): Promise<void> {
  await auditRepo.log({
    adminUserId: null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: {
      ...getAuditActorDetails(req),
      ...(entry.details ?? {}),
    },
    ipAddress: getAuditClientIp(req),
  })
}
