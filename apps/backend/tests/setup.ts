import { beforeAll, afterAll } from 'vitest'

// Set DATABASE_URL before any imports to prevent Prisma initialization errors
// This is a placeholder - actual tests will override with testcontainers URL
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
}

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'error'
})

afterAll(async () => {
  // Global cleanup if needed
})
