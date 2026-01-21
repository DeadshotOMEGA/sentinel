import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type {
  ListType,
  ListItem,
  CreateListItemInput,
  UpdateListItemInput,
} from '@sentinel/types'

/**
 * Raw database row structure for list_items
 */
interface ListItemRow {
  id: string
  list_type: string
  code: string
  name: string
  display_order: number
  description: string | null
  is_system: boolean
  created_at: Date
  updated_at: Date
}

/**
 * Convert database row to ListItem type
 */
function toListItem(row: ListItemRow): ListItem {
  return {
    id: row.id,
    listType: row.list_type as ListType,
    code: row.code,
    name: row.name,
    displayOrder: row.display_order,
    description: row.description ?? undefined,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class ListItemRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find all list items for a given list type
   */
  async findByType(listType: ListType): Promise<ListItem[]> {
    const rows = await this.prisma.$queryRaw<ListItemRow[]>`
      SELECT id, list_type, code, name, display_order, description, is_system, created_at, updated_at
      FROM list_items
      WHERE list_type = ${listType}
      ORDER BY display_order, name
    `

    return rows.map(toListItem)
  }

  /**
   * Find a list item by type and code
   */
  async findByTypeAndCode(listType: ListType, code: string): Promise<ListItem | null> {
    const rows = await this.prisma.$queryRaw<ListItemRow[]>`
      SELECT id, list_type, code, name, display_order, description, is_system, created_at, updated_at
      FROM list_items
      WHERE list_type = ${listType} AND code = ${code}
    `

    if (rows.length === 0) {
      return null
    }

    return toListItem(rows[0]!)
  }

  /**
   * Find a list item by ID
   */
  async findById(id: string): Promise<ListItem | null> {
    const rows = await this.prisma.$queryRaw<ListItemRow[]>`
      SELECT id, list_type, code, name, display_order, description, is_system, created_at, updated_at
      FROM list_items
      WHERE id = ${id}::uuid
    `

    if (rows.length === 0) {
      return null
    }

    return toListItem(rows[0]!)
  }

  /**
   * Create a new list item
   */
  async create(listType: ListType, data: CreateListItemInput): Promise<ListItem> {
    // Get max display order if not provided
    let displayOrder = data.displayOrder
    if (displayOrder === undefined) {
      const maxOrderResult = await this.prisma.$queryRaw<Array<{ max_order: number | null }>>`
        SELECT MAX(display_order) as max_order
        FROM list_items
        WHERE list_type = ${listType}
      `
      displayOrder = (maxOrderResult[0]?.max_order ?? 0) + 1
    }

    const isSystem = data.isSystem ?? false

    const rows = await this.prisma.$queryRaw<ListItemRow[]>`
      INSERT INTO list_items (list_type, code, name, display_order, description, is_system)
      VALUES (${listType}, ${data.code}, ${data.name}, ${displayOrder}, ${data.description ?? null}, ${isSystem})
      RETURNING id, list_type, code, name, display_order, description, is_system, created_at, updated_at
    `

    if (rows.length === 0) {
      throw new Error('Failed to create list item')
    }

    return toListItem(rows[0]!)
  }

  /**
   * Update a list item
   */
  async update(id: string, data: UpdateListItemInput): Promise<ListItem> {
    // Verify item exists
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error(`List item not found: ${id}`)
    }

    // Check if any fields are provided
    const hasUpdates =
      data.code !== undefined ||
      data.name !== undefined ||
      data.displayOrder !== undefined ||
      data.description !== undefined

    if (!hasUpdates) {
      throw new Error('No fields to update')
    }

    // Use Prisma's raw query with dynamic parameters
    // For partial updates, we need to build the query based on what's provided
    const rows = await this.prisma.$queryRaw<ListItemRow[]>`
      UPDATE list_items
      SET
        code = COALESCE(${data.code ?? null}, code),
        name = COALESCE(${data.name ?? null}, name),
        display_order = COALESCE(${data.displayOrder ?? null}, display_order),
        description = CASE
          WHEN ${data.description !== undefined} THEN ${data.description ?? null}
          ELSE description
        END,
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, list_type, code, name, display_order, description, is_system, created_at, updated_at
    `

    if (rows.length === 0) {
      throw new Error(`List item not found: ${id}`)
    }

    return toListItem(rows[0]!)
  }

  /**
   * Delete a list item
   */
  async delete(id: string): Promise<void> {
    const result = await this.prisma.$executeRaw`
      DELETE FROM list_items WHERE id = ${id}::uuid
    `

    if (result === 0) {
      throw new Error(`List item not found: ${id}`)
    }
  }

  /**
   * Get usage count for a list item based on its type
   * Note: Uses 'name' field for matching since members table stores display values
   */
  async getUsageCount(id: string): Promise<number> {
    // First get the list item to determine its type and name
    const item = await this.findById(id)
    if (!item) {
      return 0
    }

    let count = 0

    switch (item.listType) {
      case 'event_role': {
        const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM event_attendees
          WHERE role = ${item.name}
        `
        count = Number(result[0]?.count ?? 0)
        break
      }
      case 'rank': {
        const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM members
          WHERE rank = ${item.name}
        `
        count = Number(result[0]?.count ?? 0)
        break
      }
      case 'mess': {
        const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM members
          WHERE mess = ${item.name}
        `
        count = Number(result[0]?.count ?? 0)
        break
      }
      case 'moc': {
        const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM members
          WHERE moc = ${item.name}
        `
        count = Number(result[0]?.count ?? 0)
        break
      }
      default:
        // Unknown list type, return 0
        break
    }

    return count
  }

  /**
   * Reorder list items within a type
   * Updates display_order based on position in the itemIds array
   */
  async reorder(listType: ListType, itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) {
      return
    }

    // Use a transaction to update all items atomically
    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < itemIds.length; i++) {
        const itemId = itemIds[i]
        const newOrder = i + 1

        await tx.$executeRaw`
          UPDATE list_items
          SET display_order = ${newOrder}, updated_at = NOW()
          WHERE id = ${itemId}::uuid AND list_type = ${listType}
        `
      }
    })
  }
}

export const listItemRepository = new ListItemRepository()
