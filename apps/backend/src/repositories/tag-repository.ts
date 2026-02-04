import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Tag, CreateTagInput, UpdateTagInput } from '@sentinel/types'

/**
 * Extended Prisma Tag type that includes display_order and chip fields
 */
interface PrismaTagRow {
  id: string
  name: string
  description: string | null
  displayOrder: number
  chipVariant: string
  chipColor: string
  isPositional: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

/**
 * Convert Prisma Tag row to shared Tag type
 */
function toTag(t: PrismaTagRow): Tag {
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? undefined,
    displayOrder: t.displayOrder,
    chipVariant: t.chipVariant,
    chipColor: t.chipColor,
    isPositional: t.isPositional,
    createdAt: t.createdAt ?? new Date(),
    updatedAt: t.updatedAt ?? new Date(),
  }
}

export class TagRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find all tags ordered by display_order, then name
   */
  async findAll(): Promise<Tag[]> {
    const rows = await this.prisma.$queryRaw<PrismaTagRow[]>`
      SELECT id, name, description, display_order as "displayOrder",
             chip_variant as "chipVariant", chip_color as "chipColor",
             is_positional as "isPositional",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM tags
      ORDER BY display_order, name
    `

    return rows.map(toTag)
  }

  /**
   * Find tag by ID
   */
  async findById(id: string): Promise<Tag | null> {
    const rows = await this.prisma.$queryRaw<PrismaTagRow[]>`
      SELECT id, name, description, display_order as "displayOrder",
             chip_variant as "chipVariant", chip_color as "chipColor",
             is_positional as "isPositional",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM tags
      WHERE id = ${id}::uuid
    `

    if (rows.length === 0) {
      return null
    }

    return toTag(rows[0]!)
  }

  /**
   * Find tag by name
   */
  async findByName(name: string): Promise<Tag | null> {
    const rows = await this.prisma.$queryRaw<PrismaTagRow[]>`
      SELECT id, name, description, display_order as "displayOrder",
             chip_variant as "chipVariant", chip_color as "chipColor",
             is_positional as "isPositional",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM tags
      WHERE name = ${name}
    `

    if (rows.length === 0) {
      return null
    }

    return toTag(rows[0]!)
  }

  /**
   * Create a new tag
   */
  async create(data: CreateTagInput): Promise<Tag> {
    // Get max display order if not provided
    let displayOrder = data.displayOrder
    if (displayOrder === undefined) {
      const maxOrderResult = await this.prisma.$queryRaw<Array<{ max_order: number | null }>>`
        SELECT MAX(display_order) as max_order FROM tags
      `
      displayOrder = (maxOrderResult[0]?.max_order ?? 0) + 1
    }

    const chipVariant = data.chipVariant ?? 'solid'
    const chipColor = data.chipColor ?? 'default'
    const isPositional = data.isPositional ?? false

    const rows = await this.prisma.$queryRaw<PrismaTagRow[]>`
      INSERT INTO tags (name, description, display_order, chip_variant, chip_color, is_positional)
      VALUES (${data.name}, ${data.description ?? null}, ${displayOrder}, ${chipVariant}, ${chipColor}, ${isPositional})
      RETURNING id, name, description, display_order as "displayOrder",
                chip_variant as "chipVariant", chip_color as "chipColor",
                is_positional as "isPositional",
                created_at as "createdAt", updated_at as "updatedAt"
    `

    if (rows.length === 0) {
      throw new Error('Failed to create tag')
    }

    return toTag(rows[0]!)
  }

  /**
   * Update a tag
   */
  async update(id: string, data: UpdateTagInput): Promise<Tag> {
    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update')
    }

    // Verify tag exists
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error(`Tag not found: ${id}`)
    }

    const rows = await this.prisma.$queryRaw<PrismaTagRow[]>`
      UPDATE tags
      SET
        name = COALESCE(${data.name ?? null}, name),
        description = CASE
          WHEN ${data.description !== undefined} THEN ${data.description ?? null}
          ELSE description
        END,
        display_order = COALESCE(${data.displayOrder ?? null}, display_order),
        chip_variant = COALESCE(${data.chipVariant ?? null}, chip_variant),
        chip_color = COALESCE(${data.chipColor ?? null}, chip_color),
        is_positional = CASE
          WHEN ${data.isPositional !== undefined} THEN ${data.isPositional ?? false}
          ELSE is_positional
        END,
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, name, description, display_order as "displayOrder",
                chip_variant as "chipVariant", chip_color as "chipColor",
                is_positional as "isPositional",
                created_at as "createdAt", updated_at as "updatedAt"
    `

    if (rows.length === 0) {
      throw new Error(`Tag not found: ${id}`)
    }

    return toTag(rows[0]!)
  }

  /**
   * Delete a tag
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.tag.delete({
        where: { id },
      })
    } catch (_error) {
      throw new Error(`Tag not found: ${id}`)
    }
  }

  /**
   * Get the count of qualification types linked to a tag
   */
  async getQualificationTypeCount(id: string): Promise<number> {
    const count = await this.prisma.qualificationType.count({
      where: { tagId: id },
    })
    return count
  }

  /**
   * Get the count of members with a tag (direct assignments + qualification-based)
   *
   * Counts:
   * 1. Direct tag assignments (member_tag table)
   * 2. Members with active qualifications where the qualification type is linked to this tag
   */
  async getUsageCount(id: string): Promise<number> {
    // Count direct tag assignments
    const directCount = await this.prisma.memberTag.count({
      where: { tagId: id },
    })

    // Count members with active qualifications linked to this tag
    // Use raw query to avoid double-counting members who have both direct tag and qualification
    const qualificationCount = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT mq.member_id) as count
      FROM member_qualifications mq
      JOIN qualification_types qt ON qt.id = mq.qualification_type_id
      WHERE qt.tag_id = ${id}::uuid
        AND mq.status = 'active'
        AND mq.member_id NOT IN (
          SELECT mt.member_id FROM member_tags mt WHERE mt.tag_id = ${id}::uuid
        )
    `

    const qualCount = Number(qualificationCount[0]?.count ?? 0)
    return directCount + qualCount
  }

  /**
   * Reorder tags by updating display_order based on position in tagIds array
   * Uses a transaction for atomic updates
   */
  async reorder(tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) {
      return
    }

    // Use a transaction to update all tags atomically
    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < tagIds.length; i++) {
        const tagId = tagIds[i]
        const newOrder = i + 1

        await tx.$executeRaw`
          UPDATE tags
          SET display_order = ${newOrder}, updated_at = NOW()
          WHERE id = ${tagId}::uuid
        `
      }
    })
  }

  // ============================================================================
  // Member Tag Management
  // ============================================================================

  /**
   * Get all tags assigned to a member
   */
  async getMemberTags(memberId: string): Promise<
    Array<{
      id: string
      tagId: string
      memberId: string
      tag: Tag
      createdAt: Date
    }>
  > {
    const memberTags = await this.prisma.memberTag.findMany({
      where: { memberId },
      include: { tag: true },
      orderBy: { tag: { displayOrder: 'asc' } },
    })

    return memberTags.map((mt) => ({
      id: mt.id,
      tagId: mt.tagId,
      memberId: mt.memberId,
      tag: toTag(mt.tag as unknown as PrismaTagRow),
      createdAt: mt.createdAt ?? new Date(),
    }))
  }

  /**
   * Assign a tag to a member
   */
  async assignTagToMember(
    memberId: string,
    tagId: string
  ): Promise<{
    id: string
    tagId: string
    memberId: string
    tag: Tag
    createdAt: Date
  }> {
    // Check if tag exists
    const tag = await this.findById(tagId)
    if (!tag) {
      throw new Error(`Tag not found: ${tagId}`)
    }

    // Check if already assigned
    const existing = await this.prisma.memberTag.findUnique({
      where: {
        memberId_tagId: { memberId, tagId },
      },
    })
    if (existing) {
      throw new Error(`Tag already assigned to member`)
    }

    const memberTag = await this.prisma.memberTag.create({
      data: { memberId, tagId },
      include: { tag: true },
    })

    return {
      id: memberTag.id,
      tagId: memberTag.tagId,
      memberId: memberTag.memberId,
      tag: toTag(memberTag.tag as unknown as PrismaTagRow),
      createdAt: memberTag.createdAt ?? new Date(),
    }
  }

  /**
   * Remove a tag from a member
   */
  async removeTagFromMember(memberId: string, tagId: string): Promise<void> {
    const existing = await this.prisma.memberTag.findUnique({
      where: {
        memberId_tagId: { memberId, tagId },
      },
    })

    if (!existing) {
      throw new Error(`Tag not assigned to member`)
    }

    await this.prisma.memberTag.delete({
      where: {
        memberId_tagId: { memberId, tagId },
      },
    })
  }
}

export const tagRepository = new TagRepository()
