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
  customRoles: string[] | null;
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
  customRoles?: string[] | null;
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

// ============================================================================
// Attendee Import Types
// ============================================================================

export type AttendeeImportTemplateField =
  | 'name'
  | 'rank'
  | 'organization'
  | 'role'
  | 'accessStart'
  | 'accessEnd';

export interface AttendeeImportFieldMeta {
  field: AttendeeImportTemplateField;
  label: string;
  required: boolean;
  aliases: string[];
}

export const ATTENDEE_IMPORT_FIELD_META: AttendeeImportFieldMeta[] = [
  {
    field: 'name',
    label: 'Name',
    required: true,
    aliases: ['NAME', 'FULL NAME', 'FULLNAME', 'ATTENDEE', 'PARTICIPANT', 'PERSON'],
  },
  {
    field: 'rank',
    label: 'Rank',
    required: false,
    aliases: ['RANK', 'GRADE', 'TITLE', 'POSITION'],
  },
  {
    field: 'organization',
    label: 'Organization',
    required: true,
    aliases: ['ORGANIZATION', 'ORG', 'UNIT', 'COMPANY', 'DEPARTMENT', 'DEPT', 'AGENCY'],
  },
  {
    field: 'role',
    label: 'Role',
    required: true,
    aliases: ['ROLE', 'TYPE', 'CATEGORY', 'ATTENDEE TYPE', 'PARTICIPANT TYPE'],
  },
  {
    field: 'accessStart',
    label: 'Access Start',
    required: false,
    aliases: ['ACCESS START', 'START DATE', 'START', 'FROM', 'BEGIN', 'VALID FROM'],
  },
  {
    field: 'accessEnd',
    label: 'Access End',
    required: false,
    aliases: ['ACCESS END', 'END DATE', 'END', 'TO', 'EXPIRY', 'EXPIRES', 'VALID TO', 'UNTIL'],
  },
];

export const REQUIRED_ATTENDEE_IMPORT_FIELDS: AttendeeImportTemplateField[] = [
  'name',
  'organization',
  'role',
];

export type AttendeeImportColumnMapping = Record<AttendeeImportTemplateField, string | null>;

export interface AttendeeImportRow {
  name: string;
  rank?: string;
  organization: string;
  role: string;
  accessStart?: string;
  accessEnd?: string;
}

export interface ExcelSheetInfo {
  name: string;
  rowCount: number;
  sampleHeaders: string[];
}

export interface AttendeeImportHeadersResult {
  headers: string[];
  sampleRows: Record<string, string>[];
  suggestedMapping: Partial<AttendeeImportColumnMapping>;
  unmappedHeaders: string[];
}

export interface DetectedAttendeeRole {
  csvValue: string;
  matchedRole?: string;
  attendeeCount: number;
}

export interface AttendeeRoleDetectionResult {
  detectedRoles: DetectedAttendeeRole[];
  eventRoles: string[];
}

export type AttendeeRoleMapping = Record<string, string>;

export type DuplicateResolution = 'skip' | 'add' | 'update' | 'edit';

export interface AttendeeImportDuplicate {
  rowIndex: number;
  incoming: AttendeeImportRow;
  existing: EventAttendee;
  resolution: DuplicateResolution;
  editedValues?: AttendeeImportRow;
}

export interface AttendeeImportError {
  row: number;
  field?: string;
  message: string;
  howToFix?: string;
}

export interface AttendeeImportPreview {
  toAdd: AttendeeImportRow[];
  duplicates: AttendeeImportDuplicate[];
  errors: AttendeeImportError[];
}

export interface AttendeeImportResult {
  added: number;
  updated: number;
  skipped: number;
  errors: AttendeeImportError[];
}
