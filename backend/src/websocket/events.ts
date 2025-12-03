import type { PresenceStats } from '../../../shared/types';

// RecentActivityItem type from presence-service
export interface RecentActivityItem {
  type: 'checkin' | 'visitor';
  id: string;
  timestamp: string;
  direction?: 'in' | 'out';
  name: string;
  rank?: string;
  division?: string;
  organization?: string;
}

// Server -> Client events
export interface ServerToClientEvents {
  checkin: (data: CheckinEvent) => void;
  presence_update: (data: PresenceUpdateEvent) => void;
  visitor_signin: (data: VisitorSigninEvent) => void;
  visitor_signout: (data: VisitorSignoutEvent) => void;
  kiosk_status: (data: KioskStatusEvent) => void;
  event_checkin: (data: EventCheckinEvent) => void;
  event_presence_update: (data: EventPresenceUpdateEvent) => void;
  session_expired: () => void;
  activity_backfill: (data: ActivityBackfillEvent) => void;
}

// Client -> Server events
export interface ClientToServerEvents {
  subscribe_presence: () => void;
  unsubscribe_presence: () => void;
  subscribe_event: (data: { eventId: string }) => void;
  unsubscribe_event: (data: { eventId: string }) => void;
  kiosk_heartbeat: (data: KioskHeartbeatData) => void;
}

// Event payloads
export interface CheckinEvent {
  memberId: string;
  memberName: string;
  rank: string;
  division: string;
  direction: 'in' | 'out';
  timestamp: string;
  kioskId: string;
}

export interface PresenceUpdateEvent {
  stats: PresenceStats;
}

export interface VisitorSigninEvent {
  visitorId: string;
  name: string;
  organization: string;
  visitType: string;
  checkInTime: string;
}

export interface VisitorSignoutEvent {
  visitorId: string;
  checkOutTime: string;
}

export interface KioskStatusEvent {
  kioskId: string;
  status: 'online' | 'offline';
  queueSize: number;
  lastSeen: string;
}

export interface KioskHeartbeatData {
  kioskId: string;
  queueSize: number;
}

// Event-specific payloads
export interface EventCheckinEvent {
  eventId: string;
  attendeeId: string;
  name: string;
  direction: 'in' | 'out';
  timestamp: string;
  kioskId: string;
}

export interface EventPresenceUpdateEvent {
  eventId: string;
  stats: {
    totalAttendees: number;
    activeAttendees: number;
    checkedOut: number;
    expired: number;
  };
}

export interface ActivityBackfillEvent {
  activity: RecentActivityItem[];
}
