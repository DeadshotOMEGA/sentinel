import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

let pool: Pool | null = null
let adapterInstance: PrismaPg | null = null

/**
 * Create adapter with current DATABASE_URL
 * This allows tests to set DATABASE_URL before the adapter is created
 */
export function createAdapter(): PrismaPg {
  // Always create a new pool with current DATABASE_URL
  // Close old pool if it exists
  if (pool) {
    pool.end().catch(() => {
      // Ignore errors on cleanup
    })
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  adapterInstance = new PrismaPg(pool)
  return adapterInstance
}

// For backwards compatibility, create adapter on first access
let defaultAdapter: PrismaPg | null = null
export const adapter: PrismaPg = new Proxy({} as PrismaPg, {
  get(_target, prop) {
    if (!defaultAdapter) {
      defaultAdapter = createAdapter()
    }
    const value = defaultAdapter[prop as keyof PrismaPg]
    return typeof value === 'function' ? value.bind(defaultAdapter) : value
  },
  apply(_target, _thisArg, _argumentsList: unknown[]) {
    if (!defaultAdapter) {
      defaultAdapter = createAdapter()
    }
    // PrismaPg is not callable, but Proxy apply trap is required by TypeScript
    throw new Error('Adapter is not callable')
  },
})
