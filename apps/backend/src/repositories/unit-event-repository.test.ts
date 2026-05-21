import type { PrismaClientInstance } from '@sentinel/database'
import { describe, expect, it, vi } from 'vitest'
import { UnitEventRepository } from './unit-event-repository.js'

interface UnitEventRepositoryPrismaMock {
  unitEvent: {
    findMany: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }
}

describe('UnitEventRepository visitor option counts', () => {
  it('loads selectedCount from active visitors only', async () => {
    const prismaMock: UnitEventRepositoryPrismaMock = {
      unitEvent: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    }
    const repository = new UnitEventRepository(prismaMock as unknown as PrismaClientInstance)

    await repository.findEvents({ status: 'scheduled' })

    expect(prismaMock.unitEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          visitorOptions: expect.objectContaining({
            include: {
              _count: {
                select: {
                  visitors: {
                    where: {
                      checkOutTime: null,
                    },
                  },
                },
              },
            },
          }),
        }),
      })
    )
  })
})
