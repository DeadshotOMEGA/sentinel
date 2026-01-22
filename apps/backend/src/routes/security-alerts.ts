import { initServer } from '@ts-rest/express'
import { securityAlertContract } from '@sentinel/contracts'
import { SecurityAlertService } from '../services/security-alert-service.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()

const securityAlertService = new SecurityAlertService(getPrismaClient())

/**
 * Security alerts route implementation using ts-rest
 */
export const securityAlertsRouter = s.router(securityAlertContract, {
  /**
   * Get active security alerts
   */
  getActiveAlerts: async () => {
    try {
      const alerts = await securityAlertService.getActiveAlerts()

      return {
        status: 200 as const,
        body: {
          alerts: alerts.map((a) => ({
            id: a.id,
            alertType: a.alertType as 'badge_disabled' | 'badge_unknown' | 'inactive_member',
            severity: a.severity as 'critical' | 'warning' | 'info',
            badgeSerial: a.badgeSerial,
            memberId: a.memberId,
            kioskId: a.kioskId,
            message: a.message,
            details: a.details,
            status: a.status,
            createdAt: a.createdAt.toISOString(),
          })),
          count: alerts.length,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch active alerts',
        },
      }
    }
  },

  /**
   * Create a new security alert
   */
  createAlert: async ({ body }) => {
    try {
      const alert = await securityAlertService.createAlert({
        alertType: body.alertType,
        severity: body.severity,
        badgeSerial: body.badgeSerial,
        memberId: body.memberId ?? null,
        kioskId: body.kioskId,
        message: body.message,
        details: body.details,
      })

      return {
        status: 201 as const,
        body: {
          id: alert.id,
          alertType: alert.alertType as 'badge_disabled' | 'badge_unknown' | 'inactive_member' | 'unauthorized_access',
          severity: alert.severity as 'critical' | 'warning' | 'info',
          badgeSerial: alert.badgeSerial,
          memberId: alert.memberId,
          kioskId: alert.kioskId,
          message: alert.message,
          details: alert.details,
          status: alert.status,
          createdAt: alert.createdAt.toISOString(),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create security alert',
        },
      }
    }
  },

  /**
   * Acknowledge a security alert
   */
  acknowledgeAlert: async ({ params, body }) => {
    try {
      const alert = await securityAlertService.acknowledgeAlert(params.id, body.adminId, body.note)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Security alert acknowledged successfully',
          alert: {
            id: alert.id,
            alertType: alert.alertType as 'badge_disabled' | 'badge_unknown' | 'inactive_member' | 'unauthorized_access',
            severity: alert.severity as 'critical' | 'warning' | 'info',
            badgeSerial: alert.badgeSerial,
            memberId: alert.memberId,
            kioskId: alert.kioskId,
            message: alert.message,
            details: alert.details,
            status: alert.status,
            createdAt: alert.createdAt.toISOString(),
          },
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Security alert with ID '${params.id}' not found`,
          },
        }
      }

      if (error instanceof Error && error.message.includes('already')) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to acknowledge alert',
        },
      }
    }
  },

  /**
   * Get security alert by ID
   */
  getAlertById: async ({ params }) => {
    try {
      const alerts = await securityAlertService.getActiveAlerts()
      const alert = alerts.find((a) => a.id === params.id)

      if (!alert) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Security alert with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          id: alert.id,
          alertType: alert.alertType as 'badge_disabled' | 'badge_unknown' | 'inactive_member' | 'unauthorized_access',
          severity: alert.severity as 'critical' | 'warning' | 'info',
          badgeSerial: alert.badgeSerial,
          memberId: alert.memberId,
          kioskId: alert.kioskId,
          message: alert.message,
          details: alert.details,
          status: alert.status,
          createdAt: alert.createdAt.toISOString(),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch security alert',
        },
      }
    }
  },
})
