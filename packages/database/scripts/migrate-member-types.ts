/**
 * Migration script to link existing members to MemberType table
 *
 * This script:
 * 1. Creates MemberType records for any member_type values that don't exist
 * 2. Updates all members to set member_type_id based on their member_type string
 *
 * Run with: pnpm -F @sentinel/database migrate:member-types
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { PrismaClient } from '../generated/client/index.js'

// Load .env from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const MEMBER_TYPE_NAMES: Record<string, string> = {
  'class_a': 'Class A Reserve',
  'class_b': 'Class B Reserve',
  'class_c': 'Class C Reserve',
  'reg_force': 'Regular Force',
}

async function migrateMemberTypes() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    console.log('Starting member type migration...\n')

    // Step 1: Get all unique member_type values from members
    const uniqueTypes = await prisma.$queryRaw<Array<{ member_type: string }>>`
      SELECT DISTINCT member_type
      FROM members
      WHERE member_type IS NOT NULL
        AND member_type != ''
    `

    console.log(`Found ${uniqueTypes.length} unique member types in members table`)

    // Step 2: Create missing MemberType records
    let typesCreated = 0
    for (const { member_type } of uniqueTypes) {
      const existing = await prisma.memberType.findUnique({
        where: { code: member_type }
      })

      if (!existing) {
        const name = MEMBER_TYPE_NAMES[member_type] || member_type
        await prisma.memberType.create({
          data: {
            code: member_type,
            name,
          }
        })
        console.log(`  Created MemberType: ${member_type} -> "${name}"`)
        typesCreated++
      } else {
        console.log(`  MemberType exists: ${member_type}`)
      }
    }

    console.log(`\nCreated ${typesCreated} new MemberType records`)

    // Step 3: Get all MemberType records for mapping
    const memberTypes = await prisma.memberType.findMany()
    const typeMap = new Map(memberTypes.map(mt => [mt.code, mt.id]))

    // Step 4: Update members without member_type_id
    const membersToUpdate = await prisma.$queryRaw<Array<{ id: string; member_type: string }>>`
      SELECT id, member_type
      FROM members
      WHERE member_type IS NOT NULL
        AND member_type != ''
        AND member_type_id IS NULL
    `

    console.log(`\nFound ${membersToUpdate.length} members to update`)

    let updated = 0
    for (const member of membersToUpdate) {
      const memberTypeId = typeMap.get(member.member_type)
      if (memberTypeId) {
        await prisma.member.update({
          where: { id: member.id },
          data: { memberTypeId }
        })
        updated++
      }
    }

    console.log(`Updated ${updated} members with member_type_id`)

    // Step 5: Verify
    const unlinked = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM members
      WHERE member_type IS NOT NULL
        AND member_type != ''
        AND member_type_id IS NULL
    `

    const unlinkedCount = Number(unlinked[0]?.count ?? 0)
    if (unlinkedCount > 0) {
      console.warn(`\n⚠️  Warning: ${unlinkedCount} members still have no member_type_id`)
    } else {
      console.log('\n✅ All members with member_type are now linked to MemberType')
    }

    // Summary
    const totalLinked = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM members
      WHERE member_type_id IS NOT NULL
    `
    console.log(`\nTotal members with member_type_id: ${Number(totalLinked[0]?.count ?? 0)}`)

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

migrateMemberTypes()
