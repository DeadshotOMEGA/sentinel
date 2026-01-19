import { prisma, Prisma } from '../db/prisma';
import { broadcastSecurityAlert } from '../websocket/broadcast';
import { getKioskName } from '../utils/kiosk-names';
import { NotFoundError, ValidationError } from '../utils/errors';
import type { SecurityAlertEvent } from '../websocket/events';

type AlertType = 'badge_disabled' | 'badge_unknown' | 'inactive_member';
type AlertSeverity = 'critical' | 'warning' | 'info';

interface CreateAlertData {
  alertType: AlertType;
  severity: AlertSeverity;
  badgeSerial: string | null;
  memberId?: string | null;
  kioskId: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ActiveAlert {
  id: string;
  alertType: string;
  severity: string;
  badgeSerial: string | null;
  memberId: string | null;
  kioskId: string;
  message: string;
  details: unknown;
  status: string;
  createdAt: Date;
}

export class SecurityAlertService {
  /**
   * Create a new security alert and broadcast it via WebSocket
   */
  async createAlert(data: CreateAlertData): Promise<ActiveAlert> {
    const alert = await prisma.securityAlert.create({
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
    });

    // Broadcast security alert to presence subscribers
    const alertEvent: SecurityAlertEvent = {
      id: alert.id,
      alertType: alert.alertType as AlertType,
      severity: alert.severity as AlertSeverity,
      badgeSerial: alert.badgeSerial,
      kioskId: alert.kioskId,
      kioskName: getKioskName(alert.kioskId),
      message: alert.message,
      createdAt: alert.createdAt.toISOString(),
    };

    broadcastSecurityAlert(alertEvent);

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
    };
  }

  /**
   * Get all active (unacknowledged) security alerts
   */
  async getActiveAlerts(): Promise<ActiveAlert[]> {
    const alerts = await prisma.securityAlert.findMany({
      where: {
        status: 'active',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

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
    }));
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
    const existing = await prisma.securityAlert.findUnique({
      where: { id: alertId },
    });

    if (!existing) {
      throw new NotFoundError(
        'ALERT_NOT_FOUND',
        `Security alert ${alertId} not found`,
        'The alert you are trying to acknowledge does not exist.'
      );
    }

    if (existing.status !== 'active') {
      throw new ValidationError(
        'ALERT_ALREADY_ACKNOWLEDGED',
        `Security alert ${alertId} is already ${existing.status}`,
        'This alert has already been acknowledged.'
      );
    }

    const alert = await prisma.securityAlert.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        acknowledgedBy: adminId,
        acknowledgedAt: new Date(),
        acknowledgeNote: note ?? null,
      },
    });

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
    };
  }
}

export const securityAlertService = new SecurityAlertService();
