export { prisma } from './client'

// Explicitly re-export from generated client to work around ESM/CJS interop issues
import PrismaClientModule from '../generated/client/index.js'
export const { Prisma, PrismaClient } = PrismaClientModule
export type * from '../generated/client'
