import { describe, expect, it, vi } from 'vitest'
import type { Member } from '@sentinel/types'
import { ImportService } from './import-service.js'

function createMockMember(
  overrides: Partial<Member> &
    Pick<Member, 'id' | 'serviceNumber' | 'rank' | 'firstName' | 'lastName'>
): Member {
  const now = new Date('2026-04-22T12:00:00Z')

  return {
    id: overrides.id,
    serviceNumber: overrides.serviceNumber,
    employeeNumber: overrides.employeeNumber,
    firstName: overrides.firstName,
    lastName: overrides.lastName,
    displayName: overrides.displayName,
    initials: overrides.initials,
    rank: overrides.rank,
    divisionId: overrides.divisionId ?? 'division-1',
    mess: overrides.mess,
    moc: overrides.moc,
    memberType: overrides.memberType ?? 'class_a',
    memberSource: overrides.memberSource ?? 'nominal_roll',
    memberTypeId: overrides.memberTypeId,
    memberStatusId: overrides.memberStatusId,
    classDetails: overrides.classDetails,
    notes: overrides.notes,
    contractStart: overrides.contractStart,
    contractEnd: overrides.contractEnd,
    status: overrides.status ?? 'active',
    email: overrides.email,
    homePhone: overrides.homePhone,
    mobilePhone: overrides.mobilePhone,
    badgeId: overrides.badgeId,
    accountLevel: overrides.accountLevel ?? 1,
    mustChangePin: overrides.mustChangePin ?? false,
    missedCheckoutCount: overrides.missedCheckoutCount ?? 0,
    lastMissedCheckout: overrides.lastMissedCheckout,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  }
}

function createImportServiceHarness() {
  const service = Object.create(ImportService.prototype) as ImportService & {
    memberRepository: {
      findByServiceNumbers: ReturnType<typeof vi.fn>
      findAll: ReturnType<typeof vi.fn>
    }
    divisionRepository: {
      findAll: ReturnType<typeof vi.fn>
    }
    rankRepository: {
      findAll: ReturnType<typeof vi.fn>
    }
  }

  service.memberRepository = {
    findByServiceNumbers: vi.fn(),
    findAll: vi.fn(),
  }
  service.divisionRepository = {
    findAll: vi.fn().mockResolvedValue([
      {
        id: 'division-1',
        code: 'OPS',
        name: 'Operations',
      },
    ]),
  }
  service.rankRepository = {
    findAll: vi.fn().mockResolvedValue([
      {
        id: 'rank-1',
        code: 'S1',
        name: 'Sailor First Class',
        branch: 'navy',
        category: 'junior_ncm',
        displayOrder: 3,
        isActive: true,
        createdAt: new Date('2026-04-22T12:00:00Z'),
        updatedAt: new Date('2026-04-22T12:00:00Z'),
      },
    ]),
  }

  return service
}

describe('ImportService nominal roll isolation', () => {
  it('requests only nominal-roll members for preview deactivation review', async () => {
    const service = createImportServiceHarness()
    const nominalRollMember = createMockMember({
      id: 'member-1',
      serviceNumber: 'V999999',
      rank: 'S1',
      firstName: 'Taylor',
      lastName: 'Nominal',
      memberSource: 'nominal_roll',
    })
    const civilianMember = createMockMember({
      id: 'member-2',
      serviceNumber: 'CIV-0001',
      rank: 'S1',
      firstName: 'Casey',
      lastName: 'Civilian',
      memberSource: 'civilian_manual',
    })

    service.memberRepository.findByServiceNumbers.mockResolvedValue([])
    service.memberRepository.findAll.mockImplementation(
      async (filters?: { memberSource?: string }) =>
        filters?.memberSource === 'nominal_roll'
          ? [nominalRollMember]
          : [nominalRollMember, civilianMember]
    )

    const preview = await service.generatePreview(
      ['SN,RANK,LAST_NAME,FIRST_NAME,DEPT', 'V123456,S1,Doe,Jamie,OPS'].join('\n')
    )

    expect(service.memberRepository.findByServiceNumbers).toHaveBeenCalledWith(['V123456'], {
      memberSource: 'nominal_roll',
    })
    expect(service.memberRepository.findAll).toHaveBeenCalledWith({
      status: 'active',
      memberSource: 'nominal_roll',
    })
    expect(preview.toReview).toEqual([
      {
        id: 'member-1',
        serviceNumber: 'V999999',
        rank: 'S1',
        firstName: 'Taylor',
        lastName: 'Nominal',
        divisionId: 'division-1',
      },
    ])
  })

  it('treats a matching civilian record as a new nominal-roll add instead of an update', async () => {
    const service = createImportServiceHarness()
    const civilianMember = createMockMember({
      id: 'member-2',
      serviceNumber: 'V123456',
      rank: 'S1',
      firstName: 'Jamie',
      lastName: 'Doe',
      memberSource: 'civilian_manual',
    })

    service.memberRepository.findByServiceNumbers.mockImplementation(
      async (_serviceNumbers: string[], filters?: { memberSource?: string }) =>
        filters?.memberSource === 'nominal_roll' ? [] : [civilianMember]
    )
    service.memberRepository.findAll.mockResolvedValue([])

    const preview = await service.generatePreview(
      ['SN,RANK,LAST_NAME,FIRST_NAME,DEPT', 'V123456,S1,Doe,Jamie,OPS'].join('\n')
    )

    expect(preview.toAdd).toEqual([
      {
        serviceNumber: 'V123456',
        employeeNumber: undefined,
        rank: 'S1',
        lastName: 'Doe',
        firstName: 'Jamie',
        initials: undefined,
        department: 'OPS',
        mess: undefined,
        moc: undefined,
        email: undefined,
        homePhone: undefined,
        mobilePhone: undefined,
        details: undefined,
      },
    ])
    expect(preview.toUpdate).toEqual([])
  })
})
