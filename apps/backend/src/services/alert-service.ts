import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import { broadcastSecurityAlert } from '../websocket/broadcast.js'
import { logger } from '../lib/logger.js'

// ============================================================================
// Alert Types
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertType =
  | 'lockup_reminder'
  | 'lockup_not_executed'
  | 'duty_watch_missing'
  | 'duty_watch_not_checked_in'
  | 'building_not_secured'
  | 'member_missed_checkout'
  | 'system'

export interface AlertData {
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  data?: Record<string, unknown>
}

export interface StoredAlert extends AlertData {
  id: string
  status: 'active' | 'acknowledged' | 'dismissed'
  createdAt: Date
  acknowledgedAt: Date | null
  acknowledgedBy: string | null
}

// ============================================================================
// Alert Service
// ============================================================================

/**
 * Service for managing system alerts
 *
 * Handles creating, storing, broadcasting, and resolving alerts
 * related to lockup, duty watch, and system events.
 */
export class AlertService {
  private prisma: PrismaClientInstance

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
  }

  /**
   * Create and broadcast an alert
   */
  async createAlert(alert: AlertData): Promise<StoredAlert> {
    logger.info('Creating alert', {
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
    })

    // Store alert in database
    // Note: alertType is cast because the database schema supports any string up to 50 chars,
    // but the Prisma types are restricted to legacy badge alert types. This is safe for VARCHAR columns.
    const stored = await this.prisma.securityAlert.create({
      data: {
        alertType: alert.type as 'badge_disabled', // Type cast - DB accepts any VARCHAR(50)
        severity: alert.severity,
        message: alert.message,
        status: 'active',
        kioskId: 'SYSTEM',
        // Cast to InputJsonValue - Prisma requires explicit JSON typing
        ...(alert.data && { details: JSON.parse(JSON.stringify(alert.data)) }),
      },
    })

    // Broadcast alert via Socket.IO
    broadcastSecurityAlert({
      id: stored.id,
      alertType: alert.type,
      severity: alert.severity,
      message: `${alert.title}: ${alert.message}`,
      status: 'active',
      timestamp: stored.createdAt.toISOString(),
      acknowledgedAt: null,
    })

    return {
      id: stored.id,
      ...alert,
      status: 'active',
      createdAt: stored.createdAt,
      acknowledgedAt: null,
      acknowledgedBy: null,
    }
  }

  /**
   * Emit a lockup reminder alert
   */
  async emitLockupReminder(severity: 'warning' | 'critical'): Promise<StoredAlert> {
    const title = severity === 'warning' ? 'Lockup Reminder' : 'Lockup Overdue'
    const message =
      severity === 'warning'
        ? 'Building has not been secured. Please complete lockup procedures.'
        : 'Building lockup is overdue. Immediate action required.'

    return this.createAlert({
      type: severity === 'warning' ? 'lockup_reminder' : 'lockup_not_executed',
      severity,
      title,
      message,
    })
  }

  /**
   * Emit a duty watch alert
   */
  async emitDutyWatchAlert(
    reason: 'missing' | 'not_checked_in',
    details: {
      missingPositions?: string[]
      notCheckedIn?: Array<{ name: string; position: string }>
    }
  ): Promise<StoredAlert> {
    const isMissing = reason === 'missing'
    const title = isMissing ? 'Duty Watch Incomplete' : 'Duty Watch Not Checked In'

    let message: string
    if (isMissing && details.missingPositions) {
      message = `Duty Watch is missing personnel for: ${details.missingPositions.join(', ')}`
    } else if (details.notCheckedIn && details.notCheckedIn.length > 0) {
      const names = details.notCheckedIn.map((m) => `${m.name} (${m.position})`).join(', ')
      message = `Duty Watch members not checked in: ${names}`
    } else {
      message = 'Duty Watch has unresolved issues. Please verify team status.'
    }

    return this.createAlert({
      type: isMissing ? 'duty_watch_missing' : 'duty_watch_not_checked_in',
      severity: 'warning',
      title,
      message,
      data: details,
    })
  }

  /**
   * Emit building not secured alert (after 3am reset)
   */
  async emitBuildingNotSecuredAlert(): Promise<StoredAlert> {
    return this.createAlert({
      type: 'building_not_secured',
      severity: 'critical',
      title: 'Building Not Secured',
      message: 'Building was not properly secured before the end of day. Review lockup procedures.',
    })
  }

  /**
   * Emit missed checkout alert
   */
  async emitMissedCheckoutAlert(members: Array<{ name: string; id: string }>): Promise<StoredAlert> {
    const names = members.map((m) => m.name).join(', ')

    return this.createAlert({
      type: 'member_missed_checkout',
      severity: 'warning',
      title: 'Members Missed Checkout',
      message: `${members.length} member(s) were force-checked out during daily reset: ${names}`,
      data: { members },
    })
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    await this.prisma.securityAlert.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
    })

    logger.info('Alert acknowledged', { alertId, acknowledgedBy })
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: string): Promise<void> {
    await this.prisma.securityAlert.update({
      where: { id: alertId },
      data: {
        status: 'dismissed',
      },
    })

    logger.info('Alert dismissed', { alertId })
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<StoredAlert[]> {
    const alerts = await this.prisma.securityAlert.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
    })

    return alerts.map((a) => ({
      id: a.id,
      type: a.alertType as AlertType,
      severity: a.severity as AlertSeverity,
      title: this.getAlertTitle(a.alertType as AlertType),
      message: a.message || '',
      status: a.status as 'active' | 'acknowledged' | 'dismissed',
      createdAt: a.createdAt,
      acknowledgedAt: a.acknowledgedAt,
      acknowledgedBy: a.acknowledgedBy,
    }))
  }

  /**
   * Get alert title from type
   */
  private getAlertTitle(type: AlertType): string {
    const titles: Record<AlertType, string> = {
      lockup_reminder: 'Lockup Reminder',
      lockup_not_executed: 'Lockup Overdue',
      duty_watch_missing: 'Duty Watch Incomplete',
      duty_watch_not_checked_in: 'Duty Watch Not Checked In',
      building_not_secured: 'Building Not Secured',
      member_missed_checkout: 'Missed Checkout',
      system: 'System Alert',
    }
    return titles[type] || 'Alert'
  }
}
