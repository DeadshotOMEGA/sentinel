import { prisma } from '../prisma';
import type { AuditLog as PrismaAuditLog, Prisma } from '@prisma/client';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'member_create'
  | 'member_update'
  | 'member_delete'
  | 'member_bulk_update'
  | 'member_tag_add'
  | 'member_tag_remove'
  | 'badge_assign'
  | 'badge_unassign'
  | 'badge_status_change'
  | 'badge_create'
  | 'badge_delete'
  | 'admin_create'
  | 'admin_update'
  | 'admin_delete'
  | 'import_preview'
  | 'import_execute'
  | 'tag_create'
  | 'tag_update'
  | 'tag_delete'
  | 'event_create'
  | 'event_update'
  | 'event_delete'
  | 'attendee_import'
  | 'dev_tools_access'
  | 'dev_tools_clear_all'
  | 'dev_tools_clear_table'
  | 'dev_tools_reset'
  | 'dev_tools_simulate'
  | 'dev_tools_backdate_members'
  | 'dev_tools_seed_scenario';

interface AuditLogEntry {
  adminUserId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  ipAddress: string;
}

export class AuditRepository {
  async log(entry: AuditLogEntry): Promise<void> {
    await prisma.auditLog.create({
      data: {
        adminUserId: entry.adminUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details as Prisma.JsonObject,
        ipAddress: entry.ipAddress,
      },
    });
  }
}

export const auditRepository = new AuditRepository();
