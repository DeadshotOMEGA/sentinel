import { Division } from './division';

export type MemberType = 'full_time' | 'reserve';
export type MemberStatus = 'active' | 'inactive';

export interface Member {
  id: string;
  serviceNumber: string;
  rank: string;
  firstName: string;
  lastName: string;
  divisionId: string;
  memberType: MemberType;
  status: MemberStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberWithDivision extends Member {
  division: Division;
}

export interface MemberPresence extends MemberWithDivision {
  currentStatus: 'present' | 'absent';
  lastCheckIn?: Date;
  lastCheckOut?: Date;
}
