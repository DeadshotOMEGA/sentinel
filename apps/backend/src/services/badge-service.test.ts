import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@sentinel/database'
import type { Badge, Member } from '@sentinel/types'
import { ConflictError, NotFoundError } from '../middleware/error-handler.js'
import { BadgeService } from './badge-service.js'

function createService() {
  const service = new BadgeService({} as PrismaClient)
  const memberRepo = {
    findById: vi.fn<(...args: [string]) => Promise<Member | null>>(),
    update: vi.fn<(...args: [string, { badgeId: string | null }]) => Promise<Member>>(),
  }
  const badgeRepo = {
    findById: vi.fn<(...args: [string]) => Promise<Badge | null>>(),
    clearAssignmentReferences: vi.fn<(...args: [string]) => Promise<void>>(),
    updateStatus: vi.fn<(...args: [string, string]) => Promise<Badge>>(),
    getHistoricalUsage:
      vi.fn<(...args: [string]) => Promise<{ checkins: number; eventCheckins: number }>>(),
    delete: vi.fn<(...args: [string]) => Promise<void>>(),
  }

  Reflect.set(service, 'memberRepo', memberRepo)
  Reflect.set(service, 'badgeRepo', badgeRepo)

  return { service, memberRepo, badgeRepo }
}

describe('BadgeService.replaceMemberBadge', () => {
  it('unassigns the current badge and assigns the replacement badge', async () => {
    const { service, memberRepo, badgeRepo } = createService()
    memberRepo.findById.mockResolvedValue({
      id: 'member-1',
      badgeId: 'badge-1',
    } as Member)
    badgeRepo.findById.mockResolvedValue({
      id: 'badge-2',
      assignmentType: 'unassigned',
    } as Badge)

    const unassignSpy = vi.spyOn(service, 'unassign').mockResolvedValue({} as Badge)
    const assignSpy = vi.spyOn(service, 'assign').mockResolvedValue({} as Badge)

    await service.replaceMemberBadge('member-1', 'badge-2')

    expect(unassignSpy).toHaveBeenCalledWith('badge-1')
    expect(assignSpy).toHaveBeenCalledWith('badge-2', 'member-1')
  })

  it('clears the member badge by unassigning the current badge only', async () => {
    const { service, memberRepo } = createService()
    memberRepo.findById.mockResolvedValue({
      id: 'member-1',
      badgeId: 'badge-1',
    } as Member)

    const unassignSpy = vi.spyOn(service, 'unassign').mockResolvedValue({} as Badge)
    const assignSpy = vi.spyOn(service, 'assign').mockResolvedValue({} as Badge)

    await service.replaceMemberBadge('member-1', null)

    expect(unassignSpy).toHaveBeenCalledWith('badge-1')
    expect(assignSpy).not.toHaveBeenCalled()
  })

  it('throws when the member does not exist', async () => {
    const { service, memberRepo } = createService()
    memberRepo.findById.mockResolvedValue(null)

    await expect(service.replaceMemberBadge('missing-member', 'badge-1')).rejects.toBeInstanceOf(
      NotFoundError
    )
  })

  it('does not unassign the current badge when the replacement badge is already taken', async () => {
    const { service, memberRepo, badgeRepo } = createService()
    memberRepo.findById.mockResolvedValue({
      id: 'member-1',
      badgeId: 'badge-1',
    } as Member)
    badgeRepo.findById.mockResolvedValue({
      id: 'badge-2',
      assignmentType: 'member',
      assignedToId: 'member-2',
    } as Badge)

    const unassignSpy = vi.spyOn(service, 'unassign').mockResolvedValue({} as Badge)

    await expect(service.replaceMemberBadge('member-1', 'badge-2')).rejects.toBeInstanceOf(
      ConflictError
    )
    expect(unassignSpy).not.toHaveBeenCalled()
  })
})

describe('BadgeService badge lifecycle', () => {
  it('unassigns a badge before decommissioning it', async () => {
    const { service, badgeRepo } = createService()
    badgeRepo.findById.mockResolvedValue({
      id: 'badge-1',
      assignmentType: 'member',
      assignedToId: 'member-1',
      status: 'active',
    } as Badge)
    badgeRepo.updateStatus.mockResolvedValue({
      id: 'badge-1',
      status: 'decommissioned',
    } as Badge)

    const unassignSpy = vi.spyOn(service, 'unassign').mockResolvedValue({} as Badge)

    await service.updateStatus('badge-1', 'decommissioned')

    expect(unassignSpy).toHaveBeenCalledWith('badge-1')
    expect(badgeRepo.updateStatus).toHaveBeenCalledWith('badge-1', 'decommissioned')
  })

  it('blocks deleting an assigned badge unless current assignments are cleared first', async () => {
    const { service, badgeRepo } = createService()
    badgeRepo.findById.mockResolvedValue({
      id: 'badge-1',
      assignmentType: 'member',
      assignedToId: 'member-1',
      status: 'active',
    } as Badge)

    await expect(service.delete('badge-1')).rejects.toBeInstanceOf(ConflictError)
    expect(badgeRepo.delete).not.toHaveBeenCalled()
  })

  it('deletes an assigned badge after unassigning when requested and no history exists', async () => {
    const { service, badgeRepo } = createService()
    badgeRepo.findById.mockResolvedValue({
      id: 'badge-1',
      assignmentType: 'member',
      assignedToId: 'member-1',
      status: 'active',
    } as Badge)
    badgeRepo.getHistoricalUsage.mockResolvedValue({
      checkins: 0,
      eventCheckins: 0,
    })

    const unassignSpy = vi.spyOn(service, 'unassign').mockResolvedValue({} as Badge)

    await service.delete('badge-1', { unassignFirst: true })

    expect(unassignSpy).toHaveBeenCalledWith('badge-1')
    expect(badgeRepo.delete).toHaveBeenCalledWith('badge-1')
  })

  it('blocks deleting a badge with historical activity', async () => {
    const { service, badgeRepo } = createService()
    badgeRepo.findById.mockResolvedValue({
      id: 'badge-1',
      assignmentType: 'unassigned',
      status: 'active',
    } as Badge)
    badgeRepo.getHistoricalUsage.mockResolvedValue({
      checkins: 2,
      eventCheckins: 0,
    })

    await expect(service.delete('badge-1')).rejects.toBeInstanceOf(ConflictError)

    expect(badgeRepo.clearAssignmentReferences).toHaveBeenCalledWith('badge-1')
    expect(badgeRepo.delete).not.toHaveBeenCalled()
  })
})
