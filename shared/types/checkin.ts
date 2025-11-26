import { MemberWithDivision } from './member';

export type CheckinDirection = 'in' | 'out';

export interface Checkin {
  id: string;
  memberId: string;
  badgeId: string;
  direction: CheckinDirection;
  timestamp: Date;
  kioskId: string;
  synced: boolean;
  createdAt: Date;
}

export interface CheckinWithMember extends Checkin {
  member: MemberWithDivision;
}
