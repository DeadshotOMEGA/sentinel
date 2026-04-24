import type {
  AdminNavigationActionId,
  AdminNavigationEventType,
  AdminNavigationRouteId,
  AdminNavigationSourceType,
  CreateAdminNavigationEventInput,
} from '@sentinel/contracts'
import { apiClient } from '@/lib/api-client'

export type AdminNavigationTelemetryEvent = {
  eventType: AdminNavigationEventType
  routeId: AdminNavigationRouteId
  targetRouteId?: AdminNavigationRouteId
  actionId?: AdminNavigationActionId
  sourceType?: AdminNavigationSourceType
  elapsedMs?: number
}

export function recordAdminNavigationTelemetry(event: AdminNavigationTelemetryEvent): void {
  const body: CreateAdminNavigationEventInput = event

  void apiClient.adminNavigation.recordAdminNavigationEvent({ body }).catch(() => {
    // Telemetry must never block admin work.
  })
}
