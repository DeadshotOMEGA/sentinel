#!/usr/bin/env tsx
/**
 * Data Migration: Backfill member.rank_id from member.rank
 *
 * This script:
 * 1. Maps existing member.rank strings to rank_id foreign keys
 * 2. Handles deprecated ranks (AB→S2, LS→S1, OS→S3)
 * 3. Reports unmapped ranks for manual review
 * 4. Optionally makes rank_id NOT NULL after verification
 */
import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sentinel:sentinel@localhost:5432/sentinel'

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL })
  const client = await pool.connect()

  try {
    console.log('🔄 Starting member rank migration...\n')

    // Step 1: Check current state
    console.log('📊 Current state:')
    const memberStats = await client.query(`
      SELECT
        COUNT(*) as total_members,
        COUNT(rank_id) as members_with_rank_id,
        COUNT(*) - COUNT(rank_id) as members_without_rank_id
      FROM members
    `)
    console.log(`  Total members: ${memberStats.rows[0].total_members}`)
    console.log(`  With rank_id: ${memberStats.rows[0].members_with_rank_id}`)
    console.log(`  Without rank_id: ${memberStats.rows[0].members_without_rank_id}\n`)

    if (parseInt(memberStats.rows[0].members_without_rank_id) === 0) {
      console.log('✅ All members already have rank_id set. Nothing to do.')
      return
    }

    // Step 2: Backfill rank_id for active ranks (direct match)
    console.log('🔄 Backfilling rank_id for active ranks...')
    const activeRanksResult = await client.query(`
      UPDATE members m
      SET rank_id = r.id
      FROM ranks r
      WHERE m.rank = r.code
        AND r.is_active = true
        AND m.rank_id IS NULL
      RETURNING m.id, m.service_number, m.first_name, m.last_name, m.rank, r.code as new_rank_code
    `)
    console.log(`  ✓ Mapped ${activeRanksResult.rowCount} members to active ranks`)

    if (activeRanksResult.rowCount && activeRanksResult.rowCount > 0) {
      console.log('  Sample mappings:')
      activeRanksResult.rows.slice(0, 5).forEach(row => {
        console.log(`    - ${row.service_number}: ${row.first_name} ${row.last_name} (${row.rank})`)
      })
      console.log()
    }

    // Step 3: Handle deprecated ranks (AB→S2, LS→S1, OS→S3)
    console.log('🔄 Handling deprecated Navy ranks...')
    const deprecatedRanksResult = await client.query(`
      UPDATE members m
      SET rank_id = r.replaced_by
      FROM ranks r
      WHERE m.rank = r.code
        AND r.is_active = false
        AND r.replaced_by IS NOT NULL
        AND m.rank_id IS NULL
      RETURNING m.id, m.service_number, m.first_name, m.last_name, m.rank,
                (SELECT code FROM ranks WHERE id = r.replaced_by) as new_rank_code
    `)
    console.log(`  ✓ Migrated ${deprecatedRanksResult.rowCount} members from deprecated ranks`)

    if (deprecatedRanksResult.rowCount && deprecatedRanksResult.rowCount > 0) {
      console.log('  Migrations:')
      deprecatedRanksResult.rows.forEach(row => {
        console.log(`    - ${row.service_number}: ${row.first_name} ${row.last_name} (${row.rank} → ${row.new_rank_code})`)
      })
      console.log()
    }

    // Step 4: Check for unmapped ranks
    console.log('🔍 Checking for unmapped ranks...')
    const unmappedResult = await client.query(`
      SELECT
        m.id,
        m.service_number,
        m.first_name,
        m.last_name,
        m.rank
      FROM members m
      WHERE m.rank_id IS NULL
      ORDER BY m.last_name, m.first_name
    `)

    if (unmappedResult.rowCount && unmappedResult.rowCount > 0) {
      console.log(`  ⚠️  Found ${unmappedResult.rowCount} members with unmapped ranks:\n`)
      unmappedResult.rows.forEach(row => {
        console.log(`    - ${row.service_number}: ${row.first_name} ${row.last_name} (rank: "${row.rank}")`)
      })
      console.log('\n  ⛔ Cannot proceed with making rank_id NOT NULL.')
      console.log('     Please manually update these members or add their ranks to the ranks table.\n')
      return
    }

    console.log('  ✅ No unmapped ranks found!\n')

    // Step 5: Final verification
    console.log('📊 Final verification:')
    const finalStats = await client.query(`
      SELECT
        COUNT(*) as total_members,
        COUNT(rank_id) as members_with_rank_id,
        COUNT(*) - COUNT(rank_id) as members_without_rank_id
      FROM members
    `)
    console.log(`  Total members: ${finalStats.rows[0].total_members}`)
    console.log(`  With rank_id: ${finalStats.rows[0].members_with_rank_id}`)
    console.log(`  Without rank_id: ${finalStats.rows[0].members_without_rank_id}\n`)

    // Step 6: Make rank_id NOT NULL (optional - commented out for safety)
    const makeNotNull = process.argv.includes('--make-not-null')

    if (makeNotNull) {
      if (parseInt(finalStats.rows[0].members_without_rank_id) === 0) {
        console.log('🔒 Making rank_id NOT NULL...')
        await client.query('ALTER TABLE members ALTER COLUMN rank_id SET NOT NULL')
        console.log('  ✓ rank_id is now NOT NULL\n')

        // Verify constraint
        const constraintCheck = await client.query(`
          SELECT
            column_name,
            is_nullable
          FROM information_schema.columns
          WHERE table_name = 'members'
            AND column_name = 'rank_id'
        `)
        console.log(`  Verification: rank_id is_nullable = ${constraintCheck.rows[0].is_nullable}\n`)
      } else {
        console.log('  ⛔ Cannot make rank_id NOT NULL - some members still have NULL rank_id\n')
      }
    } else {
      console.log('ℹ️  Skipping NOT NULL constraint.')
      console.log('   Run with --make-not-null flag to enforce constraint:\n')
      console.log('   DATABASE_URL="..." pnpm exec tsx scripts/migrate-member-ranks.ts --make-not-null\n')
    }

    console.log('✅ Member rank migration complete!')

  } catch (error) {
    console.error('❌ Migration error:', error)
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
