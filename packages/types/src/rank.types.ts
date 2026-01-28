/**
 * Canadian Armed Forces rank types
 */

export type RankBranch = 'navy' | 'army' | 'air_force'

export type RankCategory =
  | 'junior_ncm'
  | 'senior_ncm'
  | 'junior_officer'
  | 'senior_officer'
  | 'general_officer'

export interface Rank {
  id: string
  code: string
  name: string
  branch: RankBranch
  category: RankCategory
  displayOrder: number
  isActive: boolean
  replacedBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface RankComparison {
  rank1: string
  rank2: string
  result: -1 | 0 | 1
  message: string
}

export interface RankStatistics {
  totalRanks: number
  activeRanks: number
  deprecatedRanks: number
  byBranch: Record<string, number>
  byCategory: Record<string, number>
}
