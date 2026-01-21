import { TestDatabase } from './testcontainers';
import type { PrismaClient } from '@sentinel/database';
interface SetupRepositoryTestOptions<T> {
    createRepository: (prisma: PrismaClient) => T;
    skipSeed?: boolean;
    customSeed?: (prisma: PrismaClient) => Promise<void>;
    beforeAllTimeout?: number;
}
interface SetupRepositoryTestResult<T> {
    testDb: TestDatabase;
    getRepo: () => T;
    getPrisma: () => PrismaClient;
}
export declare function setupRepositoryTest<T>(options: SetupRepositoryTestOptions<T>): SetupRepositoryTestResult<T>;
export declare const createTestData: {
    division: (prisma: PrismaClient, overrides?: Partial<any>) => Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        code: string;
        name: string;
        description: string | null;
    }>;
    member: (prisma: PrismaClient, overrides?: Partial<any>) => Promise<{
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
    badge: (prisma: PrismaClient, overrides?: Partial<any>) => Promise<{
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
    checkin: (prisma: PrismaClient, overrides?: Partial<any>) => Promise<{
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
    visitor: (prisma: PrismaClient, overrides?: Partial<any>) => Promise<{
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
    event: (prisma: PrismaClient, overrides?: Partial<any>) => Promise<{
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
    tag: (prisma: PrismaClient, overrides?: Partial<any>) => Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        name: string;
        description: string | null;
        color: string;
        displayOrder: number;
    }>;
};
export {};
//# sourceMappingURL=repository-test-setup.d.ts.map