import { PrismaClient } from '@sentinel/database';
export declare function createDivision(prisma: PrismaClient, overrides?: Partial<{
    code: string;
    name: string;
    description: string;
}>): Promise<{
    id: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    code: string;
    name: string;
    description: string | null;
}>;
export declare function createMember(prisma: PrismaClient, overrides?: Partial<{
    serviceNumber: string;
    rank: string;
    firstName: string;
    lastName: string;
    email: string;
    divisionId: string;
    badgeId: string;
    memberType: string;
    status: string;
    employeeNumber: string;
}>): Promise<{
    id: string;
    serviceNumber: string;
    rank: string;
    firstName: string;
    lastName: string;
    divisionId: string | null;
    email: string | null;
    memberTypeId: string | null;
    memberStatusId: string | null;
    badgeId: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    status: string;
    notes: string | null;
    memberType: string;
    mobilePhone: string | null;
    employeeNumber: string | null;
    initials: string | null;
    mess: string | null;
    moc: string | null;
    classDetails: string | null;
    homePhone: string | null;
    contract_start: Date | null;
    contract_end: Date | null;
}>;
export declare function createBadge(prisma: PrismaClient, overrides?: Partial<{
    serialNumber: string;
    assignmentType: string;
    assignedToId: string;
    status: string;
}>): Promise<{
    id: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    status: string;
    serialNumber: string;
    assignmentType: string;
    assignedToId: string | null;
    badgeStatusId: string | null;
    lastUsed: Date | null;
}>;
export declare function createCheckin(prisma: PrismaClient, overrides?: Partial<{
    memberId: string;
    badgeId: string;
    direction: string;
    timestamp: Date;
    kioskId: string;
    method: string;
}>): Promise<{
    id: string;
    badgeId: string | null;
    createdAt: Date | null;
    memberId: string | null;
    direction: string;
    kioskId: string;
    method: string | null;
    timestamp: Date;
    synced: boolean | null;
    flagged_for_review: boolean | null;
    flag_reason: string | null;
    created_by_admin: string | null;
}>;
export declare function createVisitor(prisma: PrismaClient, overrides?: Partial<{
    name: string;
    organization: string;
    visitType: string;
    visitReason: string;
    hostMemberId: string;
    temporaryBadgeId: string;
    kioskId: string;
    checkInMethod: string;
}>): Promise<{
    id: string;
    createdAt: Date | null;
    kioskId: string;
    createdByAdmin: string | null;
    name: string;
    organization: string | null;
    visitType: string;
    visitTypeId: string | null;
    visitReason: string | null;
    eventId: string | null;
    hostMemberId: string | null;
    checkInTime: Date;
    checkOutTime: Date | null;
    temporaryBadgeId: string | null;
    adminNotes: string | null;
    checkInMethod: string | null;
}>;
export declare function createAdminUser(prisma: PrismaClient, overrides?: Partial<{
    username: string;
    email: string;
    displayName: string;
    role: string;
    passwordHash: string;
}>): Promise<{
    id: string;
    email: string | null;
    createdAt: Date | null;
    username: string;
    displayName: string;
    passwordHash: string;
    fullName: string | null;
    role: string;
    lastLogin: Date | null;
    first_name: string | null;
    last_name: string | null;
    updated_at: Date | null;
    disabled: boolean;
    disabledAt: Date | null;
    disabledBy: string | null;
    updatedBy: string | null;
}>;
export declare function createEvent(prisma: PrismaClient, overrides?: Partial<{
    name: string;
    code: string;
    description: string;
    startDate: Date;
    endDate: Date;
    status: string;
}>): Promise<{
    id: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    status: string;
    startDate: Date;
    endDate: Date;
    code: string;
    name: string;
    description: string | null;
    autoExpireBadges: boolean | null;
    customRoles: import("@prisma/client/runtime/client").JsonValue | null;
    createdBy: string | null;
}>;
export declare function createTag(prisma: PrismaClient, overrides?: Partial<{
    name: string;
    color: string;
    description: string;
    displayOrder: number;
}>): Promise<{
    id: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    name: string;
    description: string | null;
    color: string;
    displayOrder: number;
}>;
export declare function createSecurityAlert(prisma: PrismaClient, overrides?: Partial<{
    alertType: string;
    severity: string;
    badgeSerial: string;
    memberId: string;
    kioskId: string;
    message: string;
    status: string;
}>): Promise<{
    message: string;
    details: import("@prisma/client/runtime/client").JsonValue | null;
    id: string;
    createdAt: Date;
    status: string;
    memberId: string | null;
    kioskId: string;
    alertType: string;
    severity: string;
    badgeSerial: string | null;
    acknowledgedBy: string | null;
    acknowledgedAt: Date | null;
    acknowledgeNote: string | null;
}>;
export declare function resetFactoryCounter(): void;
//# sourceMappingURL=factories.d.ts.map