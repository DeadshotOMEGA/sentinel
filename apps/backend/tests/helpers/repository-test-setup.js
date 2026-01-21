import { beforeAll, afterAll, beforeEach } from 'vitest';
import { TestDatabase } from './testcontainers';
export function setupRepositoryTest(options) {
    const { createRepository, skipSeed = false, customSeed, beforeAllTimeout = 60000, } = options;
    const testDb = new TestDatabase();
    let repo = null;
    beforeAll(async () => {
        await testDb.start();
        if (!testDb.prisma) {
            throw new Error('TestDatabase prisma client not initialized');
        }
        repo = createRepository(testDb.prisma);
    }, beforeAllTimeout);
    afterAll(async () => {
        await testDb.stop();
        repo = null;
    });
    beforeEach(async () => {
        await testDb.reset();
        if (!skipSeed) {
            if (customSeed && testDb.prisma) {
                await customSeed(testDb.prisma);
            }
            else {
                await testDb.seed();
            }
        }
    });
    return {
        testDb,
        getRepo: () => {
            if (!repo) {
                throw new Error('Repository not initialized. Ensure tests run after beforeAll hook.');
            }
            return repo;
        },
        getPrisma: () => {
            if (!testDb.prisma) {
                throw new Error('Prisma client not initialized. Ensure tests run after beforeAll hook.');
            }
            return testDb.prisma;
        },
    };
}
export const createTestData = {
    division: async (prisma, overrides = {}) => {
        return await prisma.division.create({
            data: {
                code: overrides.code || `DIV${Date.now()}`,
                name: overrides.name || 'Test Division',
                description: overrides.description || 'Test Division Description',
                ...overrides,
            },
        });
    },
    member: async (prisma, overrides = {}) => {
        let divisionId = overrides.divisionId;
        if (!divisionId) {
            const divisions = await prisma.division.findMany({ take: 1 });
            if (divisions.length === 0) {
                const division = await createTestData.division(prisma);
                divisionId = division.id;
            }
            else {
                divisionId = divisions[0].id;
            }
        }
        return await prisma.member.create({
            data: {
                serviceNumber: overrides.serviceNumber || `SN${Date.now()}`,
                rank: overrides.rank || 'AB',
                firstName: overrides.firstName || 'Test',
                lastName: overrides.lastName || 'Member',
                divisionId,
                status: overrides.status || 'ACTIVE',
                ...overrides,
            },
        });
    },
    badge: async (prisma, overrides = {}) => {
        return await prisma.badge.create({
            data: {
                serialNumber: overrides.serialNumber || `B${Date.now()}`,
                status: overrides.status || 'ACTIVE',
                memberId: overrides.memberId || null,
                visitorId: overrides.visitorId || null,
                assignedAt: overrides.assignedAt || null,
                ...overrides,
            },
        });
    },
    checkin: async (prisma, overrides = {}) => {
        let badgeId = overrides.badgeId;
        if (!badgeId) {
            const badge = await createTestData.badge(prisma);
            badgeId = badge.id;
        }
        return await prisma.checkin.create({
            data: {
                badgeId,
                scannedAt: overrides.scannedAt || new Date(),
                direction: overrides.direction || 'IN',
                ...overrides,
            },
        });
    },
    visitor: async (prisma, overrides = {}) => {
        return await prisma.visitor.create({
            data: {
                firstName: overrides.firstName || 'Test',
                lastName: overrides.lastName || 'Visitor',
                organization: overrides.organization || 'Test Org',
                purpose: overrides.purpose || 'Testing',
                visitDate: overrides.visitDate || new Date(),
                ...overrides,
            },
        });
    },
    event: async (prisma, overrides = {}) => {
        return await prisma.event.create({
            data: {
                name: overrides.name || 'Test Event',
                description: overrides.description || 'Test Event Description',
                startDate: overrides.startDate || new Date(),
                endDate: overrides.endDate || new Date(),
                ...overrides,
            },
        });
    },
    tag: async (prisma, overrides = {}) => {
        return await prisma.tag.create({
            data: {
                name: overrides.name || `Tag${Date.now()}`,
                description: overrides.description || 'Test Tag',
                color: overrides.color || '#000000',
                ...overrides,
            },
        });
    },
};
//# sourceMappingURL=repository-test-setup.js.map