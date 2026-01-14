import { badgeRepository } from '../db/repositories/badge-repository';
import { memberRepository } from '../db/repositories/member-repository';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import type {
  Badge,
  CreateBadgeInput,
  BadgeStatus,
  BadgeAssignmentType,
  MemberWithDivision,
} from '../../../shared/types';

interface BadgeFilters {
  status?: BadgeStatus;
  assignmentType?: BadgeAssignmentType;
}

interface BadgeValidationResult {
  badge: Badge;
  member: MemberWithDivision;
}

export class BadgeService {
  /**
   * Find badge by ID
   */
  async findById(id: string): Promise<Badge | null> {
    return badgeRepository.findById(id);
  }

  /**
   * Find badge by serial number
   */
  async findBySerialNumber(serialNumber: string): Promise<Badge | null> {
    return badgeRepository.findBySerialNumber(serialNumber);
  }

  /**
   * Find all badges with optional filters
   */
  async findAll(filters?: BadgeFilters): Promise<Badge[]> {
    return badgeRepository.findAll(filters);
  }

  /**
   * Find badge by serial number with assigned member details
   */
  async findWithMember(serialNumber: string): Promise<{ badge: Badge; member: MemberWithDivision | null } | null> {
    return badgeRepository.findBySerialNumberWithMember(serialNumber);
  }

  /**
   * Create a new badge
   */
  async create(data: CreateBadgeInput): Promise<Badge> {
    // Validate serial number is provided
    if (!data.serialNumber) {
      throw new ValidationError(
        'Serial number required',
        'Badge serial number is required',
        'Please provide a valid badge serial number.'
      );
    }

    // Check if serial number already exists
    const existing = await badgeRepository.findBySerialNumber(data.serialNumber);
    if (existing) {
      throw new ConflictError(
        'Badge serial number already exists',
        `Badge with serial number ${data.serialNumber} already exists`,
        'Badge serial numbers must be unique. This badge may already be registered.'
      );
    }

    // Create badge with explicit defaults
    const badge = await badgeRepository.create({
      serialNumber: data.serialNumber,
      status: data.status !== undefined ? data.status : 'active',
      assignmentType: 'unassigned',
      assignedToId: undefined,
    });

    return badge;
  }

  /**
   * Assign badge to member
   */
  async assign(badgeId: string, memberId: string): Promise<Badge> {
    // Verify badge exists
    const badge = await badgeRepository.findById(badgeId);
    if (!badge) {
      throw new NotFoundError(
        'Badge not found',
        `Badge ${badgeId} does not exist`,
        'Please check the badge ID and try again.'
      );
    }

    // Check if badge is already assigned
    if (badge.assignmentType !== 'unassigned' && badge.assignedToId) {
      throw new ConflictError(
        'Badge already assigned',
        `Badge ${badgeId} is already assigned to ${badge.assignedToId}`,
        'This badge is already assigned. Please unassign it first before reassigning.'
      );
    }

    // Verify member exists
    const member = await memberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundError(
        'Member not found',
        `Member ${memberId} does not exist`,
        'Please check the member ID and try again.'
      );
    }

    // Check if member already has a badge assigned
    if (member.badgeId) {
      throw new ConflictError(
        'Member already has a badge',
        `Member ${memberId} already has badge ${member.badgeId} assigned`,
        'This member already has a badge. Please unassign the existing badge first.'
      );
    }

    // Assign badge to member
    const updatedBadge = await badgeRepository.assign(badgeId, memberId, 'member');

    // Update member record with badge ID
    await memberRepository.update(memberId, { badgeId });

    return updatedBadge;
  }

  /**
   * Unassign badge
   */
  async unassign(badgeId: string): Promise<Badge> {
    // Verify badge exists
    const badge = await badgeRepository.findById(badgeId);
    if (!badge) {
      throw new NotFoundError(
        'Badge not found',
        `Badge ${badgeId} does not exist`,
        'Please check the badge ID and try again.'
      );
    }

    // Clean up any member that has this badge assigned (handles orphaned references)
    // First try badge.assignedToId, then search by badgeId directly
    if (badge.assignedToId) {
      const member = await memberRepository.findById(badge.assignedToId);
      if (member && member.badgeId === badgeId) {
        await memberRepository.update(badge.assignedToId, { badgeId: null });
      }
    }

    // Also clear any orphaned member references (badge unassigned but member still has badgeId)
    await memberRepository.clearBadgeReference(badgeId);

    // If badge is already unassigned, just return it (cleanup above still runs)
    if (badge.assignmentType === 'unassigned') {
      return badge;
    }

    // Unassign badge
    const updatedBadge = await badgeRepository.unassign(badgeId);

    return updatedBadge;
  }

  /**
   * Update badge status
   * Auto-unassigns badge when marked as 'lost'
   */
  async updateStatus(badgeId: string, status: BadgeStatus): Promise<Badge> {
    // Verify badge exists
    const badge = await badgeRepository.findById(badgeId);
    if (!badge) {
      throw new NotFoundError(
        'Badge not found',
        `Badge ${badgeId} does not exist`,
        'Please check the badge ID and try again.'
      );
    }

    // Auto-unassign when marking as 'lost'
    if (status === 'lost' && badge.assignmentType !== 'unassigned') {
      await this.unassign(badgeId);
    }

    // Update status
    const updatedBadge = await badgeRepository.updateStatus(badgeId, status);

    return updatedBadge;
  }

  /**
   * Validate badge for check-in
   * Returns badge and member if valid, throws specific errors otherwise
   */
  async validateForCheckin(serialNumber: string): Promise<BadgeValidationResult> {
    // Find badge by serial number with member data
    const result = await badgeRepository.findBySerialNumberWithMember(serialNumber);

    if (!result) {
      throw new NotFoundError(
        'Badge not found',
        `Badge with serial number ${serialNumber} does not exist`,
        'This badge is not registered in the system. Please contact an administrator.'
      );
    }

    const { badge, member } = result;

    // Check if badge is assigned
    if (badge.assignmentType !== 'member' || !badge.assignedToId) {
      throw new ValidationError(
        'Badge not assigned',
        `Badge ${serialNumber} is not assigned to a member`,
        'This badge is not assigned to a member. Please see an administrator.'
      );
    }

    // Check badge status
    if (badge.status === 'lost') {
      throw new ValidationError(
        'Badge reported lost',
        `Badge ${serialNumber} has been reported lost`,
        'This badge has been reported lost. Please see an administrator for a replacement.'
      );
    }

    if (badge.status === 'disabled') {
      throw new ValidationError(
        'Badge disabled',
        `Badge ${serialNumber} has been disabled`,
        'This badge has been disabled. Please see an administrator.'
      );
    }

    if (badge.status === 'returned') {
      throw new ValidationError(
        'Badge returned',
        `Badge ${serialNumber} has been returned`,
        'This badge has been returned to inventory. Please see an administrator.'
      );
    }

    if (badge.status !== 'active') {
      throw new ValidationError(
        'Badge not active',
        `Badge ${serialNumber} status is ${badge.status}`,
        'This badge is not currently active. Please see an administrator.'
      );
    }

    // Verify member data exists (should always be present if badge is assigned to member)
    if (!member) {
      throw new NotFoundError(
        'Member not found',
        `Member ${badge.assignedToId} assigned to badge ${serialNumber} does not exist`,
        'The member assigned to this badge was not found. Please see an administrator.'
      );
    }

    // Check member status
    if (member.status !== 'active') {
      throw new ValidationError(
        'Member not active',
        `Member ${member.firstName} ${member.lastName} status is ${member.status}`,
        `This member's status is ${member.status}. Please see an administrator.`
      );
    }

    // Return validated badge and member
    return {
      badge,
      member,
    };
  }
}

export const badgeService = new BadgeService();
