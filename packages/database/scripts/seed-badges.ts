#!/usr/bin/env tsx
/**
 * Seed script for test badges
 * Creates temporary badges (TEST-BADGE-0001..N) and assigns one to each member
 */
import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sentinel:sentinel@localhost:5432/sentinel'

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL })
  const client = await pool.connect()

  try {
    console.log('🔄 Checking database state for badge seeding...')

    // Check prerequisites
    const membersCount = await client.query('SELECT COUNT(*) FROM members')
    const memberTotal = parseInt(membersCount.rows[0].count)

    if (memberTotal === 0) {
      console.log('⚠️  No members found. Seed members first.')
      return
    }

    console.log(`✓ Found ${memberTotal} members`)

    // Check if badges already exist
    const badgesCount = await client.query("SELECT COUNT(*) FROM badges WHERE serial_number LIKE 'TEST-BADGE-%'")
    const existingBadges = parseInt(badgesCount.rows[0].count)

    if (existingBadges > 0) {
      console.log(`⚠️  ${existingBadges} test badges already exist. Skipping...`)
      return
    }

    // Check badge statuses
    const statusCheck = await client.query("SELECT id FROM badge_statuses WHERE code = 'active'")
    if (statusCheck.rows.length === 0) {
      console.log('⚠️  Badge status "active" not found. Seed badge_statuses first.')
      return
    }

    console.log('🌱 Seeding test badges...')

    const seedSQL = readFileSync(
      join(__dirname, 'seed-badges.sql'),
      'utf-8'
    )

    await client.query(seedSQL)
    console.log('✓ Seed SQL executed')

    // Verification
    console.log('\n📊 Verification:')

    const totalBadges = await client.query('SELECT COUNT(*) FROM badges')
    console.log(`  Total badges: ${totalBadges.rows[0].count}`)

    const assignedMembers = await client.query('SELECT COUNT(*) FROM members WHERE badge_id IS NOT NULL')
    console.log(`  Members with badges: ${assignedMembers.rows[0].count} / ${memberTotal}`)

    const sampleResult = await client.query(`
      SELECT b.serial_number, m.first_name, m.last_name, m.rank
      FROM badges b
      JOIN members m ON m.badge_id = b.id
      ORDER BY b.serial_number
      LIMIT 10
    `)

    console.log('\n  Sample assignments:')
    for (const row of sampleResult.rows) {
      console.log(`    ${row.serial_number} → ${row.rank} ${row.first_name} ${row.last_name}`)
    }

    console.log('\n✅ Badge seeding complete!')

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
