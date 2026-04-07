import type { PrismaClientInstance } from '@sentinel/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveDutyAssignmentService } from './live-duty-assignment-service.js'

function createDutyPosition(code: 'SWK' | 'QM' = 'SWK') {
  return {
    id: `position-${code.toLowerCase()}`,
    code,
    name: code === 'SWK' ? 'Senior Watch Keeper' : 'Quartermaster',
    maxSlots: 1,
    dutyRole: {
      id: 'role-duty-watch',
      code: 'DUTY_WATCH',
      name: 'Duty Watch',
    },
  }
}

function createAssignmentEntity(positionCode: 'SWK' | 'QM' = 'SWK') {
  return {
    id: `assignment-${positionCode.toLowerCase()}`,
    memberId: 'member-1',
    dutyPositionId: `position-${positionCode.toLowerCase()}`,
    notes: null,
    startedAt: new Date('2026-04-02T18:00:00.000Z'),
    endedAt: null,
    endedReason: null,
    createdAt: new Date('2026-04-02T18:00:00.000Z'),
    updatedAt: new Date('2026-04-02T18:00:00.000Z'),
    member: {
      id: 'member-1',
      firstName: 'Alex',
      lastName: 'Stone',
      rank: 'PO1',
      serviceNumber: '123456',
    },
    dutyPosition: {
      ...createDutyPosition(positionCode),
      dutyRole: {
        id: 'role-duty-watch',
        code: 'DUTY_WATCH',
        name: 'Duty Watch',
      },
    },
  }
}

function createService() {
  const prisma = {
    member: {
      findUnique: vi.fn(),
    },
  }

  const repository = {
    findDutyPositionById: vi.fn(),
    findActiveByMemberId: vi.fn(),
    countActiveForPosition: vi.fn(),
    createAssignment: vi.fn(),
    endAssignment: vi.fn(),
  }

  const qualificationService = {
    memberHasActiveQualificationCode: vi.fn(),
  }

  const presenceService = {
    isMemberPresent: vi.fn(),
  }

  const service = new LiveDutyAssignmentService(prisma as unknown as PrismaClientInstance)

  Reflect.set(service, 'repository', repository)
  Reflect.set(service, 'qualificationService', qualificationService)
  Reflect.set(service, 'presenceService', presenceService)

  return {
    service,
    prisma,
    repository,
    qualificationService,
    presenceService,
  }
}

describe('LiveDutyAssignmentService.assignTemporaryDuty', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects when the member is not currently checked in', async () => {
    const { service, prisma, repository, presenceService } = createService()

    prisma.member.findUnique.mockResolvedValue({ id: 'member-1' })
    repository.findDutyPositionById.mockResolvedValue(createDutyPosition('SWK'))
    presenceService.isMemberPresent.mockResolvedValue(false)

    await expect(
      service.assignTemporaryDuty({
        memberId: 'member-1',
        dutyPositionId: 'position-swk',
      })
    ).rejects.toThrow('checked in')
  })

  it('rejects when the member lacks the required qualification', async () => {
    const { service, prisma, repository, presenceService, qualificationService } = createService()

    prisma.member.findUnique.mockResolvedValue({ id: 'member-1' })
    repository.findDutyPositionById.mockResolvedValue(createDutyPosition('SWK'))
    presenceService.isMemberPresent.mockResolvedValue(true)
    qualificationService.memberHasActiveQualificationCode.mockResolvedValue(false)

    await expect(
      service.assignTemporaryDuty({
        memberId: 'member-1',
        dutyPositionId: 'position-swk',
      })
    ).rejects.toThrow('active SWK qualification')
  })

  it('ends an existing assignment before reassigning the member to a new temporary role', async () => {
    const { service, prisma, repository, presenceService, qualificationService } = createService()

    const newAssignment = createAssignmentEntity('QM')

    prisma.member.findUnique.mockResolvedValue({ id: 'member-1' })
    repository.findDutyPositionById.mockResolvedValue(createDutyPosition('QM'))
    repository.findActiveByMemberId.mockResolvedValue(createAssignmentEntity('SWK'))
    repository.countActiveForPosition.mockResolvedValue(0)
    repository.endAssignment.mockResolvedValue(createAssignmentEntity('SWK'))
    repository.createAssignment.mockResolvedValue(newAssignment)
    presenceService.isMemberPresent.mockResolvedValue(true)
    qualificationService.memberHasActiveQualificationCode.mockResolvedValue(true)

    const result = await service.assignTemporaryDuty({
      memberId: 'member-1',
      dutyPositionId: 'position-qm',
      notes: 'Covering until 2200',
    })

    expect(repository.endAssignment).toHaveBeenCalledWith('assignment-swk', {
      endedAt: expect.any(Date),
      endedReason: 'reassigned',
    })
    expect(repository.createAssignment).toHaveBeenCalledWith({
      memberId: 'member-1',
      dutyPositionId: 'position-qm',
      notes: 'Covering until 2200',
    })
    expect(result).toBe(newAssignment)
  })
})
