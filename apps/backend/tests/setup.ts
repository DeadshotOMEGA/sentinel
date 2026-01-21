// apps/backend/tests/setup.ts

// Set env immediately at module load time (before test files import app code)
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'

// Guard against bad values like '/'
if (!process.env.BASE_URL || process.env.BASE_URL === '/') {
  process.env.BASE_URL = 'http://localhost:3000'
}

process.env.BETTER_AUTH_SECRET = 'test-secret-key-min-32-chars-long'

// Optional hooks if you need them later
import { afterAll } from 'vitest'

afterAll(() => {
  // Global cleanup if needed
})
