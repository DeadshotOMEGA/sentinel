import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function verifySchema() {
  const client = await pool.connect()

  try {
    const tables = ['member_types', 'member_statuses', 'visit_types', 'badge_statuses', 'tags']

    for (const table of tables) {
      const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table])

      console.log(`\n${table}:`)
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`)
      })
    }
  } catch (error) {
    console.error('Error verifying schema:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

verifySchema()
  .then(() => {
    console.log('\n✓ Schema verification complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to verify schema:', error)
    process.exit(1)
  })
