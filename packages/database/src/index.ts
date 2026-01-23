export { prisma } from './client.js'

// Re-export Prisma and PrismaClient directly from generated client
// This preserves the Prisma namespace for type usage
export { Prisma, PrismaClient } from '../generated/client/index.js'

// Export all types
export type * from '../generated/client'

// Create instance type alias for easier usage
import type { PrismaClient as PC } from '../generated/client/index.js'
export type PrismaClientInstance = InstanceType<typeof PC>
