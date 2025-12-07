// Member Types
export type MemberType = 'class_a' | 'class_b' | 'class_c' | 'reg_force';
export type MemberStatus = 'active' | 'inactive' | 'pending_review';

export interface Member {
  id: string;
  serviceNumber: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  initials?: string;
  rank: string;
  divisionId: string;
  mess?: string;
  moc?: string;
  memberType: MemberType;
  classDetails?: string;
  notes?: string;
  contractStart?: Date;
  contractEnd?: Date;
  status: MemberStatus;
  email?: string;
  homePhone?: string;
  mobilePhone?: string;
  badgeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberWithDivision extends Member {
  division: Division;
  tags?: Tag[];
}

export interface CreateMemberInput {
  serviceNumber: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  initials?: string;
  rank: string;
  divisionId: string;
  mess?: string;
  moc?: string;
  memberType: MemberType;
  classDetails?: string;
  notes?: string;
  contractStart?: Date;
  contractEnd?: Date;
  status?: MemberStatus;
  email?: string;
  homePhone?: string;
  mobilePhone?: string;
  badgeId?: string;
}

export interface UpdateMemberInput {
  serviceNumber?: string;
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  initials?: string;
  rank?: string;
  divisionId?: string;
  mess?: string;
  moc?: string;
  memberType?: MemberType;
  classDetails?: string;
  notes?: string;
  contractStart?: Date;
  contractEnd?: Date;
  status?: MemberStatus;
  email?: string;
  homePhone?: string;
  mobilePhone?: string;
  badgeId?: string;
  tagIds?: string[];
}

// Tag Types
export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberTag {
  id: string;
  memberId: string;
  tagId: string;
  createdAt: Date;
}

export interface CreateTagInput {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  description?: string;
}

export interface MemberFilterParams {
  mess?: string;
  moc?: string;
  division?: string;
  contract?: 'active' | 'expiring_soon' | 'expired';
  tags?: string[];
  excludeTags?: string[];
}

// Nominal Roll Import Types

// Template fields expected by the system
export type ImportTemplateField =
  | 'serviceNumber'
  | 'employeeNumber'
  | 'rank'
  | 'lastName'
  | 'firstName'
  | 'initials'
  | 'department'
  | 'mess'
  | 'moc'
  | 'email'
  | 'homePhone'
  | 'mobilePhone'
  | 'details'
  | 'notes'
  | 'contractStart'
  | 'contractEnd';

// Required fields that must be mapped
export const REQUIRED_IMPORT_FIELDS: ImportTemplateField[] = [
  'serviceNumber',
  'rank',
  'lastName',
  'firstName',
  'department',
];

// Field metadata for UI display
export interface ImportFieldMeta {
  field: ImportTemplateField;
  label: string;
  required: boolean;
  aliases: string[]; // Common header names that auto-map to this field
}

export const IMPORT_FIELD_META: ImportFieldMeta[] = [
  { field: 'serviceNumber', label: 'Service Number', required: true, aliases: ['SN', 'SERVICE NUMBER', 'SERVICE_NUMBER', 'INDEX', ''] },
  { field: 'employeeNumber', label: 'Employee Number', required: false, aliases: ['EMPL #', 'EMPL', 'EMPLOYEE', 'EMPLOYEE NUMBER', 'EMP #'] },
  { field: 'rank', label: 'Rank', required: true, aliases: ['RANK'] },
  { field: 'lastName', label: 'Last Name', required: true, aliases: ['LAST NAME', 'LAST_NAME', 'SURNAME', 'FAMILY NAME'] },
  { field: 'firstName', label: 'First Name', required: true, aliases: ['FIRST NAME', 'FIRST_NAME', 'GIVEN NAME', 'FORENAME'] },
  { field: 'initials', label: 'Initials', required: false, aliases: ['INITIALS', 'INIT'] },
  { field: 'department', label: 'Department', required: true, aliases: ['DEPT', 'DEPARTMENT', 'DIV', 'DIVISION'] },
  { field: 'mess', label: 'Mess', required: false, aliases: ['MESS'] },
  { field: 'moc', label: 'MOC', required: false, aliases: ['MOC', 'MOSID', 'TRADE'] },
  { field: 'email', label: 'Email', required: false, aliases: ['EMAIL', 'EMAIL ADDRESS', 'E-MAIL'] },
  { field: 'homePhone', label: 'Home Phone', required: false, aliases: ['HOME PHONE', 'HOME_PHONE', 'HOME TEL', 'HOME'] },
  { field: 'mobilePhone', label: 'Mobile Phone', required: false, aliases: ['MOBILE PHONE', 'MOBILE_PHONE', 'CELL', 'CELL PHONE', 'MOBILE'] },
  { field: 'details', label: 'Details', required: false, aliases: ['DETAILS', 'CLASS', 'CLASS DETAILS'] },
  { field: 'notes', label: 'Notes', required: false, aliases: ['NOTES', 'REMARKS', 'COMMENTS', 'CONTRACT DETAILS'] },
  { field: 'contractStart', label: 'Contract Start', required: false, aliases: ['CONTRACT START', 'START DATE', 'CONTRACT_START', 'START'] },
  { field: 'contractEnd', label: 'Contract End', required: false, aliases: ['CONTRACT END', 'END DATE', 'CONTRACT_END', 'END', 'EXPIRY'] },
];

// Column mapping from template field to CSV column header
export type ImportColumnMapping = Record<ImportTemplateField, string | null>;

// Result of parsing CSV headers
export interface CsvHeadersResult {
  headers: string[];
  sampleRows: Record<string, string>[]; // First 3 rows for preview
  suggestedMapping: Partial<ImportColumnMapping>; // Auto-matched columns
  unmappedHeaders: string[]; // Headers that couldn't be auto-matched
}

export interface NominalRollRow {
  serviceNumber: string;
  employeeNumber?: string;
  rank: string;
  lastName: string;
  firstName: string;
  initials?: string;
  department: string;
  mess?: string;
  moc?: string;
  email?: string;
  homePhone?: string;
  mobilePhone?: string;
  details?: string;
  notes?: string;
  contractStart?: string; // ISO date string from CSV
  contractEnd?: string;   // ISO date string from CSV
}

export interface ImportPreviewMember {
  current: Member;
  incoming: NominalRollRow;
  changes: string[];
}

export interface ImportPreview {
  toAdd: NominalRollRow[];
  toUpdate: ImportPreviewMember[];
  toReview: Member[];
  errors: ImportError[];
  divisionMapping: Record<string, string>;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
}

export interface ImportResult {
  added: number;
  updated: number;
  flaggedForReview: number;
  errors: ImportError[];
}

// Division detection result from CSV
export interface DetectedDivision {
  csvValue: string;           // Value found in CSV (e.g., "OPS", "LOG")
  existingDivisionId?: string; // ID of matched division (if found)
  existingDivisionName?: string; // Name of matched division (if found)
  memberCount: number;        // Number of members with this division in CSV
}

export interface DivisionDetectionResult {
  detected: DetectedDivision[];
  existingDivisions: Division[];
}

// Division mapping from CSV value to division ID (new or existing)
export type ImportDivisionMapping = Record<string, string>;

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
export type CheckinMethod = 'badge' | 'admin_manual';

export interface Checkin {
  id: string;
  memberId: string;
  badgeId: string;
  direction: CheckinDirection;
  timestamp: Date;
  kioskId?: string;
  synced: boolean;
  method: CheckinMethod;
  createdByAdmin?: string;
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
  method?: CheckinMethod;
  createdByAdmin?: string;
}

export interface ManualMemberCheckinInput {
  memberId: string;
  notes?: string;
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
  | 'general'
  | 'contractor'
  | 'recruitment'
  | 'course'
  | 'event'
  | 'official'
  | 'other';

export type VisitorCheckinMethod = 'kiosk' | 'admin_manual';

export interface Visitor {
  id: string;
  name: string;
  organization: string;
  visitType: VisitType;
  hostMemberId?: string;
  eventId?: string;
  purpose?: string;
  checkInTime: Date;
  checkOutTime?: Date;
  badgeId?: string;
  adminNotes?: string;
  checkInMethod: VisitorCheckinMethod;
  createdByAdmin?: string;
  createdAt: Date;
}

export interface VisitorWithDetails extends Visitor {
  hostName?: string;
  eventName?: string;
  duration?: number; // minutes
}

export interface CreateVisitorInput {
  name: string;
  organization: string;
  visitType: VisitType;
  hostMemberId?: string;
  eventId?: string;
  purpose?: string;
  checkInTime?: Date;
  badgeId?: string;
  adminNotes?: string;
  checkInMethod?: VisitorCheckinMethod;
  createdByAdmin?: string;
}

export interface UpdateVisitorInput {
  eventId?: string | null;
  hostMemberId?: string | null;
  purpose?: string;
}

export interface VisitorHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  visitType?: VisitType;
  organization?: string;
  hostMemberId?: string;
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

// Activity Feed Types
export interface ActivityItem {
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

// Dashboard Present Person Types
export type PresentPersonType = 'member' | 'visitor';

export interface PresentPerson {
  id: string;
  type: PresentPersonType;
  name: string;
  checkInTime: Date;
  kioskId?: string;
  kioskName?: string;

  // Member-specific fields
  rank?: string;
  division?: string;
  divisionId?: string;
  memberType?: MemberType;

  // Visitor-specific fields
  organization?: string;
  visitType?: VisitType;
  visitReason?: string;
  hostMemberId?: string;
  hostName?: string;
  eventId?: string;
  eventName?: string;

  // Alerts
  alerts?: Alert[];
}

export interface DashboardFilters {
  typeFilter: 'all' | 'members' | 'visitors';
  directionFilter: 'all' | 'in' | 'out';
  searchQuery: string;
}

// Alert Types
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertTargetType = 'member' | 'visitor';

export interface Alert {
  id: string;
  targetType: AlertTargetType;
  targetId: string;
  severity: AlertSeverity;
  message: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  dismissed: boolean;
  dismissedBy?: string;
  dismissedAt?: Date;
}

export interface CreateAlertInput {
  targetType: AlertTargetType;
  targetId: string;
  severity: AlertSeverity;
  message: string;
  expiresAt?: Date;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Report Types
export * from './reports';
export * from './settings';
export * from './simulation';
