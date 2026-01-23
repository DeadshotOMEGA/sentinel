import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { NotFoundError, ValidationError } from '../middleware/error-handler.js'
import { Prisma } from '@sentinel/database'

import { broadcastSecurityAlert } from '../websocket/broadcast.js'

type AlertType = 'badge_disabled' | 'badge_unknown' | 'inactive_member' | 'unauthorized_access'
type AlertSeverity = 'critical' | 'warning' | 'info'

interface CreateAlertData {
  alertType: AlertType
  severity: AlertSeverity
  badgeSerial: string | null
  memberId?: string | null
  kioskId: string
  message: string
  details?: Record<string, unknown>
}

interface ActiveAlert {
  id: string
  alertType: string
  severity: string
  badgeSerial: string | null
  memberId: string | null
  kioskId: string
  message: string
  details: unknown
  status: string
  createdAt: Date
}

export class SecurityAlertService {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient()
  }

  /**
   * Create a new security alert and broadcast it via WebSocket
   */
  async createAlert(data: CreateAlertData): Promise<ActiveAlert> {
    const alert = await this.prisma.securityAlert.create({
      data: {
        alertType: data.alertType,
        severity: data.severity,
        badgeSerial: data.badgeSerial,
        memberId: data.memberId ?? null,
        kioskId: data.kioskId,
        message: data.message,
        details: data.details ? (data.details as Prisma.InputJsonValue) : Prisma.JsonNull,
        status: 'active',
      },
    })

    // Broadcast security alert to admin subscribers
    broadcastSecurityAlert({
      id: alert.id,
      alertType: alert.alertType as AlertType,
      severity: alert.severity as AlertSeverity,
      badgeSerial: alert.badgeSerial,
      kioskId: alert.kioskId,
      message: alert.message,
      createdAt: alert.createdAt.toISOString(),
    })

    return {
      id: alert.id,
      alertType: alert.alertType,
      severity: alert.severity,
      badgeSerial: alert.badgeSerial,
      memberId: alert.memberId,
      kioskId: alert.kioskId,
      message: alert.message,
      details: alert.details,
      status: alert.status,
      createdAt: alert.createdAt,
    }
  }

  /**
   * Get all active (unacknowledged) security alerts
   */
  async getActiveAlerts(): Promise<ActiveAlert[]> {
    const alerts = await this.prisma.securityAlert.findMany({
      where: {
        status: 'active',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return alerts.map((alert) => ({
      id: alert.id,
      alertType: alert.alertType,
      severity: alert.severity,
      badgeSerial: alert.badgeSerial,
      memberId: alert.memberId,
      kioskId: alert.kioskId,
      message: alert.message,
      details: alert.details,
      status: alert.status,
      createdAt: alert.createdAt,
    }))
  }

  /**
   * Acknowledge a security alert
   */
  async acknowledgeAlert(
    alertId: string,
    adminId: string,
    note?: string
  ): Promise<ActiveAlert> {
    // Check if alert exists
    const existing = await this.prisma.securityAlert.findUnique({
      where: { id: alertId },
    })

    if (!existing) {
      throw new NotFoundError('SecurityAlert', alertId)
    }

    if (existing.status !== 'active') {
      throw new ValidationError(`Security alert ${alertId} is already ${existing.status}`)
    }

    const alert = await this.prisma.securityAlert.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        acknowledgedBy: adminId,
        acknowledgedAt: new Date(),
        acknowledgeNote: note ?? null,
      },
    })

    return {
      id: alert.id,
      alertType: alert.alertType,
      severity: alert.severity,
      badgeSerial: alert.badgeSerial,
      memberId: alert.memberId,
      kioskId: alert.kioskId,
      message: alert.message,
      details: alert.details,
      status: alert.status,
      createdAt: alert.createdAt,
    }
  }
}

export const securityAlertService = new SecurityAlertService()
