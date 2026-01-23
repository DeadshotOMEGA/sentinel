#!/usr/bin/env tsx

import { PrismaClient } from '@sentinel/database'

async function testConnection() {
  // Ensure DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://sentinel:sentinel@localhost:5432/sentinel'
  }

  const prisma = new PrismaClient({
    log: ['error'],
  })

  try {
    console.log('Testing database connection...')

    // Test connection
    await prisma.$connect()
    console.log('✅ Connected to database successfully')

    // Check if tables exist
    const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations' ORDER BY tablename`
    )

    console.log(`\n📊 Found ${tables.length} tables in database:`)
    tables.forEach((t: { tablename: string }) => console.log(`   - ${t.tablename}`))

    // Check if schema matches our Prisma schema
    const expectedTables = [
      'admin_users', 'audit_log', 'badges', 'bmq_courses', 'bmq_enrollments',
      'checkins', 'dds_assignments', 'divisions', 'event_attendees',
      'event_checkins', 'events', 'member_tags', 'members',
      'report_audit_log', 'report_settings', 'responsibility_audit_log',
      'security_alerts', 'tags', 'training_years', 'visitors'
    ]

    const tableNames = tables.map((t: { tablename: string }) => t.tablename)
    const missingTables = expectedTables.filter((t: string) => !tableNames.includes(t))

    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing tables (need to run migrations):`)
      missingTables.forEach((t) => console.log(`   - ${t}`))
    } else {
      console.log(`\n✅ All expected tables exist`)
    }

    // Check for _prisma_migrations table
    const migrationTable = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_prisma_migrations') as exists`
    )

    const firstRow = migrationTable[0]
    if (firstRow && firstRow.exists) {
      const migrations = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
        `SELECT migration_name FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 5`
      )
      console.log(`\n📝 Recent migrations:`)
      migrations.forEach((m: { migration_name: string }) => console.log(`   - ${m.migration_name}`))
    } else {
      console.log(`\n⚠️  No _prisma_migrations table found (database not initialized with Prisma)`)
    }

  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
