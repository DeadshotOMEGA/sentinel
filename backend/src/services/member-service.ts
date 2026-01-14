import { memberRepository } from '../db/repositories/member-repository';
import { badgeRepository } from '../db/repositories/badge-repository';
import { checkinRepository } from '../db/repositories/checkin-repository';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import type {
  Member,
  MemberWithDivision,
  CreateMemberInput,
  UpdateMemberInput,
  PaginationParams,
  PaginatedResponse,
  Checkin,
  MemberType,
  MemberStatus,
} from '../../../shared/types';

export interface MemberFilters {
  divisionId?: string;
  memberType?: MemberType;
  status?: MemberStatus;
  search?: string;
}

export interface PresenceStatusResult {
  isPresent: boolean;
  lastCheckin?: Checkin;
}

/**
 * Service for member lifecycle management
 * Handles creation, updates, deactivation, and badge assignment
 */
export class MemberService {
  /**
   * Find member by ID with division
   */
  async findById(id: string): Promise<MemberWithDivision | null> {
    if (!id || id.trim() === '') {
      throw new ValidationError(
        'Invalid member ID',
        'Member ID cannot be empty',
        'Please provide a valid member ID.'
      );
    }

    return memberRepository.findById(id);
  }

  /**
   * Find member by service number
   */
  async findByServiceNumber(serviceNumber: string): Promise<Member | null> {
    if (!serviceNumber || serviceNumber.trim() === '') {
      throw new ValidationError(
        'Invalid service number',
        'Service number cannot be empty',
        'Please provide a valid service number.'
      );
    }

    return memberRepository.findByServiceNumber(serviceNumber);
  }

  /**
   * Find all members with optional filters
   */
  async findAll(filters?: MemberFilters): Promise<MemberWithDivision[]> {
    return memberRepository.findAll(filters);
  }

  /**
   * Find paginated members with optional filters
   */
  async findPaginated(
    params: PaginationParams & { filters?: MemberFilters }
  ): Promise<PaginatedResponse<MemberWithDivision>> {
    // Validate pagination parameters
    if (!params.page || params.page < 1) {
      throw new ValidationError(
        'Invalid pagination parameters',
        'Page must be >= 1',
        'Please check pagination parameters.'
      );
    }

    if (!params.limit || params.limit < 1 || params.limit > 100) {
      throw new ValidationError(
        'Invalid pagination parameters',
        'Limit must be between 1 and 100',
        'Please check pagination parameters.'
      );
    }

    const { members, total } = await memberRepository.findPaginated(
      {
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      },
      params.filters
    );

    const totalPages = Math.ceil(total / params.limit);

    return {
      data: members,
      pagination: {
        page: params.page,
        limit: params.limit,
        totalItems: total,
        totalPages,
        hasNextPage: params.page < totalPages,
        hasPrevPage: params.page > 1,
      },
    };
  }

  /**
   * Create a new member
   */
  async create(data: CreateMemberInput): Promise<Member> {
    // Validate required fields
    if (!data.serviceNumber || data.serviceNumber.trim() === '') {
      throw new ValidationError(
        'Invalid member data',
        'Service number is required',
        'Please provide a service number.'
      );
    }

    if (!data.firstName || data.firstName.trim() === '') {
      throw new ValidationError(
        'Invalid member data',
        'First name is required',
        'Please provide a first name.'
      );
    }

    if (!data.lastName || data.lastName.trim() === '') {
      throw new ValidationError(
        'Invalid member data',
        'Last name is required',
        'Please provide a last name.'
      );
    }

    if (!data.rank || data.rank.trim() === '') {
      throw new ValidationError(
        'Invalid member data',
        'Rank is required',
        'Please provide a rank.'
      );
    }

    if (!data.divisionId || data.divisionId.trim() === '') {
      throw new ValidationError(
        'Invalid member data',
        'Division is required',
        'Please select a division.'
      );
    }

    // Check if service number already exists
    const existing = await memberRepository.findByServiceNumber(data.serviceNumber);
    if (existing) {
      throw new ConflictError(
        'Service number already exists',
        `Service number ${data.serviceNumber} is already in use`,
        'Service numbers must be unique. Please use a different service number.'
      );
    }

    // If badgeId is provided, validate badge exists and is unassigned
    if (data.badgeId) {
      const badge = await badgeRepository.findById(data.badgeId);
      if (!badge) {
        throw new NotFoundError(
          'Badge not found',
          `Badge ${data.badgeId} does not exist`,
          'Please select a valid badge.'
        );
      }

      if (badge.assignmentType !== 'unassigned') {
        throw new ConflictError(
          'Badge already assigned',
          `Badge ${badge.serialNumber} is already assigned`,
          'Please select an unassigned badge.'
        );
      }
    }

    // Create member
    const member = await memberRepository.create(data);

    // If badge was assigned, update badge assignment
    if (data.badgeId) {
      await badgeRepository.assign(data.badgeId, member.id, 'member');
    }

    return member;
  }

  /**
   * Update an existing member
   */
  async update(id: string, data: UpdateMemberInput): Promise<Member> {
    // Validate ID
    if (!id || id.trim() === '') {
      throw new ValidationError(
        'Invalid member ID',
        'Member ID cannot be empty',
        'Please provide a valid member ID.'
      );
    }

    // Check if member exists
    const existing = await memberRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Member not found',
        `Member ${id} not found`,
        'Please check the member ID and try again.'
      );
    }

    // If updating service number, check for conflicts
    if (data.serviceNumber && data.serviceNumber !== existing.serviceNumber) {
      const conflict = await memberRepository.findByServiceNumber(data.serviceNumber);
      if (conflict) {
        throw new ConflictError(
          'Service number already exists',
          `Service number ${data.serviceNumber} is already in use`,
          'Service numbers must be unique. Please use a different service number.'
        );
      }
    }

    // If updating badgeId, validate badge exists and is unassigned
    if (data.badgeId !== undefined && data.badgeId !== existing.badgeId) {
      if (data.badgeId) {
        const badge = await badgeRepository.findById(data.badgeId);
        if (!badge) {
          throw new NotFoundError(
            'Badge not found',
            `Badge ${data.badgeId} does not exist`,
            'Please select a valid badge.'
          );
        }

        if (badge.assignmentType !== 'unassigned') {
          throw new ConflictError(
            'Badge already assigned',
            `Badge ${badge.serialNumber} is already assigned`,
            'Please select an unassigned badge.'
          );
        }
      }

      // Unassign old badge if exists
      if (existing.badgeId) {
        await badgeRepository.unassign(existing.badgeId);
      }

      // Assign new badge if provided
      if (data.badgeId) {
        await badgeRepository.assign(data.badgeId, id, 'member');
      }
    }

    // Update member
    return memberRepository.update(id, data);
  }

  /**
   * Deactivate a member (soft delete - set status to inactive)
   */
  async deactivate(id: string): Promise<void> {
    // Validate ID
    if (!id || id.trim() === '') {
      throw new ValidationError(
        'Invalid member ID',
        'Member ID cannot be empty',
        'Please provide a valid member ID.'
      );
    }

    // Check if member exists
    const existing = await memberRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Member not found',
        `Member ${id} not found`,
        'Please check the member ID and try again.'
      );
    }

    // Deactivate member (sets status to inactive)
    await memberRepository.delete(id);

    // Unassign badge if exists
    if (existing.badgeId) {
      await badgeRepository.unassign(existing.badgeId);
    }
  }

  /**
   * Get member's current presence status
   */
  async getPresenceStatus(id: string): Promise<PresenceStatusResult> {
    // Validate ID
    if (!id || id.trim() === '') {
      throw new ValidationError(
        'Invalid member ID',
        'Member ID cannot be empty',
        'Please provide a valid member ID.'
      );
    }

    // Check if member exists
    const member = await memberRepository.findById(id);
    if (!member) {
      throw new NotFoundError(
        'Member not found',
        `Member ${id} not found`,
        'Please check the member ID and try again.'
      );
    }

    // Get latest checkin
    const lastCheckin = await checkinRepository.findLatestByMember(id);

    // Determine presence based on last checkin direction
    const isPresent = lastCheckin?.direction === 'in';

    return {
      isPresent,
      lastCheckin: lastCheckin ?? undefined,
    };
  }

  /**
   * Assign a badge to a member
   */
  async assignBadge(memberId: string, badgeId: string): Promise<void> {
    // Validate IDs
    if (!memberId || memberId.trim() === '') {
      throw new ValidationError(
        'Invalid member ID',
        'Member ID cannot be empty',
        'Please provide a valid member ID.'
      );
    }

    if (!badgeId || badgeId.trim() === '') {
      throw new ValidationError(
        'Invalid badge ID',
        'Badge ID cannot be empty',
        'Please provide a valid badge ID.'
      );
    }

    // Check if member exists
    const member = await memberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundError(
        'Member not found',
        `Member ${memberId} not found`,
        'Please check the member ID and try again.'
      );
    }

    // Check if badge exists
    const badge = await badgeRepository.findById(badgeId);
    if (!badge) {
      throw new NotFoundError(
        'Badge not found',
        `Badge ${badgeId} not found`,
        'Please check the badge ID and try again.'
      );
    }

    // Validate badge is unassigned
    if (badge.assignmentType !== 'unassigned') {
      throw new ConflictError(
        'Badge already assigned',
        `Badge ${badge.serialNumber} is already assigned`,
        'Please select an unassigned badge.'
      );
    }

    // Unassign member's current badge if exists
    if (member.badgeId) {
      await badgeRepository.unassign(member.badgeId);
    }

    // Assign new badge to member
    await badgeRepository.assign(badgeId, memberId, 'member');

    // Update member record
    await memberRepository.update(memberId, { badgeId });
  }

  /**
   * Unassign badge from a member
   */
  async unassignBadge(memberId: string): Promise<void> {
    // Validate ID
    if (!memberId || memberId.trim() === '') {
      throw new ValidationError(
        'Invalid member ID',
        'Member ID cannot be empty',
        'Please provide a valid member ID.'
      );
    }

    // Check if member exists
    const member = await memberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundError(
        'Member not found',
        `Member ${memberId} not found`,
        'Please check the member ID and try again.'
      );
    }

    // Check if member has a badge
    if (!member.badgeId) {
      throw new ValidationError(
        'No badge assigned',
        `Member ${member.firstName} ${member.lastName} does not have a badge assigned`,
        'This member does not have a badge to unassign.'
      );
    }

    // Unassign badge
    await badgeRepository.unassign(member.badgeId);

    // Update member record
    await memberRepository.update(memberId, { badgeId: null });
  }
}

export const memberService = new MemberService();
