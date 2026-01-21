export type MemberStatus = 'active' | 'inactive' | 'transferred' | 'retired' | 'pending_review';
export type MemberType = 'reserve' | 'regular' | 'civilian' | 'cadet';
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
export interface Division {
    id: string;
    name: string;
    code: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Badge {
    id: string;
    serialNumber: string;
    assignmentType: string;
    assignedToId?: string;
    status: string;
    lastUsed?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface Tag {
    id: string;
    name: string;
    color: string;
    description?: string;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface MemberWithDivision extends Member {
    division: Division;
    badge?: Badge;
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
    status?: MemberStatus;
    email?: string;
    homePhone?: string;
    mobilePhone?: string;
    badgeId?: string;
    tagIds?: string[];
}
export interface MemberFilterParams {
    divisionId?: string;
    memberType?: MemberType;
    status?: MemberStatus;
    search?: string;
    mess?: string;
    moc?: string;
    division?: string;
    contract?: 'active' | 'expiring_soon' | 'expired';
    tags?: string[];
    excludeTags?: string[];
}
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
//# sourceMappingURL=member.types.d.ts.map