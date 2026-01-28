#!/usr/bin/env tsx
import { PrismaClient } from '../generated/client/index.js'
import { adapter } from '../prisma/prisma.config.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runMigration() {
  const prisma = new PrismaClient({ adapter })

  try {
    // Read migration SQL
    const migrationPath = join(__dirname, '../prisma/migrations/add-ranks-table.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('Running migration: add-ranks-table.sql')

    // Execute migration
    await prisma.$executeRawUnsafe(migrationSQL)

    console.log('✓ Migration completed successfully')

    // Read seed SQL
    const seedPath = join(__dirname, 'seed-ranks.sql')
    const seedSQL = readFileSync(seedPath, 'utf-8')

    console.log('Running seed: seed-ranks.sql')

    // Execute seed
    await prisma.$executeRawUnsafe(seedSQL)

    console.log('✓ Seed completed successfully')

    // Verify counts
    const totalCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM ranks`
    const activeCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM ranks WHERE is_active = true`
    const deprecatedCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM ranks WHERE is_active = false`

    console.log('\nVerification:')
    console.log(`  Total ranks: ${(totalCount as any)[0].count}`)
    console.log(`  Active ranks: ${(activeCount as any)[0].count}`)
    console.log(`  Deprecated ranks: ${(deprecatedCount as any)[0].count}`)
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
