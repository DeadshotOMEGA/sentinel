import type { PrismaClientInstance } from '@sentinel/database'
import { describe, expect, it, vi } from 'vitest'
import { VisitorRepository } from './visitor-repository.js'

interface VisitorCountArgs {
  where?: {
    unitEventVisitorOptionId?: string
    checkOutTime?: Date | null
  }
}

interface VisitorRepositoryPrismaMock {
  $transaction: ReturnType<typeof vi.fn>
  unitEvent: {
    findUnique: ReturnType<typeof vi.fn>
  }
  event: {
    findUnique: ReturnType<typeof vi.fn>
  }
  unitEventVisitorOption: {
    findUnique: ReturnType<typeof vi.fn>
  }
  visitor: {
    count: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    findUniqueOrThrow: ReturnType<typeof vi.fn>
  }
}

function createPrismaMock(): VisitorRepositoryPrismaMock {
  const prismaMock: VisitorRepositoryPrismaMock = {
    $transaction: vi.fn(),
    unitEvent: {
      findUnique: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
    },
    unitEventVisitorOption: {
      findUnique: vi.fn(),
    },
    visitor: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  }

  prismaMock.$transaction.mockImplementation(
    async (callback: (tx: VisitorRepositoryPrismaMock) => Promise<unknown>) => callback(prismaMock)
  )

  return prismaMock
}

describe('VisitorRepository event option capacity', () => {
  it('ignores checked-out visitors when deciding if a limited event option has room', async () => {
    const eventId = '11111111-1111-1111-1111-111111111111'
    const optionId = '22222222-2222-2222-2222-222222222222'
    const checkInTime = new Date('2026-05-21T13:00:00.000Z')
    const createdAt = new Date('2026-05-21T13:00:01.000Z')
    const prismaMock = createPrismaMock()

    prismaMock.unitEvent.findUnique.mockResolvedValue({ id: eventId })
    prismaMock.unitEventVisitorOption.findUnique.mockResolvedValue({
      id: optionId,
      eventId,
      title: 'Gallery Attendee',
      maxSelections: 27,
    })
    prismaMock.visitor.count.mockImplementation(async (args: VisitorCountArgs) =>
      args.where?.checkOutTime === null ? 0 : 27
    )
    prismaMock.visitor.create.mockResolvedValue({
      id: 'visitor-1',
      name: 'Guest, Jane',
      rankPrefix: null,
      firstName: 'Jane',
      lastName: 'Guest',
      displayName: null,
      organization: null,
      unit: null,
      mobilePhone: null,
      licensePlate: null,
      visitType: 'event',
      visitTypeId: null,
      eventId: null,
      unitEventId: eventId,
      unitEventVisitorOptionId: optionId,
      hostMemberId: null,
      visitReason: 'Event',
      visitPurpose: null,
      purposeDetails: null,
      recruitmentStep: null,
      checkInTime,
      checkOutTime: null,
      temporaryBadgeId: null,
      kioskId: 'kiosk-1',
      adminNotes: null,
      checkInMethod: 'kiosk_self_service',
      createdByAdmin: null,
      visitorGroupId: null,
      createdAt,
    })
    prismaMock.visitor.findMany.mockResolvedValue([
      {
        id: 'visitor-1',
        name: 'Guest, Jane',
        rankPrefix: null,
        firstName: 'Jane',
        lastName: 'Guest',
      },
    ])
    prismaMock.visitor.update.mockResolvedValue({})
    prismaMock.visitor.findUniqueOrThrow.mockResolvedValue({
      id: 'visitor-1',
      name: 'Guest, Jane',
      rankPrefix: null,
      firstName: 'Jane',
      lastName: 'Guest',
      displayName: 'Guest, J.',
      organization: null,
      unit: null,
      mobilePhone: null,
      licensePlate: null,
      visitType: 'event',
      visitTypeId: null,
      eventId: null,
      unitEventId: eventId,
      unitEventVisitorOptionId: optionId,
      hostMemberId: null,
      visitReason: 'Event',
      visitPurpose: null,
      purposeDetails: null,
      recruitmentStep: null,
      checkInTime,
      checkOutTime: null,
      temporaryBadgeId: null,
      kioskId: 'kiosk-1',
      adminNotes: null,
      checkInMethod: 'kiosk_self_service',
      createdByAdmin: null,
      visitorGroupId: null,
      createdAt,
      event: null,
      unitEvent: { title: 'Standing Court Martial' },
      unitEventVisitorOption: {
        id: optionId,
        eventId,
        title: 'Gallery Attendee',
        maxSelections: 27,
        displayOrder: 0,
        createdAt,
        updatedAt: createdAt,
      },
      hostMember: null,
      badge: null,
    })

    const repository = new VisitorRepository(prismaMock as unknown as PrismaClientInstance)

    await expect(
      repository.create({
        firstName: 'Jane',
        lastName: 'Guest',
        visitType: 'event',
        visitReason: 'Event',
        unitEventId: eventId,
        unitEventVisitorOptionId: optionId,
        kioskId: 'kiosk-1',
        checkInMethod: 'kiosk_self_service',
      })
    ).resolves.toMatchObject({
      id: 'visitor-1',
      unitEventVisitorOptionId: optionId,
    })

    expect(prismaMock.visitor.count).toHaveBeenCalledWith({
      where: {
        unitEventVisitorOptionId: optionId,
        checkOutTime: null,
      },
    })
  })
})
