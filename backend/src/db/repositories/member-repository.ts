import type {
  Member,
  MemberWithDivision,
  CreateMemberInput,
  UpdateMemberInput,
  MemberType,
  MemberStatus,
  PaginationParams,
} from '../../../../shared/types';
import type { Member as PrismaMember } from '@prisma/client';
import { prisma } from '../prisma';
import { redis } from '../redis';

interface MemberFilters {
  divisionId?: string;
  memberType?: MemberType;
  status?: MemberStatus;
  search?: string;
}

/**
 * Convert Prisma Member (with null) to shared Member type (with undefined)
 */
function toMember(prismaMember: PrismaMember): Member {
  if (!prismaMember.divisionId) {
    throw new Error('Member must have a divisionId');
  }

  return {
    id: prismaMember.id,
    serviceNumber: prismaMember.serviceNumber,
    employeeNumber: prismaMember.employeeNumber ?? undefined,
    firstName: prismaMember.firstName,
    lastName: prismaMember.lastName,
    initials: prismaMember.initials ?? undefined,
    rank: prismaMember.rank,
    divisionId: prismaMember.divisionId,
    mess: prismaMember.mess ?? undefined,
    moc: prismaMember.moc ?? undefined,
    memberType: prismaMember.memberType as MemberType,
    classDetails: prismaMember.classDetails ?? undefined,
    status: prismaMember.status as MemberStatus,
    email: prismaMember.email ?? undefined,
    homePhone: prismaMember.homePhone ?? undefined,
    mobilePhone: prismaMember.mobilePhone ?? undefined,
    badgeId: prismaMember.badgeId ?? undefined,
    createdAt: prismaMember.createdAt ?? new Date(),
    updatedAt: prismaMember.updatedAt ?? new Date(),
  };
}

/**
 * Convert Prisma Member with Division to MemberWithDivision type
 */
function toMemberWithDivision(
  prismaMember: PrismaMember & {
    division: {
      id: string;
      name: string;
      code: string;
      description: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    } | null
  }
): MemberWithDivision {
  if (!prismaMember.division) {
    throw new Error('Member must have a division loaded');
  }

  return {
    ...toMember(prismaMember),
    division: {
      id: prismaMember.division.id,
      name: prismaMember.division.name,
      code: prismaMember.division.code,
      description: prismaMember.division.description ?? undefined,
      createdAt: prismaMember.division.createdAt ?? new Date(),
      updatedAt: prismaMember.division.updatedAt ?? new Date(),
    },
  };
}

export class MemberRepository {
  /**
   * Find all members with optional filters
   */
  async findAll(filters?: MemberFilters): Promise<MemberWithDivision[]> {
    const where: Record<string, unknown> = {};

    if (filters?.divisionId) {
      where.divisionId = filters.divisionId;
    }

    if (filters?.memberType) {
      where.memberType = filters.memberType;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { serviceNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const members = await prisma.member.findMany({
      where,
      include: {
        division: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return members.map(toMemberWithDivision);
  }

  /**
   * Find paginated members with optional filters
   */
  async findPaginated(
    params: PaginationParams,
    filters?: MemberFilters
  ): Promise<{ members: MemberWithDivision[]; total: number }> {
    if (!params.page || params.page < 1) {
      throw new Error('Invalid page number: must be >= 1');
    }
    if (!params.limit || params.limit < 1 || params.limit > 100) {
      throw new Error('Invalid limit: must be between 1 and 100');
    }

    const page = params.page;
    const limit = params.limit;
    const sortOrder = params.sortOrder ? params.sortOrder : 'asc';

    // Validate and sanitize sortBy column (allowlist)
    const allowedSortColumns: Record<string, 'lastName' | 'rank' | 'status' | 'firstName' | 'serviceNumber'> = {
      lastName: 'lastName',
      rank: 'rank',
      status: 'status',
      firstName: 'firstName',
      serviceNumber: 'serviceNumber',
    };
    const sortByColumn = params.sortBy && allowedSortColumns[params.sortBy]
      ? allowedSortColumns[params.sortBy]
      : 'lastName';

    const skip = (page - 1) * limit;

    // Build where conditions
    const where: Record<string, unknown> = {};

    if (filters?.divisionId) {
      where.divisionId = filters.divisionId;
    }

    if (filters?.memberType) {
      where.memberType = filters.memberType;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { serviceNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Execute count and data queries in parallel
    const [total, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        include: {
          division: true,
        },
        orderBy: [
          { [sortByColumn]: sortOrder },
          { firstName: sortOrder },
        ],
        skip,
        take: limit,
      }),
    ]);

    return {
      members: members.map(toMemberWithDivision),
      total,
    };
  }

  /**
   * Find member by ID
   */
  async findById(id: string): Promise<MemberWithDivision | null> {
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        division: true,
      },
    });

    return member ? toMemberWithDivision(member) : null;
  }

  /**
   * Find member by service number
   */
  async findByServiceNumber(serviceNumber: string): Promise<Member | null> {
    const member = await prisma.member.findUnique({
      where: { serviceNumber },
    });

    return member ? toMember(member) : null;
  }

  /**
   * Create a new member
   */
  async create(data: CreateMemberInput): Promise<Member> {
    const member = await prisma.member.create({
      data: {
        serviceNumber: data.serviceNumber,
        employeeNumber: data.employeeNumber !== undefined ? data.employeeNumber : null,
        firstName: data.firstName,
        lastName: data.lastName,
        initials: data.initials !== undefined ? data.initials : null,
        rank: data.rank,
        divisionId: data.divisionId,
        mess: data.mess !== undefined ? data.mess : null,
        moc: data.moc !== undefined ? data.moc : null,
        memberType: data.memberType,
        classDetails: data.classDetails !== undefined ? data.classDetails : null,
        status: data.status !== undefined ? data.status : 'active',
        email: data.email !== undefined ? data.email : null,
        homePhone: data.homePhone !== undefined ? data.homePhone : null,
        mobilePhone: data.mobilePhone !== undefined ? data.mobilePhone : null,
        badgeId: data.badgeId !== undefined ? data.badgeId : null,
      },
    });

    await this.invalidatePresenceCache();
    return toMember(member);
  }

  /**
   * Update a member
   */
  async update(id: string, data: UpdateMemberInput): Promise<Member> {
    const updateData: Record<string, unknown> = {};

    if (data.serviceNumber !== undefined) {
      updateData.serviceNumber = data.serviceNumber;
    }
    if (data.employeeNumber !== undefined) {
      updateData.employeeNumber = data.employeeNumber;
    }
    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName;
    }
    if (data.initials !== undefined) {
      updateData.initials = data.initials;
    }
    if (data.rank !== undefined) {
      updateData.rank = data.rank;
    }
    if (data.divisionId !== undefined) {
      updateData.divisionId = data.divisionId;
    }
    if (data.mess !== undefined) {
      updateData.mess = data.mess;
    }
    if (data.moc !== undefined) {
      updateData.moc = data.moc;
    }
    if (data.memberType !== undefined) {
      updateData.memberType = data.memberType;
    }
    if (data.classDetails !== undefined) {
      updateData.classDetails = data.classDetails;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.email !== undefined) {
      updateData.email = data.email;
    }
    if (data.homePhone !== undefined) {
      updateData.homePhone = data.homePhone;
    }
    if (data.mobilePhone !== undefined) {
      updateData.mobilePhone = data.mobilePhone;
    }
    if (data.badgeId !== undefined) {
      updateData.badgeId = data.badgeId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    // updatedAt is automatically set by Prisma
    const member = await prisma.member.update({
      where: { id },
      data: updateData,
    });

    await this.invalidatePresenceCache();
    return toMember(member);
  }

  /**
   * Delete (soft delete) a member
   */
  async delete(id: string): Promise<void> {
    const result = await prisma.member.updateMany({
      where: { id },
      data: {
        status: 'inactive',
      },
    });

    if (result.count === 0) {
      throw new Error(`Member not found: ${id}`);
    }

    await this.invalidatePresenceCache();
  }

  /**
   * Get presence status for a member (present/absent)
   */
  async getPresenceStatus(memberId: string): Promise<'present' | 'absent'> {
    const checkin = await prisma.checkin.findFirst({
      where: { memberId },
      orderBy: { timestamp: 'desc' },
      select: { direction: true },
    });

    return checkin?.direction === 'in' ? 'present' : 'absent';
  }

  /**
   * Find members by IDs (batch operation to prevent N+1 queries)
   */
  async findByIds(ids: string[]): Promise<MemberWithDivision[]> {
    if (ids.length === 0) {
      return [];
    }

    const members = await prisma.member.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        division: true,
      },
    });

    return members.map(toMemberWithDivision);
  }

  /**
   * Find members by service numbers (for import operations)
   */
  async findByServiceNumbers(serviceNumbers: string[]): Promise<Member[]> {
    if (serviceNumbers.length === 0) {
      return [];
    }

    const members = await prisma.member.findMany({
      where: {
        serviceNumber: { in: serviceNumbers },
      },
    });

    return members.map(toMember);
  }

  /**
   * Bulk create members (for import operations)
   */
  async bulkCreate(members: CreateMemberInput[]): Promise<number> {
    if (members.length === 0) {
      return 0;
    }

    const result = await prisma.$transaction(async (tx) => {
      let insertedCount = 0;

      for (const memberData of members) {
        await tx.member.create({
          data: {
            serviceNumber: memberData.serviceNumber,
            employeeNumber: memberData.employeeNumber !== undefined ? memberData.employeeNumber : null,
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            initials: memberData.initials !== undefined ? memberData.initials : null,
            rank: memberData.rank,
            divisionId: memberData.divisionId,
            mess: memberData.mess !== undefined ? memberData.mess : null,
            moc: memberData.moc !== undefined ? memberData.moc : null,
            memberType: memberData.memberType,
            classDetails: memberData.classDetails !== undefined ? memberData.classDetails : null,
            status: memberData.status !== undefined ? memberData.status : 'active',
            email: memberData.email !== undefined ? memberData.email : null,
            homePhone: memberData.homePhone !== undefined ? memberData.homePhone : null,
            mobilePhone: memberData.mobilePhone !== undefined ? memberData.mobilePhone : null,
            badgeId: memberData.badgeId !== undefined ? memberData.badgeId : null,
          },
        });

        insertedCount++;
      }

      return insertedCount;
    });

    await this.invalidatePresenceCache();
    return result;
  }

  /**
   * Bulk update members (for import operations)
   */
  async bulkUpdate(updates: Array<{ id: string; data: UpdateMemberInput }>): Promise<number> {
    if (updates.length === 0) {
      return 0;
    }

    const result = await prisma.$transaction(async (tx) => {
      let updatedCount = 0;

      for (const { id, data } of updates) {
        const updateData: Record<string, unknown> = {};

        if (data.serviceNumber !== undefined) {
          updateData.serviceNumber = data.serviceNumber;
        }
        if (data.employeeNumber !== undefined) {
          updateData.employeeNumber = data.employeeNumber;
        }
        if (data.firstName !== undefined) {
          updateData.firstName = data.firstName;
        }
        if (data.lastName !== undefined) {
          updateData.lastName = data.lastName;
        }
        if (data.initials !== undefined) {
          updateData.initials = data.initials;
        }
        if (data.rank !== undefined) {
          updateData.rank = data.rank;
        }
        if (data.divisionId !== undefined) {
          updateData.divisionId = data.divisionId;
        }
        if (data.mess !== undefined) {
          updateData.mess = data.mess;
        }
        if (data.moc !== undefined) {
          updateData.moc = data.moc;
        }
        if (data.memberType !== undefined) {
          updateData.memberType = data.memberType;
        }
        if (data.classDetails !== undefined) {
          updateData.classDetails = data.classDetails;
        }
        if (data.status !== undefined) {
          updateData.status = data.status;
        }
        if (data.email !== undefined) {
          updateData.email = data.email;
        }
        if (data.homePhone !== undefined) {
          updateData.homePhone = data.homePhone;
        }
        if (data.mobilePhone !== undefined) {
          updateData.mobilePhone = data.mobilePhone;
        }
        if (data.badgeId !== undefined) {
          updateData.badgeId = data.badgeId;
        }

        if (Object.keys(updateData).length === 0) {
          continue; // Skip if no fields to update
        }

        const updateResult = await tx.member.updateMany({
          where: { id },
          data: updateData,
        });

        if (updateResult.count > 0) {
          updatedCount++;
        }
      }

      return updatedCount;
    });

    await this.invalidatePresenceCache();
    return result;
  }

  /**
   * Flag members for review (set status to pending_review)
   */
  async flagForReview(memberIds: string[]): Promise<void> {
    if (memberIds.length === 0) {
      return;
    }

    await prisma.member.updateMany({
      where: {
        id: { in: memberIds },
      },
      data: {
        status: 'pending_review',
      },
    });

    await this.invalidatePresenceCache();
  }

  /**
   * Invalidate presence cache in Redis
   */
  private async invalidatePresenceCache(): Promise<void> {
    await redis.del('presence:stats');
  }
}

export const memberRepository = new MemberRepository();
