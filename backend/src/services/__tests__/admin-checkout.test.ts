import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkinService } from '../checkin-service';
import { memberRepository } from '../../db/repositories/member-repository';
import { checkinRepository } from '../../db/repositories/checkin-repository';
import { presenceService } from '../presence-service';
import { NotFoundError, ValidationError } from '../../utils/errors';
import type { MemberWithDivision, Checkin } from '../../../../shared/types';

// Mock the repositories and services
vi.mock('../../db/repositories/member-repository');
vi.mock('../../db/repositories/checkin-repository');
vi.mock('../presence-service');
vi.mock('../../websocket/broadcast', () => ({
  broadcastPresenceUpdate: vi.fn(),
}));

describe('CheckinService.adminCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully checkout a checked-in member', async () => {
    const mockMember: MemberWithDivision = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      serviceNumber: 'SVC001',
      firstName: 'John',
      lastName: 'Doe',
      rank: 'AB',
      divisionId: 'div-001',
      memberType: 'class_a',
      status: 'active',
      badgeId: 'badge-001',
      createdAt: new Date(),
      updatedAt: new Date(),
      division: {
        id: 'div-001',
        name: 'Operations',
        code: 'OPS',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const mockCheckin: Checkin = {
      id: 'checkin-001',
      memberId: mockMember.id,
      badgeId: 'badge-001',
      direction: 'out',
      timestamp: new Date(),
      kioskId: 'admin-forced-checkout',
      synced: true,
      method: 'badge',
      createdAt: new Date(),
    };

    vi.mocked(memberRepository.findById).mockResolvedValue(mockMember);
    vi.mocked(presenceService.getMemberDirection).mockResolvedValue('in');
    vi.mocked(checkinRepository.create).mockResolvedValue(mockCheckin);
    vi.mocked(presenceService.setMemberDirection).mockResolvedValue(undefined);
    vi.mocked(checkinRepository.getPresenceStats).mockResolvedValue({
      totalMembers: 100,
      present: 49,
      absent: 50,
      onLeave: 1,
      lateArrivals: 5,
      visitors: 2,
    });

    const result = await checkinService.adminCheckout(mockMember.id);

    expect(result.checkin).toEqual(mockCheckin);
    expect(result.member).toEqual(mockMember);
    expect(result.direction).toBe('out');

    expect(memberRepository.findById).toHaveBeenCalledWith(mockMember.id);
    expect(presenceService.getMemberDirection).toHaveBeenCalledWith(mockMember.id);
    expect(checkinRepository.create).toHaveBeenCalledWith({
      memberId: mockMember.id,
      badgeId: 'badge-001',
      direction: 'out',
      timestamp: expect.any(Date),
      kioskId: 'admin-forced-checkout',
      synced: true,
    });
    expect(presenceService.setMemberDirection).toHaveBeenCalledWith(mockMember.id, 'out');
  });

  it('should throw NotFoundError when member does not exist', async () => {
    vi.mocked(memberRepository.findById).mockResolvedValue(null);

    await expect(
      checkinService.adminCheckout('nonexistent-id')
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw ValidationError when member has no badge', async () => {
    const mockMember: MemberWithDivision = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      serviceNumber: 'SVC001',
      firstName: 'John',
      lastName: 'Doe',
      rank: 'AB',
      divisionId: 'div-001',
      memberType: 'class_a',
      status: 'active',
      badgeId: undefined, // No badge
      createdAt: new Date(),
      updatedAt: new Date(),
      division: {
        id: 'div-001',
        name: 'Operations',
        code: 'OPS',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(memberRepository.findById).mockResolvedValue(mockMember);

    const error = await checkinService.adminCheckout(mockMember.id).catch(e => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details).toMatch(/does not have a badge assigned/);
  });

  it('should throw ValidationError when member is not checked in', async () => {
    const mockMember: MemberWithDivision = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      serviceNumber: 'SVC001',
      firstName: 'John',
      lastName: 'Doe',
      rank: 'AB',
      divisionId: 'div-001',
      memberType: 'class_a',
      status: 'active',
      badgeId: 'badge-001',
      createdAt: new Date(),
      updatedAt: new Date(),
      division: {
        id: 'div-001',
        name: 'Operations',
        code: 'OPS',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const mockLastCheckin: Checkin = {
      id: 'checkin-001',
      memberId: mockMember.id,
      badgeId: 'badge-001',
      direction: 'out',
      timestamp: new Date(),
      kioskId: 'kiosk-001',
      synced: true,
      method: 'badge',
      createdAt: new Date(),
    };

    vi.mocked(memberRepository.findById).mockResolvedValue(mockMember);
    vi.mocked(presenceService.getMemberDirection).mockResolvedValue('out');
    vi.mocked(checkinRepository.findLatestByMember).mockResolvedValue(mockLastCheckin);

    const error = await checkinService.adminCheckout(mockMember.id).catch(e => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details).toMatch(/not currently checked in/);
  });
});
