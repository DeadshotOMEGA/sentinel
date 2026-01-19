import type { PresenceStats, LogEvent, LogFilter } from '../../../shared/types';

// Security alert event type
export interface SecurityAlertEvent {
  id: string;
  alertType: 'badge_disabled' | 'badge_unknown' | 'inactive_member';
  severity: 'critical' | 'warning' | 'info';
  badgeSerial: string | null;
  kioskId: string;
  kioskName: string;
  message: string;
  createdAt: string;
}

// DDS (Duty Day Staff) event types
export type DdsStatus = 'pending' | 'active' | 'released' | 'transferred';

export interface DdsMemberInfo {
  id: string;
  name: string;
  rank: string;
  division: string | null;
}

export interface DdsUpdateEvent {
  assignmentId: string;
  member: DdsMemberInfo;
  status: DdsStatus;
  assignedDate: string;
  acceptedAt: string | null;
  assignedBy: string | null;  // Admin name if assigned by admin
}

// RecentActivityItem type - matches shared/types ActivityItem
export interface RecentActivityItem {
  type: 'checkin' | 'visitor';
  id: string;
  timestamp: string;
  direction: 'in' | 'out';
  name: string;
  // Member fields
  rank?: string;
  division?: string;
  // Location
  kioskId?: string;
  kioskName?: string;
  // Visitor fields
  organization?: string;
  visitType?: string;
  visitReason?: string;
  hostName?: string;
  // Event context
  eventId?: string;
  eventName?: string;
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
  // Security alert events
  security_alert: (data: SecurityAlertEvent) => void;
  // DDS events
  dds_update: (data: DdsUpdateEvent) => void;
  // Log streaming events (dev-only)
  log_event: (event: LogEvent) => void;
  log_backfill: (events: LogEvent[]) => void;
}

// Client -> Server events
export interface ClientToServerEvents {
  subscribe_presence: () => void;
  unsubscribe_presence: () => void;
  subscribe_event: (data: { eventId: string }) => void;
  unsubscribe_event: (data: { eventId: string }) => void;
  kiosk_heartbeat: (data: KioskHeartbeatData) => void;
  // Log streaming events (dev-only)
  subscribe_logs: (filter: LogFilter) => void;
  unsubscribe_logs: () => void;
  update_log_filter: (filter: LogFilter) => void;
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
  kioskName: string;
}

export interface PresenceUpdateEvent {
  stats: PresenceStats;
}

export interface VisitorSigninEvent {
  visitorId: string;
  name: string;
  organization: string;
  visitType: string;
  visitReason: string | null;
  hostName: string | null;
  eventId: string | null;
  eventName: string | null;
  kioskId: string;
  kioskName: string;
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
