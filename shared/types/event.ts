export type EventStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type AttendeeStatus = 'pending' | 'active' | 'checked_out' | 'expired';

export interface Event {
  id: string;
  name: string;
  code: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  status: EventStatus;
  autoExpireBadges: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventInput {
  name: string;
  code: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status?: EventStatus;
  autoExpireBadges?: boolean;
  createdBy?: string;
}

export interface UpdateEventInput {
  name?: string;
  code?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: EventStatus;
  autoExpireBadges?: boolean;
}

export interface EventAttendee {
  id: string;
  eventId: string;
  name: string;
  rank: string | null;
  organization: string;
  role: string;
  badgeId: string | null;
  badgeAssignedAt: Date | null;
  accessStart: Date | null;
  accessEnd: Date | null;
  status: AttendeeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAttendeeInput {
  eventId: string;
  name: string;
  rank?: string;
  organization: string;
  role: string;
  badgeId?: string;
  badgeAssignedAt?: Date;
  accessStart?: Date;
  accessEnd?: Date;
  status?: AttendeeStatus;
}

export interface UpdateAttendeeInput {
  name?: string;
  rank?: string;
  organization?: string;
  role?: string;
  badgeId?: string;
  badgeAssignedAt?: Date;
  accessStart?: Date;
  accessEnd?: Date;
  status?: AttendeeStatus;
}

export type EventCheckinDirection = 'in' | 'out';

export interface EventCheckin {
  id: string;
  eventAttendeeId: string;
  badgeId: string;
  direction: EventCheckinDirection;
  timestamp: Date;
  kioskId: string;
  createdAt: Date;
}
