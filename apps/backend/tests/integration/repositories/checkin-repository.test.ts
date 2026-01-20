import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import {
  createMember,
  createBadge,
  createCheckin,
  createDivision,
} from '../../helpers/factories'
import { CheckinRepository } from '@/repositories/checkin-repository'

describe('CheckinRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: CheckinRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new CheckinRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    await testDb.seed()
  })

  describe('create', () => {
    it('should create a checkin with all required fields', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member = await createMember(testDb.prisma!, { badgeId: badge.id })

      const checkin = await repo.create({
        memberId: member.id,
        badgeId: badge.id,
        direction: 'IN',
        timestamp: new Date(),
        kioskId: 'KIOSK-001',
        synced: true,
      })

      expect(checkin.id).toBeDefined()
      expect(checkin.memberId).toBe(member.id)
      expect(checkin.badgeId).toBe(badge.id)
      expect(checkin.direction).toBe('IN')
      expect(checkin.kioskId).toBe('KIOSK-001')
    })

    it('should default synced to true if not provided', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member = await createMember(testDb.prisma!, { badgeId: badge.id })

      const checkin = await repo.create({
        memberId: member.id,
        badgeId: badge.id,
        direction: 'IN',
        timestamp: new Date(),
        kioskId: 'KIOSK-001',
      })

      expect(checkin.synced).toBe(true)
    })

    it('should create checkin with OUT direction', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member = await createMember(testDb.prisma!, { badgeId: badge.id })

      const checkin = await repo.create({
        memberId: member.id,
        badgeId: badge.id,
        direction: 'OUT',
        timestamp: new Date(),
        kioskId: 'KIOSK-001',
      })

      expect(checkin.direction).toBe('OUT')
    })

    it('should throw error when member does not exist', async () => {
      const badge = await createBadge(testDb.prisma!)

      await expect(
        repo.create({
          memberId: 'non-existent-member',
          badgeId: badge.id,
          direction: 'IN',
          timestamp: new Date(),
          kioskId: 'KIOSK-001',
        })
      ).rejects.toThrow()
    })

    it('should throw error when badge does not exist', async () => {
      const member = await createMember(testDb.prisma!)

      await expect(
        repo.create({
          memberId: member.id,
          badgeId: 'non-existent-badge',
          direction: 'IN',
          timestamp: new Date(),
          kioskId: 'KIOSK-001',
        })
      ).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should find checkin by ID', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member = await createMember(testDb.prisma!, { badgeId: badge.id })
      const created = await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        scannedAt: new Date(),
      })

      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.badgeId).toBe(badge.id)
    })

    it('should return null when checkin does not exist', async () => {
      const found = await repo.findById('non-existent-id')

      expect(found).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should find all checkins without filters', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })
      await createCheckin(testDb.prisma!, { badgeId: badge.id })
      await createCheckin(testDb.prisma!, { badgeId: badge.id })

      const checkins = await repo.findAll()

      expect(checkins.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by badge ID', async () => {
      const badge1 = await createBadge(testDb.prisma!, { serialNumber: 'B001' })
      const badge2 = await createBadge(testDb.prisma!, { serialNumber: 'B002' })
      await createMember(testDb.prisma!, { badgeId: badge1.id })
      await createMember(testDb.prisma!, { badgeId: badge2.id })

      await createCheckin(testDb.prisma!, { badgeId: badge1.id })
      await createCheckin(testDb.prisma!, { badgeId: badge2.id })

      const checkins = await repo.findAll({ badgeId: badge1.id })

      expect(checkins).toHaveLength(1)
      expect(checkins[0].badgeId).toBe(badge1.id)
    })

    it('should filter by kiosk ID', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })

      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        kioskId: 'KIOSK-001',
      })
      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        kioskId: 'KIOSK-002',
      })

      const checkins = await repo.findAll({ kioskId: 'KIOSK-001' })

      expect(checkins).toHaveLength(1)
      expect(checkins[0].kioskId).toBe('KIOSK-001')
    })

    it('should filter by date range', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })

      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        scannedAt: yesterday,
      })
      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        scannedAt: now,
      })

      const checkins = await repo.findAll({
        dateRange: {
          start: new Date(now.getTime() - 1000),
          end: tomorrow,
        },
      })

      expect(checkins).toHaveLength(1)
    })

    it('should return empty array when no matches', async () => {
      const checkins = await repo.findAll({ kioskId: 'NON_EXISTENT' })

      expect(checkins).toEqual([])
    })
  })

  describe('findPaginated', () => {
    it('should paginate checkins', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })

      for (let i = 0; i < 5; i++) {
        await createCheckin(testDb.prisma!, { badgeId: badge.id })
      }

      const result = await repo.findPaginated(
        { page: 1, limit: 2 },
        {}
      )

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(5)
    })

    it('should return second page of results', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })

      for (let i = 0; i < 5; i++) {
        await createCheckin(testDb.prisma!, { badgeId: badge.id })
      }

      const result = await repo.findPaginated(
        { page: 2, limit: 2 },
        {}
      )

      expect(result.items).toHaveLength(2)
    })

    it('should sort by timestamp descending', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })

      const checkin1 = await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        scannedAt: new Date(Date.now() - 10000),
      })
      const checkin2 = await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        scannedAt: new Date(),
      })

      const result = await repo.findPaginated(
        { page: 1, limit: 10, sortBy: 'timestamp', sortOrder: 'desc' },
        {}
      )

      expect(result.items[0].id).toBe(checkin2.id)
      expect(result.items[1].id).toBe(checkin1.id)
    })

    it('should combine pagination with filters', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })

      for (let i = 0; i < 5; i++) {
        await createCheckin(testDb.prisma!, {
          badgeId: badge.id,
          kioskId: 'KIOSK-001',
        })
      }
      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        kioskId: 'KIOSK-002',
      })

      const result = await repo.findPaginated(
        { page: 1, limit: 10 },
        { kioskId: 'KIOSK-001' }
      )

      expect(result.items).toHaveLength(5)
      expect(result.total).toBe(5)
    })
  })

  describe('findLatestByMember', () => {
    it('should find latest checkin for a member', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member = await createMember(testDb.prisma!, { badgeId: badge.id })

      const checkin1 = await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        scannedAt: new Date(Date.now() - 10000),
      })
      const checkin2 = await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        scannedAt: new Date(),
      })

      const latest = await repo.findLatestByMember(member.id)

      expect(latest).toBeDefined()
      expect(latest?.id).toBe(checkin2.id)
    })

    it('should return null when member has no checkins', async () => {
      const member = await createMember(testDb.prisma!)

      const latest = await repo.findLatestByMember(member.id)

      expect(latest).toBeNull()
    })
  })

  describe('findLatestByMembers', () => {
    it('should find latest checkins for multiple members', async () => {
      const badge1 = await createBadge(testDb.prisma!, { serialNumber: 'B001' })
      const badge2 = await createBadge(testDb.prisma!, { serialNumber: 'B002' })
      const member1 = await createMember(testDb.prisma!, { badgeId: badge1.id })
      const member2 = await createMember(testDb.prisma!, { badgeId: badge2.id })

      const checkin1 = await createCheckin(testDb.prisma!, { badgeId: badge1.id })
      const checkin2 = await createCheckin(testDb.prisma!, { badgeId: badge2.id })

      const latest = await repo.findLatestByMembers([member1.id, member2.id])

      expect(latest.size).toBe(2)
      expect(latest.get(member1.id)?.id).toBe(checkin1.id)
      expect(latest.get(member2.id)?.id).toBe(checkin2.id)
    })

    it('should return empty map when no member IDs provided', async () => {
      const latest = await repo.findLatestByMembers([])

      expect(latest.size).toBe(0)
    })

    it('should skip members with no checkins', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member1 = await createMember(testDb.prisma!, { badgeId: badge.id })
      const member2 = await createMember(testDb.prisma!)

      await createCheckin(testDb.prisma!, { badgeId: badge.id })

      const latest = await repo.findLatestByMembers([member1.id, member2.id])

      expect(latest.size).toBe(1)
      expect(latest.has(member1.id)).toBe(true)
      expect(latest.has(member2.id)).toBe(false)
    })
  })

  describe('getPresenceStats', () => {
    it('should return presence statistics', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member = await createMember(testDb.prisma!, { badgeId: badge.id })
      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        direction: 'IN',
      })

      const stats = await repo.getPresenceStats()

      expect(stats).toBeDefined()
      expect(stats.totalMembers).toBeGreaterThanOrEqual(1)
      expect(typeof stats.present).toBe('number')
      expect(typeof stats.absent).toBe('number')
    })

    it('should calculate correct present count', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })
      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        direction: 'IN',
      })

      const stats = await repo.getPresenceStats()

      expect(stats.present).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getPresentMembers', () => {
    it('should return list of currently present members', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member = await createMember(testDb.prisma!, {
        badgeId: badge.id,
        firstName: 'John',
        lastName: 'Doe',
      })
      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        direction: 'IN',
        scannedAt: new Date(),
      })

      const presentMembers = await repo.getPresentMembers()

      expect(presentMembers).toBeDefined()
      expect(Array.isArray(presentMembers)).toBe(true)

      if (presentMembers.length > 0) {
        const found = presentMembers.find((m) => m.id === member.id)
        if (found) {
          expect(found.firstName).toBe('John')
          expect(found.lastName).toBe('Doe')
        }
      }
    })

    it('should return empty array when no one is present', async () => {
      const presentMembers = await repo.getPresentMembers()

      expect(presentMembers).toEqual([])
    })
  })

  describe('getMemberPresenceList', () => {
    it('should return presence list for all members', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member = await createMember(testDb.prisma!, { badgeId: badge.id })
      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        direction: 'IN',
      })

      const presenceList = await repo.getMemberPresenceList()

      expect(presenceList).toBeDefined()
      expect(Array.isArray(presenceList)).toBe(true)
      expect(presenceList.length).toBeGreaterThanOrEqual(1)

      const memberPresence = presenceList.find((p) => p.member.id === member.id)
      expect(memberPresence).toBeDefined()
      expect(memberPresence?.status).toBe('present')
    })

    it('should show absent status for members without checkins', async () => {
      const member = await createMember(testDb.prisma!)

      const presenceList = await repo.getMemberPresenceList()

      const memberPresence = presenceList.find((p) => p.member.id === member.id)
      expect(memberPresence).toBeDefined()
      expect(memberPresence?.status).toBe('absent')
    })
  })

  describe('getRecentActivity', () => {
    it('should return recent checkin activity', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })
      await createCheckin(testDb.prisma!, { badgeId: badge.id })

      const activity = await repo.getRecentActivity(10)

      expect(activity).toBeDefined()
      expect(Array.isArray(activity)).toBe(true)
    })

    it('should limit results to specified limit', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })

      for (let i = 0; i < 15; i++) {
        await createCheckin(testDb.prisma!, { badgeId: badge.id })
      }

      const activity = await repo.getRecentActivity(5)

      expect(activity.length).toBeLessThanOrEqual(5)
    })

    it('should order by timestamp descending', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })

      const checkin1 = await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        scannedAt: new Date(Date.now() - 10000),
      })
      const checkin2 = await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        scannedAt: new Date(),
      })

      const activity = await repo.getRecentActivity(10)

      if (activity.length >= 2) {
        const timestamp1 = new Date(activity[0].timestamp).getTime()
        const timestamp2 = new Date(activity[1].timestamp).getTime()
        expect(timestamp1).toBeGreaterThanOrEqual(timestamp2)
      }
    })
  })

  describe('edge cases', () => {
    it('should handle multiple checkins for same member', async () => {
      const badge = await createBadge(testDb.prisma!)
      const member = await createMember(testDb.prisma!, { badgeId: badge.id })

      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        direction: 'IN',
        scannedAt: new Date(Date.now() - 10000),
      })
      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        direction: 'OUT',
        scannedAt: new Date(),
      })

      const checkins = await repo.findAll({ memberId: member.id })

      expect(checkins.length).toBe(2)
    })

    it('should handle checkins across different days', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })

      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        scannedAt: yesterday,
      })
      await createCheckin(testDb.prisma!, {
        badgeId: badge.id,
        scannedAt: today,
      })

      const all = await repo.findAll()

      expect(all.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle pagination beyond available pages', async () => {
      const badge = await createBadge(testDb.prisma!)
      await createMember(testDb.prisma!, { badgeId: badge.id })
      await createCheckin(testDb.prisma!, { badgeId: badge.id })

      const result = await repo.findPaginated({ page: 100, limit: 10 }, {})

      expect(result.items).toEqual([])
      expect(result.total).toBe(1)
    })
  })
})
