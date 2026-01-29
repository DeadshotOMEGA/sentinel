#!/usr/bin/env tsx
/**
 * Data Migration: Fix member name casing
 *
 * Nominal Roll imports store last names in ALL CAPS.
 * This script converts all member first/last names to proper name case,
 * handling common prefixes (Mc, Mac, O', St-, Le, etc.) and particles
 * (de, van, von, etc.).
 *
 * Usage: DATABASE_URL=... npx tsx packages/database/scripts/fix-name-casing.ts
 */
import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sentinel:sentinel@localhost:5432/sentinel'

// ── Name case logic (duplicated from backend utils to keep script standalone) ──

const LOWERCASE_PARTICLES = new Set([
  'de', 'del', 'della', 'di', 'du', 'da',
  'la', 'le', 'les', 'lo',
  'van', 'von', 'den', 'der', 'het',
  'el', 'al',
  'y', 'e',
])

function capitalizeSegment(segment: string): string {
  if (segment.length === 0) return segment

  const lower = segment.toLowerCase()

  if (lower.length > 2 && lower.startsWith('mc')) {
    return 'Mc' + lower.charAt(2).toUpperCase() + lower.slice(3)
  }

  if (lower.length >= 5 && lower.startsWith('mac') && lower.charAt(3) !== 'h' && lower.charAt(3) !== 'k' && lower.charAt(3) !== 'e') {
    return 'Mac' + lower.charAt(3).toUpperCase() + lower.slice(4)
  }

  if (lower.length > 2 && lower.startsWith("o'")) {
    return "O'" + lower.charAt(2).toUpperCase() + lower.slice(3)
  }

  if (lower.startsWith('st-') && lower.length > 3) {
    return 'St-' + lower.charAt(3).toUpperCase() + lower.slice(4)
  }

  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function toNameCase(name: string): string {
  if (!name) return name
  const trimmed = name.trim()
  if (trimmed.length === 0) return trimmed

  const parts = trimmed.split(/(\s+|-|[()])/)
  return parts
    .map((part, index) => {
      if (/^\s+$/.test(part) || part === '-' || part === '(' || part === ')') return part
      const lower = part.toLowerCase()
      if (index > 0 && LOWERCASE_PARTICLES.has(lower)) return lower
      return capitalizeSegment(part)
    })
    .join('')
}

// ── Migration ──

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL })
  const client = await pool.connect()

  try {
    console.log('Starting name casing fix...\n')

    const { rows: members } = await client.query<{
      id: string
      first_name: string
      last_name: string
    }>('SELECT id, first_name, last_name FROM members ORDER BY last_name')

    console.log(`Found ${members.length} members to check.\n`)

    let updated = 0
    const changes: string[] = []

    await client.query('BEGIN')

    for (const member of members) {
      const newFirst = toNameCase(member.first_name)
      const newLast = toNameCase(member.last_name)

      if (newFirst !== member.first_name || newLast !== member.last_name) {
        await client.query(
          'UPDATE members SET first_name = $1, last_name = $2 WHERE id = $3',
          [newFirst, newLast, member.id]
        )
        changes.push(
          `  ${member.last_name}, ${member.first_name} -> ${newLast}, ${newFirst}`
        )
        updated++
      }
    }

    await client.query('COMMIT')

    if (changes.length > 0) {
      console.log('Changes applied:')
      for (const change of changes) {
        console.log(change)
      }
    }

    console.log(`\nDone. Updated ${updated} of ${members.length} members.`)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Migration failed, rolled back:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
