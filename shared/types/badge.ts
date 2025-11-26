export type BadgeAssignmentType = 'member' | 'event' | 'unassigned';
export type BadgeStatus = 'active' | 'disabled' | 'lost' | 'returned';

export interface Badge {
  id: string;
  serialNumber: string;
  assignmentType: BadgeAssignmentType;
  assignedToId: string | null;
  status: BadgeStatus;
  lastUsed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
