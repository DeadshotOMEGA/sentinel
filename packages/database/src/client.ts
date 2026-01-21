import { PrismaClient } from '../generated/client'
import { adapter } from '../prisma/prisma.config'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// For tests: Allow undefined DATABASE_URL, prisma will be created lazily when first used
// For production: This will fail at runtime if DATABASE_URL is not set
let prismaInstance: PrismaClient | undefined

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
      throw new Error('DATABASE_URL environment variable is required')
    }

    prismaInstance = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaInstance
    }
  }
  return prismaInstance
}

// Export as Proxy for lazy initialization
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = (client as any)[prop]
    // Bind methods to the client instance
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
