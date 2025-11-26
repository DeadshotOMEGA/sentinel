export type VisitType = 'general' | 'contractor' | 'recruitment' | 'course' | 'event' | 'official' | 'other';

export interface Visitor {
  id: string;
  name: string;
  organization: string | null;
  visitType: VisitType;
  visitReason: string | null;
  eventId: string | null;
  hostMemberId: string | null;
  checkInTime: Date;
  checkOutTime: Date | null;
  temporaryBadgeId: string | null;
  kioskId: string;
  createdAt: Date;
}
