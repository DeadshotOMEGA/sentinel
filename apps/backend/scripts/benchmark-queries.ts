/**
 * Benchmark Script for Prisma Query Performance
 *
 * Purpose: Determine if Kysely optimization is needed (target: < 100ms for complex queries)
 *
 * Usage: pnpm tsx scripts/benchmark-queries.ts
 */

import { performance } from 'perf_hooks'
import { getPrismaClient } from '../src/lib/database.js'

const prisma = getPrismaClient()

interface BenchmarkResult {
  name: string
  duration: number
  status: 'OK' | 'SLOW' | 'VERY_SLOW'
}

const THRESHOLD_OK = 100 // ms
const THRESHOLD_SLOW = 200 // ms

async function benchmark(name: string, fn: () => Promise<any>): Promise<BenchmarkResult> {
  // Warm up
  await fn()

  // Run benchmark (average of 5 runs)
  const runs = 5
  let totalDuration = 0

  for (let i = 0; i < runs; i++) {
    const start = performance.now()
    await fn()
    const end = performance.now()
    totalDuration += end - start
  }

  const avgDuration = totalDuration / runs

  const status =
    avgDuration < THRESHOLD_OK ? 'OK' : avgDuration < THRESHOLD_SLOW ? 'SLOW' : 'VERY_SLOW'

  return { name, duration: avgDuration, status }
}

async function runBenchmarks() {
  console.log('🔍 Benchmarking Prisma Query Performance\n')
  console.log(
    `Thresholds: OK < ${THRESHOLD_OK}ms, SLOW < ${THRESHOLD_SLOW}ms, VERY_SLOW >= ${THRESHOLD_SLOW}ms\n`
  )

  const results: BenchmarkResult[] = []

  // 1. Simple query - findMany with limit
  results.push(
    await benchmark('Simple findMany (limit 50)', async () => {
      await prisma.member.findMany({ take: 50 })
    })
  )

  // 2. Query with single relation
  results.push(
    await benchmark('findMany with division relation', async () => {
      await prisma.member.findMany({
        take: 50,
        include: { division: true },
      })
    })
  )

  // 3. Query with join strategy
  results.push(
    await benchmark('findMany with join strategy', async () => {
      await prisma.member.findMany({
        take: 50,
        relationLoadStrategy: 'join' as const,
        include: { division: true },
      })
    })
  )

  // 4. Complex query with multiple relations
  results.push(
    await benchmark('Complex query (member + division + checkins)', async () => {
      await prisma.member.findMany({
        take: 20,
        relationLoadStrategy: 'join' as const,
        include: {
          division: true,
          checkins: {
            take: 10,
            orderBy: { timestamp: 'desc' },
          },
        },
      })
    })
  )

  // 5. Aggregation query
  results.push(
    await benchmark('Count query with filter', async () => {
      await prisma.checkin.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      })
    })
  )

  // 6. Nested query
  results.push(
    await benchmark('Nested query (division with members)', async () => {
      await prisma.division.findMany({
        take: 10,
        include: {
          members: {
            take: 50,
          },
        },
      })
    })
  )

  // 7. Checkin with member and badge
  results.push(
    await benchmark('Checkin with member and badge relations', async () => {
      await prisma.checkin.findMany({
        take: 50,
        relationLoadStrategy: 'join' as const,
        include: {
          member: {
            include: {
              division: true,
            },
          },
          badge: true,
        },
      })
    })
  )

  // Print results
  console.log('\n📊 Benchmark Results:\n')
  console.log('┌────────────────────────────────────────────────────────┬──────────┬──────────┐')
  console.log('│ Query                                                  │ Avg (ms) │ Status   │')
  console.log('├────────────────────────────────────────────────────────┼──────────┼──────────┤')

  results.forEach((result) => {
    const statusSymbol = result.status === 'OK' ? '✅' : result.status === 'SLOW' ? '⚠️ ' : '❌'
    const name = result.name.padEnd(54)
    const duration = result.duration.toFixed(2).padStart(8)
    const status = (statusSymbol + ' ' + result.status).padEnd(8)
    console.log(`│ ${name} │ ${duration} │ ${status} │`)
  })

  console.log('└────────────────────────────────────────────────────────┴──────────┴──────────┘')

  // Summary
  const slowQueries = results.filter((r) => r.status === 'SLOW' || r.status === 'VERY_SLOW')
  const verySlow = results.filter((r) => r.status === 'VERY_SLOW')

  console.log('\n📈 Summary:\n')
  console.log(`Total queries benchmarked: ${results.length}`)
  console.log(`OK (< ${THRESHOLD_OK}ms): ${results.filter((r) => r.status === 'OK').length}`)
  console.log(
    `SLOW (${THRESHOLD_OK}-${THRESHOLD_SLOW}ms): ${results.filter((r) => r.status === 'SLOW').length}`
  )
  console.log(`VERY SLOW (>= ${THRESHOLD_SLOW}ms): ${verySlow.length}`)

  console.log('\n💡 Recommendations:\n')
  if (verySlow.length > 0) {
    console.log('❌ CRITICAL: Some queries are very slow (>= 200ms)')
    console.log('   → Kysely optimization is RECOMMENDED for these queries:')
    verySlow.forEach((r) => console.log(`     - ${r.name} (${r.duration.toFixed(2)}ms)`))
  } else if (slowQueries.length > 0) {
    console.log('⚠️  WARNING: Some queries are slow (100-200ms)')
    console.log('   → Consider Kysely optimization if performance is critical:')
    slowQueries.forEach((r) => console.log(`     - ${r.name} (${r.duration.toFixed(2)}ms)`))
  } else {
    console.log('✅ All queries are performing well (< 100ms)')
    console.log('   → Kysely optimization is NOT needed at this time')
  }

  await prisma.$disconnect()
}

runBenchmarks().catch((error) => {
  console.error('Error running benchmarks:', error)
  process.exit(1)
})
