export type VisitType = 'contractor' | 'recruitment' | 'event' | 'official' | 'museum' | 'other';

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
