#!/usr/bin/env tsx
import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sentinel:sentinel@localhost:5432/sentinel'

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL })
  const client = await pool.connect()

  try {
    console.log('🔒 Making rank_id NOT NULL...')
    await client.query('ALTER TABLE members ALTER COLUMN rank_id SET NOT NULL')
    console.log('✓ rank_id is now NOT NULL')

    // Verify constraint
    const constraintCheck = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'members' AND column_name = 'rank_id'
    `)
    console.log(`✓ Verified: is_nullable = ${constraintCheck.rows[0].is_nullable}`)
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main()
