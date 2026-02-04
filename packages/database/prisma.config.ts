import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// Export Prisma 7 configuration for migrations
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
