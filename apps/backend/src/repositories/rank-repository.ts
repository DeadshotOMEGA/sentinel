import type { PrismaClient as PrismaClientInstance, Rank } from '@sentinel/database'

export interface RankFilters {
  branch?: string
  active?: boolean
  category?: string
}

export interface RankComparison {
  rank1: string
  rank2: string
  result: -1 | 0 | 1
  message: string
}

/**
 * Repository for managing CAF ranks
 */
export class RankRepository {
  constructor(private prisma: PrismaClientInstance) {}

  /**
   * Find all ranks with optional filters
   * @param filters - Optional filters for branch, active status, category
   * @returns Array of ranks sorted by branch and display order
   */
  async findAll(filters?: RankFilters): Promise<Rank[]> {
    return this.prisma.rank.findMany({
      where: {
        ...(filters?.branch && { branch: filters.branch }),
        ...(filters?.active !== undefined && { isActive: filters.active }),
        ...(filters?.category && { category: filters.category }),
      },
      orderBy: [{ branch: 'asc' }, { displayOrder: 'asc' }],
    })
  }

  /**
   * Find a rank by its code
   * @param code - Rank code (e.g., "S1", "CPL", "Adm")
   * @returns Rank or null if not found
   */
  async findByCode(code: string): Promise<Rank | null> {
    return this.prisma.rank.findUnique({
      where: { code },
    })
  }

  /**
   * Find a rank by ID
   * @param id - Rank UUID
   * @returns Rank or null if not found
   */
  async findById(id: string): Promise<Rank | null> {
    return this.prisma.rank.findUnique({
      where: { id },
    })
  }

  /**
   * Compare two ranks by seniority
   * @param rank1Code - First rank code
   * @param rank2Code - Second rank code
   * @returns -1 if rank1 < rank2 (rank1 is junior), 0 if equal, 1 if rank1 > rank2 (rank1 is senior)
   * @throws Error if ranks are from different branches or if either rank doesn't exist
   */
  async compareRanks(rank1Code: string, rank2Code: string): Promise<RankComparison> {
    if (rank1Code === rank2Code) {
      return {
        rank1: rank1Code,
        rank2: rank2Code,
        result: 0,
        message: 'Ranks are equal',
      }
    }

    const [rank1, rank2] = await Promise.all([
      this.findByCode(rank1Code),
      this.findByCode(rank2Code),
    ])

    if (!rank1) {
      throw new Error(`Rank code "${rank1Code}" not found`)
    }

    if (!rank2) {
      throw new Error(`Rank code "${rank2Code}" not found`)
    }

    if (rank1.branch !== rank2.branch) {
      throw new Error(
        `Cannot compare ranks from different branches: ${rank1.branch} vs ${rank2.branch}`
      )
    }

    // Higher displayOrder = more senior
    if (rank1.displayOrder < rank2.displayOrder) {
      return {
        rank1: rank1Code,
        rank2: rank2Code,
        result: -1,
        message: `${rank1.name} is junior to ${rank2.name}`,
      }
    }

    if (rank1.displayOrder > rank2.displayOrder) {
      return {
        rank1: rank1Code,
        rank2: rank2Code,
        result: 1,
        message: `${rank1.name} is senior to ${rank2.name}`,
      }
    }

    // Same display order (shouldn't happen in valid data)
    return {
      rank1: rank1Code,
      rank2: rank2Code,
      result: 0,
      message: 'Ranks have same seniority',
    }
  }

  /**
   * Validate that a rank code exists and is active
   * @param code - Rank code to validate
   * @returns true if rank exists and is active, false otherwise
   */
  async validateRankCode(code: string): Promise<boolean> {
    const rank = await this.prisma.rank.findUnique({
      where: { code },
      select: { isActive: true },
    })

    return rank?.isActive ?? false
  }

  /**
   * Get mapping of deprecated rank codes to their replacements
   * @returns Map of deprecated code -> active code
   */
  async getDeprecatedRankMapping(): Promise<Map<string, string>> {
    const deprecatedRanks = await this.prisma.rank.findMany({
      where: {
        isActive: false,
        replacedBy: { not: null },
      },
      include: {
        replacedByRank: {
          select: { code: true },
        },
      },
    })

    const mapping = new Map<string, string>()
    for (const rank of deprecatedRanks) {
      if (rank.replacedByRank) {
        mapping.set(rank.code, rank.replacedByRank.code)
      }
    }

    return mapping
  }

  /**
   * Get ranks grouped by branch
   * @returns Object with branch names as keys and arrays of ranks as values
   */
  async getRanksByBranch(): Promise<Record<string, Rank[]>> {
    const ranks = await this.findAll({ active: true })

    return ranks.reduce((acc, rank) => {
      if (!acc[rank.branch]) {
        acc[rank.branch] = []
      }
      acc[rank.branch]!.push(rank)
      return acc
    }, {} as Record<string, Rank[]>)
  }

  /**
   * Get rank statistics
   * @returns Statistics about ranks in the system
   */
  async getStatistics(): Promise<{
    totalRanks: number
    activeRanks: number
    deprecatedRanks: number
    byBranch: Record<string, number>
    byCategory: Record<string, number>
  }> {
    const [totalCount, activeCount, deprecatedCount, branchCounts, categoryCounts] =
      await Promise.all([
        this.prisma.rank.count(),
        this.prisma.rank.count({ where: { isActive: true } }),
        this.prisma.rank.count({ where: { isActive: false } }),
        this.prisma.rank.groupBy({
          by: ['branch'],
          where: { isActive: true },
          _count: true,
        }),
        this.prisma.rank.groupBy({
          by: ['category'],
          where: { isActive: true },
          _count: true,
        }),
      ])

    return {
      totalRanks: totalCount,
      activeRanks: activeCount,
      deprecatedRanks: deprecatedCount,
      byBranch: branchCounts.reduce((acc, item) => {
        acc[item.branch] = item._count ?? 0
        return acc
      }, {} as Record<string, number>),
      byCategory: categoryCounts.reduce((acc, item) => {
        acc[item.category] = item._count ?? 0
        return acc
      }, {} as Record<string, number>),
    }
  }
}
