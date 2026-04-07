import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { AppError, NotFoundError, ValidationError } from '../middleware/error-handler.js'
import { AccountLevel } from '../middleware/roles.js'
import { Prisma } from '@sentinel/database'
import { getRuntimeAlertRateLimit } from '../lib/operational-timings-runtime.js'

import {
  broadcastSecurityAlert,
  broadcastSecurityAlertAcknowledged,
  type SecurityAlertType,
} from '../websocket/broadcast.js'

type AlertType = SecurityAlertType
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
    const rateLimitRule = getRuntimeAlertRateLimit(data.alertType)
    if (rateLimitRule) {
      const windowStart = new Date(Date.now() - rateLimitRule.timeWindowMinutes * 60 * 1000)
      const recentCount = await this.prisma.securityAlert.count({
        where: {
          alertType: data.alertType,
          createdAt: { gte: windowStart },
        },
      })

      if (recentCount >= rateLimitRule.threshold) {
        const latest = await this.prisma.securityAlert.findFirst({
          where: {
            alertType: data.alertType,
            createdAt: { gte: windowStart },
          },
          orderBy: { createdAt: 'desc' },
        })

        if (latest) {
          return {
            id: latest.id,
            alertType: latest.alertType,
            severity: latest.severity,
            badgeSerial: latest.badgeSerial,
            memberId: latest.memberId,
            kioskId: latest.kioskId,
            message: latest.message,
            details: latest.details,
            status: latest.status,
            createdAt: latest.createdAt,
          }
        }
      }
    }

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
      message: alert.message,
      status: 'active',
      timestamp: alert.createdAt.toISOString(),
      acknowledgedAt: null,
      badgeSerial: alert.badgeSerial,
      kioskId: alert.kioskId,
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
  async acknowledgeAlert(alertId: string, memberId: string, note?: string): Promise<ActiveAlert> {
    // Command-level operators and above can acknowledge operational alerts.
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, accountLevel: true },
    })

    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    if (member.accountLevel < AccountLevel.COMMAND) {
      throw new AppError(
        'Only Command, Admin, or Developer level members can acknowledge alerts',
        403,
        'FORBIDDEN'
      )
    }

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
        acknowledgedBy: memberId,
        acknowledgedAt: new Date(),
        acknowledgeNote: note ?? null,
      },
    })

    broadcastSecurityAlertAcknowledged({
      id: alert.id,
      alertType: alert.alertType as AlertType,
      severity: alert.severity as AlertSeverity,
      message: alert.message,
      status: 'acknowledged',
      timestamp: alert.acknowledgedAt?.toISOString() ?? new Date().toISOString(),
      acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
      badgeSerial: alert.badgeSerial,
      kioskId: alert.kioskId,
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
