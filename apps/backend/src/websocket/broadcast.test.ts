import { beforeEach, describe, expect, it } from 'vitest'
import type { Server as SocketIOServer } from 'socket.io'
import {
  broadcastDdsUpdate,
  broadcastLockupStatusUpdate,
  broadcastScheduleAssignmentUpdate,
  broadcastScheduleUpdate,
  broadcastSecurityAlert,
  broadcastSecurityAlertAcknowledged,
  setSocketIOServer,
} from './broadcast.js'

interface EmittedEvent {
  room: string
  event: string
  payload: unknown
}

function createSocketServer(events: EmittedEvent[]): SocketIOServer {
  return {
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          events.push({ room, event, payload })
        },
      }
    },
  } as unknown as SocketIOServer
}

describe('broadcast helpers', () => {
  let events: EmittedEvent[]

  beforeEach(() => {
    events = []
    setSocketIOServer(createSocketServer(events))
  })

  it('emits lockup status on canonical and compatibility events', () => {
    const payload = {
      date: '2026-03-03',
      buildingStatus: 'open' as const,
      currentHolder: {
        id: 'member-1',
        firstName: 'Alex',
        lastName: 'Stone',
        rank: 'PO1',
      },
      timestamp: '2026-03-03T12:00:00.000Z',
    }

    broadcastLockupStatusUpdate(payload)

    expect(events).toEqual([
      { room: 'lockup', event: 'lockup:status', payload },
      { room: 'lockup', event: 'lockup:statusChanged', payload },
    ])
  })

  it('emits DDS updates on canonical and compatibility events', () => {
    const payload = {
      action: 'accepted' as const,
      assignment: {
        id: 'dds-1',
        memberId: 'member-1',
        memberName: 'PO1 Alex Stone',
        rank: 'PO1',
        status: 'active',
      },
      timestamp: '2026-03-03T12:00:00.000Z',
    }

    broadcastDdsUpdate(payload)

    expect(events).toEqual([
      { room: 'dds', event: 'dds:update', payload },
      { room: 'dds', event: 'dds:updated', payload },
    ])
  })

  it('emits schedule changes on canonical and compatibility events', () => {
    const schedulePayload = {
      action: 'published' as const,
      scheduleId: 'schedule-1',
      dutyRoleCode: 'DDS',
      weekStartDate: '2026-03-02',
      status: 'published',
      timestamp: '2026-03-03T12:00:00.000Z',
    }
    const assignmentPayload = {
      action: 'updated' as const,
      scheduleId: 'schedule-1',
      assignmentId: 'assignment-1',
      memberId: 'member-1',
      memberName: 'PO1 Alex Stone',
      positionCode: 'OW',
      timestamp: '2026-03-03T12:05:00.000Z',
    }

    broadcastScheduleUpdate(schedulePayload)
    broadcastScheduleAssignmentUpdate(assignmentPayload)

    expect(events).toEqual([
      { room: 'schedules', event: 'schedule:update', payload: schedulePayload },
      { room: 'schedules', event: 'schedules:updated', payload: schedulePayload },
      { room: 'schedules', event: 'schedule:assignment', payload: assignmentPayload },
      { room: 'schedules', event: 'schedules:updated', payload: assignmentPayload },
    ])
  })

  it('emits alert create and acknowledge events on canonical and compatibility channels', () => {
    const createdPayload = {
      id: 'alert-1',
      alertType: 'system' as const,
      severity: 'warning' as const,
      message: 'Test alert',
      status: 'active' as const,
      timestamp: '2026-03-03T12:00:00.000Z',
      acknowledgedAt: null,
      badgeSerial: null,
      kioskId: 'playwright-e2e',
    }
    const acknowledgedPayload = {
      ...createdPayload,
      status: 'acknowledged' as const,
      timestamp: '2026-03-03T12:10:00.000Z',
      acknowledgedAt: '2026-03-03T12:10:00.000Z',
    }

    broadcastSecurityAlert(createdPayload)
    broadcastSecurityAlertAcknowledged(acknowledgedPayload)

    expect(events).toEqual([
      { room: 'alerts', event: 'alert:new', payload: createdPayload },
      { room: 'alerts', event: 'alerts:new', payload: createdPayload },
      { room: 'alerts', event: 'alert:acknowledged', payload: acknowledgedPayload },
      { room: 'alerts', event: 'alerts:acknowledged', payload: acknowledgedPayload },
    ])
  })
})
