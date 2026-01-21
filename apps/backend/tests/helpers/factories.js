let counter = 0;
const getUniqueId = () => ++counter;
export async function createDivision(prisma, overrides = {}) {
    const id = getUniqueId();
    return prisma.division.create({
        data: {
            code: `DIV${id}`,
            name: `Division ${id}`,
            description: `Test division ${id}`,
            ...overrides,
        },
    });
}
export async function createMember(prisma, overrides = {}) {
    const id = getUniqueId();
    let divisionId = overrides.divisionId;
    if (!divisionId) {
        const division = await prisma.division.findFirst() || await createDivision(prisma);
        divisionId = division.id;
    }
    return prisma.member.create({
        data: {
            serviceNumber: `A${100000 + id}`,
            rank: 'AB',
            firstName: `Test`,
            lastName: `Member${id}`,
            email: `test.member${id}@example.com`,
            divisionId,
            memberType: 'reserve',
            status: 'active',
            ...overrides,
        },
    });
}
export async function createBadge(prisma, overrides = {}) {
    const id = getUniqueId();
    return prisma.badge.create({
        data: {
            serialNumber: `BADGE${10000 + id}`,
            assignmentType: 'member',
            status: 'active',
            ...overrides,
        },
    });
}
export async function createCheckin(prisma, overrides = {}) {
    let memberId = overrides.memberId;
    let badgeId = overrides.badgeId;
    if (!memberId) {
        const member = await createMember(prisma);
        memberId = member.id;
    }
    if (!badgeId) {
        const badge = await createBadge(prisma, { assignmentType: 'member', assignedToId: memberId });
        badgeId = badge.id;
    }
    return prisma.checkin.create({
        data: {
            memberId,
            badgeId,
            direction: 'in',
            kioskId: 'KIOSK001',
            method: 'badge',
            ...overrides,
        },
    });
}
export async function createVisitor(prisma, overrides = {}) {
    const id = getUniqueId();
    return prisma.visitor.create({
        data: {
            name: `Visitor ${id}`,
            organization: 'Test Organization',
            visitType: 'contractor',
            visitReason: 'Test visit',
            kioskId: 'KIOSK001',
            checkInMethod: 'kiosk',
            ...overrides,
        },
    });
}
export async function createAdminUser(prisma, overrides = {}) {
    const id = getUniqueId();
    return prisma.adminUser.create({
        data: {
            username: `admin${id}`,
            email: `admin${id}@example.com`,
            displayName: `Admin User ${id}`,
            passwordHash: '$2b$10$dummyHashForTesting',
            role: 'admin',
            ...overrides,
        },
    });
}
export async function createEvent(prisma, overrides = {}) {
    const id = getUniqueId();
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return prisma.event.create({
        data: {
            name: `Test Event ${id}`,
            code: `EVENT${id}`,
            description: `Test event description ${id}`,
            startDate: today,
            endDate: nextWeek,
            status: 'active',
            ...overrides,
        },
    });
}
export async function createTag(prisma, overrides = {}) {
    const id = getUniqueId();
    return prisma.tag.create({
        data: {
            name: `Tag ${id}`,
            color: '#3B82F6',
            description: `Test tag ${id}`,
            displayOrder: id,
            ...overrides,
        },
    });
}
export async function createSecurityAlert(prisma, overrides = {}) {
    return prisma.securityAlert.create({
        data: {
            alertType: 'badge_unknown',
            severity: 'warning',
            kioskId: 'KIOSK001',
            message: 'Test security alert',
            status: 'active',
            ...overrides,
        },
    });
}
export function resetFactoryCounter() {
    counter = 0;
}
//# sourceMappingURL=factories.js.map