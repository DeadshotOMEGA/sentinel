#!/usr/bin/env bun
/**
 * Script to normalize existing member names from ALL CAPS to proper case
 *
 * Usage: cd backend && bun run scripts/normalize-names.ts
 *
 * Options:
 *   --dry-run    Preview changes without applying them
 *   --verbose    Show all members, not just those with changes
 */

import { pool } from '../src/db/connection';
import { normalizeName } from '../src/utils/name-normalizer';

interface MemberRow {
  id: string;
  first_name: string;
  last_name: string;
}

async function normalizeNames() {
  const isDryRun = process.argv.includes('--dry-run');
  const isVerbose = process.argv.includes('--verbose');

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           Member Name Normalization Script                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Fetch all members
  const result = await pool.query<MemberRow>(`
    SELECT id, first_name, last_name
    FROM members
    ORDER BY last_name, first_name
  `);

  const members = result.rows;
  console.log(`Found ${members.length} members to check\n`);

  let changesCount = 0;
  const changes: Array<{
    id: string;
    oldFirst: string;
    newFirst: string;
    oldLast: string;
    newLast: string;
  }> = [];

  for (const member of members) {
    const newFirstName = normalizeName(member.first_name);
    const newLastName = normalizeName(member.last_name);

    const firstChanged = newFirstName !== member.first_name;
    const lastChanged = newLastName !== member.last_name;

    if (firstChanged || lastChanged) {
      changesCount++;
      changes.push({
        id: member.id,
        oldFirst: member.first_name,
        newFirst: newFirstName,
        oldLast: member.last_name,
        newLast: newLastName,
      });

      console.log(`  ${member.last_name}, ${member.first_name}`);
      console.log(`    → ${newLastName}, ${newFirstName}`);
      console.log('');
    } else if (isVerbose) {
      console.log(`  ✓ ${member.last_name}, ${member.first_name} (no change)`);
    }
  }

  console.log('────────────────────────────────────────────────────────────────');
  console.log(`Total members: ${members.length}`);
  console.log(`Members to update: ${changesCount}`);
  console.log('');

  if (changesCount === 0) {
    console.log('✅ All names are already properly formatted!');
    await pool.end();
    return;
  }

  if (isDryRun) {
    console.log('ℹ️  Run without --dry-run to apply these changes');
    await pool.end();
    return;
  }

  // Apply changes
  console.log('Applying changes...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const change of changes) {
    try {
      await pool.query(
        `UPDATE members SET first_name = $1, last_name = $2, updated_at = NOW() WHERE id = $3`,
        [change.newFirst, change.newLast, change.id]
      );
      successCount++;
    } catch (error: unknown) {
      errorCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Error updating ${change.oldLast}, ${change.oldFirst}: ${errorMessage}`);
      // Continue processing other members even if one fails
    }
  }

  console.log('────────────────────────────────────────────────────────────────');
  console.log(`✅ Successfully updated: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount}`);
  }
  console.log('');

  await pool.end();
}

normalizeNames().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Script failed: ${errorMessage}`);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
