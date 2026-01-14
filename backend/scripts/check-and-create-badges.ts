#!/usr/bin/env bun
/**
 * Script to check existing badges and create test badges for members without them
 */
import { pool } from '../src/db/connection';

interface CountResult {
  count: string;
}

interface MemberRow {
  id: string;
  service_number: string;
  first_name: string;
  last_name: string;
  badge_id: string | null;
}

interface BadgeRow {
  id: string;
  serial_number: string;
  assignment_type: string;
  assigned_to_id: string | null;
  status: string;
}

async function main() {
  const client = await pool.connect();

  try {
    // 1. Check current badge count
    console.log('\n=== Current Database Status ===\n');

    const badgeCount = await client.query<CountResult>('SELECT COUNT(*) as count FROM badges');
    console.log(`Total Badges: ${badgeCount.rows[0].count}`);

    const memberCount = await client.query<CountResult>('SELECT COUNT(*) as count FROM members');
    console.log(`Total Members: ${memberCount.rows[0].count}`);

    // 2. Check members without badges
    const membersWithoutBadges = await client.query<MemberRow>(`
      SELECT id, service_number, first_name, last_name, badge_id
      FROM members
      WHERE badge_id IS NULL
      ORDER BY service_number
    `);
    console.log(`\nMembers without badges: ${membersWithoutBadges.rowCount}`);

    // 3. Show existing badges
    const existingBadges = await client.query<BadgeRow>(`
      SELECT id, serial_number, assignment_type, assigned_to_id, status
      FROM badges
      ORDER BY serial_number
      LIMIT 10
    `);
    console.log(`\nSample of existing badges (first 10):`);
    for (const badge of existingBadges.rows) {
      console.log(`  - ${badge.serial_number} (${badge.assignment_type}, ${badge.status})`);
    }

    // 4. Ask if we should create test badges
    if (membersWithoutBadges.rowCount && membersWithoutBadges.rowCount > 0) {
      console.log(`\n=== Creating Test Badges ===\n`);
      console.log(`Creating ${membersWithoutBadges.rowCount} test badges for members without badges...\n`);

      await client.query('BEGIN');

      for (const member of membersWithoutBadges.rows) {
        const serialNumber = `TEST-BADGE-${member.service_number}`;

        // Create badge
        const badgeResult = await client.query<{ id: string }>(
          `INSERT INTO badges (serial_number, assignment_type, assigned_to_id, status)
           VALUES ($1, 'member', $2, 'active')
           RETURNING id`,
          [serialNumber, member.id]
        );

        // Update member with badge_id
        await client.query(
          `UPDATE members SET badge_id = $1, updated_at = NOW() WHERE id = $2`,
          [badgeResult.rows[0].id, member.id]
        );

        console.log(`  Created badge ${serialNumber} for ${member.first_name} ${member.last_name}`);
      }

      await client.query('COMMIT');
      console.log(`\n✓ Successfully created and assigned ${membersWithoutBadges.rowCount} test badges!`);
    } else {
      console.log('\nAll members already have badges assigned.');
    }

    // 5. Final counts
    console.log('\n=== Final Status ===\n');
    const finalBadgeCount = await client.query<CountResult>('SELECT COUNT(*) as count FROM badges');
    const finalMembersWithBadges = await client.query<CountResult>(
      'SELECT COUNT(*) as count FROM members WHERE badge_id IS NOT NULL'
    );
    console.log(`Total Badges: ${finalBadgeCount.rows[0].count}`);
    console.log(`Members with badges: ${finalMembersWithBadges.rows[0].count}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
