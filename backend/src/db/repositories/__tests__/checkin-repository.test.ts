// Set environment VERY FIRST before any imports
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'test-password';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'sentinel_test';
process.env.DB_USER = 'sentinel';
process.env.DB_PASSWORD = 'sentinel';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  Checkin,
  CreateCheckinInput,
  PresenceStats,
  MemberWithDivision,
  Division,
} from '../../../../../shared/types';

// Mock the pool/connection BEFORE importing CheckinRepository
vi.mock('../../connection', () => ({
  pool: {
    connect: vi.fn(),
  },
}));

// Mock the redis module BEFORE importing CheckinRepository
vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  },
}));

import { CheckinRepository } from '../checkin-repository';
import { redis } from '../../redis';
import { pool } from '../../connection';

describe('CheckinRepository', () => {
  let repository: CheckinRepository;
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = new CheckinRepository();
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    (pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a checkin record with valid input', async () => {
      const now = new Date();
      const createInput: CreateCheckinInput = {
        memberId: 'member-123',
        badgeId: 'badge-456',
        direction: 'in',
        timestamp: now,
        kioskId: 'kiosk-001',
        synced: true,
      };

      const expectedCheckin: Record<string, unknown> = {
        id: 'checkin-789',
        member_id: 'member-123',
        badge_id: 'badge-456',
        direction: 'in',
        timestamp: now,
        kiosk_id: 'kiosk-001',
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [expectedCheckin], rowCount: 1 });
      (redis.del as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);

      const result = await repository.create(createInput);

      expect(result).toMatchObject({
        id: 'checkin-789',
        memberId: 'member-123',
        badgeId: 'badge-456',
        direction: 'in',
        kioskId: 'kiosk-001',
        synced: true,
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO checkins'),
        [
          'member-123',
          'badge-456',
          'in',
          now,
          'kiosk-001',
          true,
        ]
      );
      expect(redis.del).toHaveBeenCalledWith('presence:stats');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should set synced to true by default', async () => {
      const now = new Date();
      const createInput: CreateCheckinInput = {
        memberId: 'member-123',
        badgeId: 'badge-456',
        direction: 'out',
        timestamp: now,
      };

      const expectedCheckin: Record<string, unknown> = {
        id: 'checkin-789',
        member_id: 'member-123',
        badge_id: 'badge-456',
        direction: 'out',
        timestamp: now,
        kiosk_id: null,
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [expectedCheckin], rowCount: 1 });
      (redis.del as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);

      const result = await repository.create(createInput);

      expect(result.synced).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO checkins'),
        [
          'member-123',
          'badge-456',
          'out',
          now,
          null,
          true,
        ]
      );
    });

    it('should handle kioskId as null when not provided', async () => {
      const now = new Date();
      const createInput: CreateCheckinInput = {
        memberId: 'member-123',
        badgeId: 'badge-456',
        direction: 'in',
        timestamp: now,
      };

      const expectedCheckin: Record<string, unknown> = {
        id: 'checkin-789',
        member_id: 'member-123',
        badge_id: 'badge-456',
        direction: 'in',
        timestamp: now,
        kiosk_id: null,
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [expectedCheckin], rowCount: 1 });
      (redis.del as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);

      await repository.create(createInput);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO checkins'),
        expect.arrayContaining([null])
      );
    });

    it('should throw error when create fails', async () => {
      const now = new Date();
      const createInput: CreateCheckinInput = {
        memberId: 'member-123',
        badgeId: 'badge-456',
        direction: 'in',
        timestamp: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(repository.create(createInput)).rejects.toThrow('Failed to create checkin');
    });
  });

  describe('findLatestByMember', () => {
    it('should find latest checkin for a member', async () => {
      const now = new Date();
      const checkinRow: Record<string, unknown> = {
        id: 'checkin-123',
        member_id: 'member-456',
        badge_id: 'badge-789',
        direction: 'in',
        timestamp: now,
        kiosk_id: 'kiosk-001',
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [checkinRow], rowCount: 1 });

      const result = await repository.findLatestByMember('member-456');

      expect(result).toMatchObject({
        id: 'checkin-123',
        memberId: 'member-456',
        badgeId: 'badge-789',
        direction: 'in',
        kioskId: 'kiosk-001',
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp DESC'),
        ['member-456']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return null when member has no checkins', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repository.findLatestByMember('member-nonexistent');

      expect(result).toBeNull();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT *'),
        ['member-nonexistent']
      );
    });

    it('should handle latest checkin with direction out', async () => {
      const now = new Date();
      const checkinRow: Record<string, unknown> = {
        id: 'checkin-456',
        member_id: 'member-789',
        badge_id: 'badge-012',
        direction: 'out',
        timestamp: now,
        kiosk_id: null,
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [checkinRow], rowCount: 1 });

      const result = await repository.findLatestByMember('member-789');

      expect(result?.direction).toBe('out');
    });
  });

  describe('findById', () => {
    it('should find checkin by id', async () => {
      const now = new Date();
      const checkinRow: Record<string, unknown> = {
        id: 'checkin-123',
        member_id: 'member-456',
        badge_id: 'badge-789',
        direction: 'in',
        timestamp: now,
        kiosk_id: 'kiosk-001',
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [checkinRow], rowCount: 1 });

      const result = await repository.findById('checkin-123');

      expect(result).toMatchObject({
        id: 'checkin-123',
        memberId: 'member-456',
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['checkin-123']
      );
    });

    it('should return null when checkin not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all checkins without filters', async () => {
      const now = new Date();
      const checkins: Record<string, unknown>[] = [
        {
          id: 'checkin-1',
          member_id: 'member-1',
          badge_id: 'badge-1',
          direction: 'in',
          timestamp: now,
          kiosk_id: 'kiosk-001',
          synced: true,
          created_at: now,
        },
        {
          id: 'checkin-2',
          member_id: 'member-2',
          badge_id: 'badge-2',
          direction: 'out',
          timestamp: now,
          kiosk_id: null,
          synced: true,
          created_at: now,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: checkins, rowCount: 2 });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].memberId).toBe('member-1');
      expect(result[1].memberId).toBe('member-2');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp DESC'),
        []
      );
    });

    it('should find checkins with memberId filter', async () => {
      const now = new Date();
      const checkin: Record<string, unknown> = {
        id: 'checkin-1',
        member_id: 'member-123',
        badge_id: 'badge-1',
        direction: 'in',
        timestamp: now,
        kiosk_id: 'kiosk-001',
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [checkin], rowCount: 1 });

      const result = await repository.findAll({ memberId: 'member-123' });

      expect(result).toHaveLength(1);
      expect(result[0].memberId).toBe('member-123');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE member_id = $1'),
        ['member-123']
      );
    });

    it('should find checkins with badgeId filter', async () => {
      const now = new Date();
      const checkin: Record<string, unknown> = {
        id: 'checkin-1',
        member_id: 'member-1',
        badge_id: 'badge-123',
        direction: 'in',
        timestamp: now,
        kiosk_id: 'kiosk-001',
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [checkin], rowCount: 1 });

      const result = await repository.findAll({ badgeId: 'badge-123' });

      expect(result[0].badgeId).toBe('badge-123');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE badge_id = $1'),
        ['badge-123']
      );
    });

    it('should find checkins with kioskId filter', async () => {
      const now = new Date();
      const checkin: Record<string, unknown> = {
        id: 'checkin-1',
        member_id: 'member-1',
        badge_id: 'badge-1',
        direction: 'in',
        timestamp: now,
        kiosk_id: 'kiosk-001',
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [checkin], rowCount: 1 });

      const result = await repository.findAll({ kioskId: 'kiosk-001' });

      expect(result[0].kioskId).toBe('kiosk-001');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE kiosk_id = $1'),
        ['kiosk-001']
      );
    });

    it('should find checkins with dateRange filter', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 86400000); // 1 day ago
      const end = now;

      const checkin: Record<string, unknown> = {
        id: 'checkin-1',
        member_id: 'member-1',
        badge_id: 'badge-1',
        direction: 'in',
        timestamp: now,
        kiosk_id: 'kiosk-001',
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [checkin], rowCount: 1 });

      const result = await repository.findAll({ dateRange: { start, end } });

      expect(result).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('timestamp >= $1'),
        [start, end]
      );
    });

    it('should combine multiple filters', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 86400000);
      const end = now;

      const checkin: Record<string, unknown> = {
        id: 'checkin-1',
        member_id: 'member-123',
        badge_id: 'badge-456',
        direction: 'in',
        timestamp: now,
        kiosk_id: 'kiosk-001',
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [checkin], rowCount: 1 });

      const result = await repository.findAll({
        memberId: 'member-123',
        badgeId: 'badge-456',
        kioskId: 'kiosk-001',
        dateRange: { start, end },
      });

      expect(result).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('AND'),
        expect.arrayContaining([
          'member-123',
          'badge-456',
          'kiosk-001',
          start,
          end,
        ])
      );
    });
  });

  describe('getPresenceStats', () => {
    it('should return cached stats when available', async () => {
      const cachedStats: PresenceStats = {
        totalMembers: 50,
        present: 35,
        absent: 15,
        onLeave: 0,
        lateArrivals: 3,
        visitors: 2,
      };

      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        JSON.stringify(cachedStats)
      );

      const result = await repository.getPresenceStats();

      expect(result).toEqual(cachedStats);
      expect(redis.get).toHaveBeenCalledWith('presence:stats');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should calculate stats when cache miss', async () => {
      const now = new Date();
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const statsRow: Record<string, unknown> = {
        total_members: 50,
        present: 35,
        absent: 15,
        on_leave: 0,
        late_arrivals: 3,
        visitors: 2,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [statsRow], rowCount: 1 });
      (redis.setex as ReturnType<typeof vi.fn>).mockResolvedValueOnce('OK');

      const result = await repository.getPresenceStats();

      expect(result).toMatchObject({
        totalMembers: 50,
        present: 35,
        absent: 15,
        onLeave: 0,
        lateArrivals: 3,
        visitors: 2,
      });

      expect(redis.setex).toHaveBeenCalledWith(
        'presence:stats',
        60,
        JSON.stringify(result)
      );
    });

    it('should handle stats with zero values', async () => {
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const statsRow: Record<string, unknown> = {
        total_members: 10,
        present: 0,
        absent: 10,
        on_leave: 0,
        late_arrivals: 0,
        visitors: 0,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [statsRow], rowCount: 1 });
      (redis.setex as ReturnType<typeof vi.fn>).mockResolvedValueOnce('OK');

      const result = await repository.getPresenceStats();

      expect(result.present).toBe(0);
      expect(result.absent).toBe(10);
      expect(result.lateArrivals).toBe(0);
      expect(result.visitors).toBe(0);
    });

    it('should handle null values in stats row', async () => {
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const statsRow: Record<string, unknown> = {
        total_members: null,
        present: null,
        absent: null,
        on_leave: null,
        late_arrivals: null,
        visitors: null,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [statsRow], rowCount: 1 });
      (redis.setex as ReturnType<typeof vi.fn>).mockResolvedValueOnce('OK');

      const result = await repository.getPresenceStats();

      expect(result.totalMembers).toBe(0);
      expect(result.present).toBe(0);
      expect(result.absent).toBe(0);
      expect(result.onLeave).toBe(0);
      expect(result.lateArrivals).toBe(0);
      expect(result.visitors).toBe(0);
    });

    it('should throw error when stats query fails', async () => {
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(repository.getPresenceStats()).rejects.toThrow(
        'Failed to get presence stats'
      );
    });
  });

  describe('getPresentMembers', () => {
    it('should get list of currently present members', async () => {
      const now = new Date();
      const presentMembersRows: Record<string, unknown>[] = [
        {
          id: 'member-1',
          first_name: 'John',
          last_name: 'Doe',
          rank: 'LT',
          division_name: 'Operations',
          mess: null,
          checked_in_at: now,
        },
        {
          id: 'member-2',
          first_name: 'Jane',
          last_name: 'Smith',
          rank: 'PO1',
          division_name: 'Admin',
          mess: 'Maple',
          checked_in_at: now,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: presentMembersRows, rowCount: 2 });

      const result = await repository.getPresentMembers();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'member-1',
        firstName: 'John',
        lastName: 'Doe',
        rank: 'LT',
        division: 'Operations',
        mess: null,
      });
      expect(result[1]).toMatchObject({
        id: 'member-2',
        firstName: 'Jane',
        lastName: 'Smith',
        mess: 'Maple',
      });
      expect(result[0].checkedInAt).toBeDefined();
    });

    it('should return empty list when no members present', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repository.getPresentMembers();

      expect(result).toEqual([]);
    });

    it('should include timestamp as ISO string', async () => {
      const now = new Date();
      const isoString = now.toISOString();

      const presentMembersRows: Record<string, unknown>[] = [
        {
          id: 'member-1',
          first_name: 'John',
          last_name: 'Doe',
          rank: 'LT',
          division_name: 'Operations',
          mess: null,
          checked_in_at: now,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: presentMembersRows, rowCount: 1 });

      const result = await repository.getPresentMembers();

      expect(result[0].checkedInAt).toBe(isoString);
    });
  });

  describe('getMemberPresenceList', () => {
    it('should get member presence list with division and checkin details', async () => {
      const now = new Date();
      const presenceRows: Record<string, unknown>[] = [
        {
          id: 'member-1',
          service_number: 'SN001',
          first_name: 'John',
          last_name: 'Doe',
          rank: 'LT',
          division_id: 'div-1',
          member_type: 'reg_force',
          status: 'active',
          email: 'john@example.com',
          mobile_phone: '555-1234',
          badge_id: 'badge-1',
          member_created_at: now,
          member_updated_at: now,
          division_name: 'Operations',
          division_code: 'OPS',
          division_description: 'Ops division',
          division_created_at: now,
          division_updated_at: now,
          checkin_id: 'checkin-1',
          checkin_member_id: 'member-1',
          checkin_badge_id: 'badge-1',
          direction: 'in',
          timestamp: now,
          kiosk_id: 'kiosk-001',
          synced: true,
          checkin_created_at: now,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: presenceRows, rowCount: 1 });

      const result = await repository.getMemberPresenceList();

      expect(result).toHaveLength(1);
      const item = result[0];

      expect(item.member).toMatchObject({
        id: 'member-1',
        firstName: 'John',
        lastName: 'Doe',
        rank: 'LT',
        serviceNumber: 'SN001',
      });

      expect(item.member.division).toMatchObject({
        id: 'div-1',
        name: 'Operations',
        code: 'OPS',
      });

      expect(item.status).toBe('present');

      expect(item.lastCheckin).toMatchObject({
        id: 'checkin-1',
        memberId: 'member-1',
        direction: 'in',
      });
    });

    it('should mark member as absent when last checkin is out', async () => {
      const now = new Date();
      const presenceRows: Record<string, unknown>[] = [
        {
          id: 'member-1',
          service_number: 'SN001',
          first_name: 'John',
          last_name: 'Doe',
          rank: 'LT',
          division_id: 'div-1',
          member_type: 'reg_force',
          status: 'active',
          email: 'john@example.com',
          mobile_phone: '555-1234',
          badge_id: 'badge-1',
          member_created_at: now,
          member_updated_at: now,
          division_name: 'Operations',
          division_code: 'OPS',
          division_description: null,
          division_created_at: now,
          division_updated_at: now,
          checkin_id: 'checkin-1',
          checkin_member_id: 'member-1',
          checkin_badge_id: 'badge-1',
          direction: 'out',
          timestamp: now,
          kiosk_id: null,
          synced: true,
          checkin_created_at: now,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: presenceRows, rowCount: 1 });

      const result = await repository.getMemberPresenceList();

      expect(result[0].status).toBe('absent');
    });

    it('should handle member with no checkins', async () => {
      const now = new Date();
      const presenceRows: Record<string, unknown>[] = [
        {
          id: 'member-1',
          service_number: 'SN001',
          first_name: 'John',
          last_name: 'Doe',
          rank: 'LT',
          division_id: 'div-1',
          member_type: 'reg_force',
          status: 'active',
          email: 'john@example.com',
          mobile_phone: '555-1234',
          badge_id: 'badge-1',
          member_created_at: now,
          member_updated_at: now,
          division_name: 'Operations',
          division_code: 'OPS',
          division_description: null,
          division_created_at: now,
          division_updated_at: now,
          checkin_id: null,
          checkin_member_id: null,
          checkin_badge_id: null,
          direction: null,
          timestamp: null,
          kiosk_id: null,
          synced: null,
          checkin_created_at: null,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: presenceRows, rowCount: 1 });

      const result = await repository.getMemberPresenceList();

      expect(result[0].lastCheckin).toBeUndefined();
    });

    it('should return empty list when no members', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repository.getMemberPresenceList();

      expect(result).toEqual([]);
    });

    it('should handle multiple members with mixed presence', async () => {
      const now = new Date();
      const presenceRows: Record<string, unknown>[] = [
        {
          id: 'member-1',
          service_number: 'SN001',
          first_name: 'John',
          last_name: 'Doe',
          rank: 'LT',
          division_id: 'div-1',
          member_type: 'reg_force',
          status: 'active',
          email: 'john@example.com',
          mobile_phone: null,
          badge_id: 'badge-1',
          member_created_at: now,
          member_updated_at: now,
          division_name: 'Operations',
          division_code: 'OPS',
          division_description: 'Ops division',
          division_created_at: now,
          division_updated_at: now,
          checkin_id: 'checkin-1',
          checkin_member_id: 'member-1',
          checkin_badge_id: 'badge-1',
          direction: 'in',
          timestamp: now,
          kiosk_id: 'kiosk-001',
          synced: true,
          checkin_created_at: now,
        },
        {
          id: 'member-2',
          service_number: 'SN002',
          first_name: 'Jane',
          last_name: 'Smith',
          rank: 'PO1',
          division_id: 'div-2',
          member_type: 'class_a',
          status: 'active',
          email: 'jane@example.com',
          mobile_phone: '555-5678',
          badge_id: 'badge-2',
          member_created_at: now,
          member_updated_at: now,
          division_name: 'Admin',
          division_code: 'ADM',
          division_description: null,
          division_created_at: now,
          division_updated_at: now,
          checkin_id: 'checkin-2',
          checkin_member_id: 'member-2',
          checkin_badge_id: 'badge-2',
          direction: 'out',
          timestamp: now,
          kiosk_id: null,
          synced: true,
          checkin_created_at: now,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: presenceRows, rowCount: 2 });

      const result = await repository.getMemberPresenceList();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('present');
      expect(result[1].status).toBe('absent');
    });
  });

  describe('getRecentActivity', () => {
    it('should get recent activity with default limit', async () => {
      const now = new Date();
      const activityRows: Record<string, unknown>[] = [
        {
          type: 'checkin',
          id: 'checkin-1',
          timestamp: now,
          direction: 'in',
          name: 'John Doe',
          rank: 'LT',
          division: 'Operations',
          organization: null,
        },
        {
          type: 'visitor',
          id: 'visitor-1',
          timestamp: now,
          direction: 'in',
          name: 'John Smith',
          rank: null,
          division: null,
          organization: 'External Co',
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: activityRows, rowCount: 2 });

      const result = await repository.getRecentActivity();

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('checkin');
      expect(result[0].id).toBe('checkin-1');
      expect(result[0].direction).toBe('in');
      expect(result[0].name).toBe('John Doe');
      expect(result[0].rank).toBe('LT');
      expect(result[0].division).toBe('Operations');
      expect(result[0].organization).toBeNull();
      expect(result[0].timestamp).toBeDefined();

      expect(result[1]).toMatchObject({
        type: 'visitor',
        name: 'John Smith',
        organization: 'External Co',
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UNION ALL'),
        [10]
      );
    });

    it('should get recent activity with custom limit', async () => {
      const now = new Date();
      const activityRows: Record<string, unknown>[] = [
        {
          type: 'checkin',
          id: 'checkin-1',
          timestamp: now,
          direction: 'in',
          name: 'John Doe',
          rank: 'LT',
          division: 'Operations',
          organization: null,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: activityRows, rowCount: 1 });

      const result = await repository.getRecentActivity(5);

      expect(result).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UNION ALL'),
        [5]
      );
    });

    it('should include timestamp as ISO string', async () => {
      const now = new Date();
      const isoString = now.toISOString();

      const activityRows: Record<string, unknown>[] = [
        {
          type: 'checkin',
          id: 'checkin-1',
          timestamp: now,
          direction: 'in',
          name: 'John Doe',
          rank: 'LT',
          division: 'Operations',
          organization: null,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: activityRows, rowCount: 1 });

      const result = await repository.getRecentActivity();

      expect(result[0].timestamp).toBe(isoString);
    });

    it('should return empty list when no activity', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repository.getRecentActivity();

      expect(result).toEqual([]);
    });

    it('should handle checkin without rank and division', async () => {
      const now = new Date();
      const activityRows: Record<string, unknown>[] = [
        {
          type: 'checkin',
          id: 'checkin-1',
          timestamp: now,
          direction: 'out',
          name: 'John Doe',
          rank: null,
          division: null,
          organization: null,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: activityRows, rowCount: 1 });

      const result = await repository.getRecentActivity();

      expect(result[0]).toMatchObject({
        type: 'checkin',
        name: 'John Doe',
        direction: 'out',
      });
      // null values in DB are preserved as null by the repository
      expect(result[0].rank).toBeNull();
      expect(result[0].division).toBeNull();
    });
  });

  describe('duplicate prevention and cache invalidation', () => {
    it('should invalidate presence cache on checkin creation', async () => {
      const now = new Date();
      const createInput: CreateCheckinInput = {
        memberId: 'member-123',
        badgeId: 'badge-456',
        direction: 'in',
        timestamp: now,
      };

      const expectedCheckin: Record<string, unknown> = {
        id: 'checkin-789',
        member_id: 'member-123',
        badge_id: 'badge-456',
        direction: 'in',
        timestamp: now,
        kiosk_id: null,
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [expectedCheckin], rowCount: 1 });
      (redis.del as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);

      await repository.create(createInput);

      expect(redis.del).toHaveBeenCalledWith('presence:stats');
    });

    it('should cache presence stats with TTL of 60 seconds', async () => {
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const statsRow: Record<string, unknown> = {
        total_members: 50,
        present: 35,
        absent: 15,
        on_leave: 0,
        late_arrivals: 3,
        visitors: 2,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [statsRow], rowCount: 1 });
      (redis.setex as ReturnType<typeof vi.fn>).mockResolvedValueOnce('OK');

      const result = await repository.getPresenceStats();

      const callArgs = (redis.setex as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[0]).toBe('presence:stats');
      expect(callArgs[1]).toBe(60);
      expect(JSON.parse(callArgs[2] as string)).toEqual(result);
    });
  });

  describe('type safety and error handling', () => {
    it('should maintain proper typing for Checkin objects', async () => {
      const now = new Date();
      const checkinRow: Record<string, unknown> = {
        id: 'checkin-123',
        member_id: 'member-456',
        badge_id: 'badge-789',
        direction: 'in',
        timestamp: now,
        kiosk_id: 'kiosk-001',
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [checkinRow], rowCount: 1 });

      const result = await repository.findById('checkin-123');

      expect(result).not.toBeNull();
      if (result) {
        expect(typeof result.id).toBe('string');
        expect(typeof result.memberId).toBe('string');
        expect(typeof result.direction).toBe('string');
        expect(result.timestamp instanceof Date).toBe(true);
        expect(typeof result.synced).toBe('boolean');
      }
    });

    it('should properly handle database client lifecycle', async () => {
      const now = new Date();
      const checkinRow: Record<string, unknown> = {
        id: 'checkin-123',
        member_id: 'member-456',
        badge_id: 'badge-789',
        direction: 'in',
        timestamp: now,
        kiosk_id: null,
        synced: true,
        created_at: now,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [checkinRow], rowCount: 1 });

      await repository.findLatestByMember('member-456');

      expect(pool.connect).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even on query error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      try {
        await repository.findLatestByMember('member-456');
      } catch {
        // Expected error
      }

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('edge cases and data transformation', () => {
    it('should handle members with no phone number', async () => {
      const now = new Date();
      const presentMembersRows: Record<string, unknown>[] = [
        {
          id: 'member-1',
          first_name: 'John',
          last_name: 'Doe',
          rank: 'LT',
          division_name: 'Operations',
          mess: null,
          checked_in_at: now,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: presentMembersRows, rowCount: 1 });

      const result = await repository.getPresentMembers();

      expect(result[0].mess).toBeNull();
    });

    it('should convert snake_case to camelCase correctly', async () => {
      const now = new Date();
      const checkinRow: Record<string, unknown> = {
        id: 'checkin-123',
        member_id: 'member-456',
        badge_id: 'badge-789',
        kiosk_id: 'kiosk-001',
        created_at: now,
        direction: 'in',
        timestamp: now,
        synced: true,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [checkinRow], rowCount: 1 });

      const result = await repository.findById('checkin-123');

      expect(result).toHaveProperty('memberId');
      expect(result).toHaveProperty('badgeId');
      expect(result).toHaveProperty('kioskId');
      expect(result).toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('member_id');
      expect(result).not.toHaveProperty('badge_id');
    });

    it('should handle large presence lists', async () => {
      const now = new Date();
      const presenceRows: Record<string, unknown>[] = [];

      for (let i = 0; i < 100; i++) {
        presenceRows.push({
          id: `member-${i}`,
          service_number: `SN${String(i).padStart(3, '0')}`,
          first_name: `Member`,
          last_name: `${i}`,
          rank: 'LT',
          division_id: 'div-1',
          member_type: 'reg_force',
          status: 'active',
          email: `member${i}@example.com`,
          mobile_phone: null,
          badge_id: `badge-${i}`,
          member_created_at: now,
          member_updated_at: now,
          division_name: 'Operations',
          division_code: 'OPS',
          division_description: null,
          division_created_at: now,
          division_updated_at: now,
          checkin_id: `checkin-${i}`,
          checkin_member_id: `member-${i}`,
          checkin_badge_id: `badge-${i}`,
          direction: i % 2 === 0 ? 'in' : 'out',
          timestamp: now,
          kiosk_id: null,
          synced: true,
          checkin_created_at: now,
        });
      }

      mockClient.query.mockResolvedValueOnce({ rows: presenceRows, rowCount: 100 });

      const result = await repository.getMemberPresenceList();

      expect(result).toHaveLength(100);
      expect(result[0].status).toBe('present');
      expect(result[1].status).toBe('absent');
    });
  });
});
