// Member Types
export type MemberType = 'full-time' | 'reserve' | 'event-attendee';
export type MemberStatus = 'active' | 'inactive' | 'leave';

export interface Member {
  id: string;
  serviceNumber: string;
  firstName: string;
  lastName: string;
  rank: string;
  divisionId: string;
  memberType: MemberType;
  status: MemberStatus;
  email?: string;
  phone?: string;
  badgeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberWithDivision extends Member {
  division: Division;
}

export interface CreateMemberInput {
  serviceNumber: string;
  firstName: string;
  lastName: string;
  rank: string;
  divisionId: string;
  memberType: MemberType;
  status?: MemberStatus;
  email?: string;
  phone?: string;
  badgeId?: string;
}

export interface UpdateMemberInput {
  serviceNumber?: string;
  firstName?: string;
  lastName?: string;
  rank?: string;
  divisionId?: string;
  memberType?: MemberType;
  status?: MemberStatus;
  email?: string;
  phone?: string;
  badgeId?: string;
}

// Division Types
export interface Division {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDivisionInput {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateDivisionInput {
  name?: string;
  code?: string;
  description?: string;
}

// Badge Types
export type BadgeAssignmentType = 'member' | 'event' | 'unassigned';
export type BadgeStatus = 'active' | 'inactive' | 'lost' | 'damaged';

export interface Badge {
  id: string;
  serialNumber: string;
  assignmentType: BadgeAssignmentType;
  assignedToId?: string;
  status: BadgeStatus;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBadgeInput {
  serialNumber: string;
  assignmentType?: BadgeAssignmentType;
  assignedToId?: string;
  status?: BadgeStatus;
}

// Check-in Types
export type CheckinDirection = 'in' | 'out';

export interface Checkin {
  id: string;
  memberId: string;
  badgeId: string;
  direction: CheckinDirection;
  timestamp: Date;
  kioskId?: string;
  synced: boolean;
  createdAt: Date;
}

export interface CheckinWithMember extends Checkin {
  member: MemberWithDivision;
}

export interface CreateCheckinInput {
  memberId: string;
  badgeId: string;
  direction: CheckinDirection;
  timestamp: Date;
  kioskId?: string;
  synced?: boolean;
}

export interface PresenceStats {
  totalMembers: number;
  present: number;
  absent: number;
  onLeave: number;
  lateArrivals: number;
  visitors: number;
}

// Visitor Types
export type VisitType =
  | 'meeting'
  | 'contractor'
  | 'recruitment'
  | 'course'
  | 'event'
  | 'official'
  | 'other';

export interface Visitor {
  id: string;
  name: string;
  organization: string;
  visitType: VisitType;
  hostMemberId?: string;
  eventId?: string;
  purpose?: string;
  checkinTime: Date;
  checkoutTime?: Date;
  badgeId?: string;
  createdAt: Date;
}

export interface CreateVisitorInput {
  name: string;
  organization: string;
  visitType: VisitType;
  hostMemberId?: string;
  eventId?: string;
  purpose?: string;
  checkinTime?: Date;
  badgeId?: string;
}

// Admin User Types
export interface AdminUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'coxswain' | 'readonly';
  email: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserWithPassword extends AdminUser {
  passwordHash: string;
}

export interface CreateAdminInput {
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'coxswain' | 'readonly';
  email: string;
  password: string;
}

// Event Types
export type EventStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type AttendeeStatus = 'pending' | 'active' | 'checked_out' | 'expired';
export type EventCheckinDirection = 'in' | 'out';

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

export interface EventCheckin {
  id: string;
  eventAttendeeId: string;
  badgeId: string;
  direction: EventCheckinDirection;
  timestamp: Date;
  kioskId: string;
  createdAt: Date;
}
