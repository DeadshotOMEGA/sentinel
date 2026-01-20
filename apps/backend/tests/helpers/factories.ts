import { PrismaClient } from '@sentinel/database'

/**
 * Test Data Factories
 *
 * These factories create test data with sensible defaults
 * while allowing customization through overrides
 */

let counter = 0
const getUniqueId = () => ++counter

/**
 * Create a test division
 */
export async function createDivision(
  prisma: PrismaClient,
  overrides: Partial<{
    code: string
    name: string
    description: string
  }> = {}
) {
  const id = getUniqueId()
  return prisma.division.create({
    data: {
      code: `DIV${id}`,
      name: `Division ${id}`,
      description: `Test division ${id}`,
      ...overrides,
    },
  })
}

/**
 * Create a test member
 */
export async function createMember(
  prisma: PrismaClient,
  overrides: Partial<{
    serviceNumber: string
    rank: string
    firstName: string
    lastName: string
    email: string
    divisionId: string
    badgeId: string
    memberType: string
    status: string
    employeeNumber: string
  }> = {}
) {
  const id = getUniqueId()

  // Ensure division exists
  let divisionId = overrides.divisionId
  if (!divisionId) {
    const division = await prisma.division.findFirst() || await createDivision(prisma)
    divisionId = division.id
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
  })
}

/**
 * Create a test badge
 */
export async function createBadge(
  prisma: PrismaClient,
  overrides: Partial<{
    serialNumber: string
    assignmentType: string
    assignedToId: string
    status: string
  }> = {}
) {
  const id = getUniqueId()

  return prisma.badge.create({
    data: {
      serialNumber: `BADGE${10000 + id}`,
      assignmentType: 'member',
      status: 'active',
      ...overrides,
    },
  })
}

/**
 * Create a test checkin
 */
export async function createCheckin(
  prisma: PrismaClient,
  overrides: Partial<{
    memberId: string
    badgeId: string
    direction: string
    timestamp: Date
    kioskId: string
    method: string
  }> = {}
) {
  // Create member and badge if not provided
  let memberId = overrides.memberId
  let badgeId = overrides.badgeId

  if (!memberId) {
    const member = await createMember(prisma)
    memberId = member.id
  }

  if (!badgeId) {
    const badge = await createBadge(prisma, { assignmentType: 'member', assignedToId: memberId })
    badgeId = badge.id
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
  })
}

/**
 * Create a test visitor
 */
export async function createVisitor(
  prisma: PrismaClient,
  overrides: Partial<{
    name: string
    organization: string
    visitType: string
    visitReason: string
    hostMemberId: string
    temporaryBadgeId: string
    kioskId: string
    checkInMethod: string
  }> = {}
) {
  const id = getUniqueId()

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
  })
}

/**
 * Create a test admin user
 */
export async function createAdminUser(
  prisma: PrismaClient,
  overrides: Partial<{
    username: string
    email: string
    displayName: string
    role: string
    passwordHash: string
  }> = {}
) {
  const id = getUniqueId()

  return prisma.adminUser.create({
    data: {
      username: `admin${id}`,
      email: `admin${id}@example.com`,
      displayName: `Admin User ${id}`,
      passwordHash: '$2b$10$dummyHashForTesting', // Dummy bcrypt hash
      role: 'admin',
      ...overrides,
    },
  })
}

/**
 * Create a test event
 */
export async function createEvent(
  prisma: PrismaClient,
  overrides: Partial<{
    name: string
    code: string
    description: string
    startDate: Date
    endDate: Date
    status: string
  }> = {}
) {
  const id = getUniqueId()
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

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
  })
}

/**
 * Create a test tag
 */
export async function createTag(
  prisma: PrismaClient,
  overrides: Partial<{
    name: string
    color: string
    description: string
    displayOrder: number
  }> = {}
) {
  const id = getUniqueId()

  return prisma.tag.create({
    data: {
      name: `Tag ${id}`,
      color: '#3B82F6',
      description: `Test tag ${id}`,
      displayOrder: id,
      ...overrides,
    },
  })
}

/**
 * Create a security alert
 */
export async function createSecurityAlert(
  prisma: PrismaClient,
  overrides: Partial<{
    alertType: string
    severity: string
    badgeSerial: string
    memberId: string
    kioskId: string
    message: string
    status: string
  }> = {}
) {
  return prisma.securityAlert.create({
    data: {
      alertType: 'badge_unknown',
      severity: 'warning',
      kioskId: 'KIOSK001',
      message: 'Test security alert',
      status: 'active',
      ...overrides,
    },
  })
}

/**
 * Reset factory counter (call in beforeEach if needed for predictable IDs)
 */
export function resetFactoryCounter() {
  counter = 0
}
