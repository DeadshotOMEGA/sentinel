#!/usr/bin/env tsx
/**
 * Seed script for Duty Roles & Lockup System
 * Seeds qualification types, duty roles, and duty positions
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
    console.log('🔄 Checking database state for duty roles seeding...')

    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('qualification_types', 'duty_roles', 'duty_positions')
      ORDER BY table_name
    `)

    const existingTables = tablesResult.rows.map(r => r.table_name)
    console.log(`Found tables: ${existingTables.join(', ') || 'none'}`)

    // All three tables must exist
    const requiredTables = ['qualification_types', 'duty_roles', 'duty_positions']
    const missingTables = requiredTables.filter(t => !existingTables.includes(t))

    if (missingTables.length > 0) {
      console.log('⚠️  Missing tables:', missingTables.join(', '))
      console.log('   Please run prisma migrate first to create the tables.')
      console.log('   Command: pnpm prisma migrate dev')
      return
    }

    // Check if already seeded
    const qualTypesCount = await client.query('SELECT COUNT(*) FROM qualification_types')
    const dutyRolesCount = await client.query('SELECT COUNT(*) FROM duty_roles')

    if (parseInt(qualTypesCount.rows[0].count) > 0) {
      console.log(`✓ Qualification types already seeded (${qualTypesCount.rows[0].count} entries)`)
    }
    if (parseInt(dutyRolesCount.rows[0].count) > 0) {
      console.log(`✓ Duty roles already seeded (${dutyRolesCount.rows[0].count} entries)`)
    }

    if (parseInt(qualTypesCount.rows[0].count) > 0 && parseInt(dutyRolesCount.rows[0].count) > 0) {
      console.log('⚠️  Data already seeded. Skipping...')
      return
    }

    console.log('🌱 Seeding duty roles data...')

    // Read and execute seed SQL
    const seedSQL = readFileSync(
      join(__dirname, 'seed-duty-roles.sql'),
      'utf-8'
    )

    await client.query(seedSQL)
    console.log('✓ Seed SQL executed')

    // Verification
    console.log('\n📊 Verification:')

    const qualResult = await client.query(`
      SELECT code, name, can_receive_lockup
      FROM qualification_types
      ORDER BY display_order
    `)
    console.log('\nQualification Types:')
    for (const row of qualResult.rows) {
      const lockupStatus = row.can_receive_lockup ? '✓ Lockup' : '  ------'
      console.log(`  ${row.code.padEnd(15)} ${row.name.padEnd(25)} ${lockupStatus}`)
    }

    const rolesResult = await client.query(`
      SELECT dr.code, dr.name, dr.role_type, array_length(dr.active_days, 1) as active_day_count,
             COUNT(dp.id) as position_count
      FROM duty_roles dr
      LEFT JOIN duty_positions dp ON dp.duty_role_id = dr.id
      GROUP BY dr.id
      ORDER BY dr.display_order
    `)
    console.log('\nDuty Roles:')
    for (const row of rolesResult.rows) {
      console.log(`  ${row.code.padEnd(12)} ${row.name.padEnd(20)} ${row.role_type.padEnd(8)} ${row.active_day_count} days, ${row.position_count} positions`)
    }

    const positionsResult = await client.query(`
      SELECT dp.code, dp.name, dp.max_slots
      FROM duty_positions dp
      JOIN duty_roles dr ON dp.duty_role_id = dr.id
      WHERE dr.code = 'DUTY_WATCH'
      ORDER BY dp.display_order
    `)
    console.log('\nDuty Watch Positions:')
    for (const row of positionsResult.rows) {
      console.log(`  ${row.code.padEnd(6)} ${row.name.padEnd(30)} (${row.max_slots} slot${row.max_slots > 1 ? 's' : ''})`)
    }

    console.log('\n✅ Duty roles seeding complete!')

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
