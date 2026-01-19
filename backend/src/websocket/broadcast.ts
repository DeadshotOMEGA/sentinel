import { getIO } from './server';
import type {
  CheckinEvent,
  PresenceUpdateEvent,
  VisitorSigninEvent,
  VisitorSignoutEvent,
  EventCheckinEvent,
  EventPresenceUpdateEvent,
  SecurityAlertEvent,
  DdsUpdateEvent,
} from './events';

export function broadcastCheckin(event: CheckinEvent): void {
  getIO().to('presence').emit('checkin', event);
}

export function broadcastPresenceUpdate(stats: PresenceUpdateEvent['stats']): void {
  getIO().to('presence').emit('presence_update', { stats });
}

export function broadcastVisitorSignin(event: VisitorSigninEvent): void {
  getIO().to('presence').emit('visitor_signin', event);
}

export function broadcastVisitorSignout(event: VisitorSignoutEvent): void {
  getIO().to('presence').emit('visitor_signout', event);
}

export function broadcastEventCheckin(event: EventCheckinEvent): void {
  getIO().to(`event:${event.eventId}`).emit('event_checkin', event);
}

export function broadcastEventPresenceUpdate(
  eventId: string,
  stats: EventPresenceUpdateEvent['stats']
): void {
  getIO().to(`event:${eventId}`).emit('event_presence_update', { eventId, stats });
}

export function broadcastSecurityAlert(event: SecurityAlertEvent): void {
  getIO().to('presence').emit('security_alert', event);
}

export function broadcastDdsUpdate(event: DdsUpdateEvent): void {
  getIO().to('presence').emit('dds_update', event);
}
