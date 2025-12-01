#!/usr/bin/env bun
import { pool } from '../src/db/connection';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { hashPassword } from '../src/auth/password';

interface CountResult {
  count: string;
}

async function checkDataExists(): Promise<boolean> {
  const result = await pool.query<CountResult>('SELECT COUNT(*) as count FROM divisions');
  return parseInt(result.rows[0].count) > 0;
}

async function seedFromSQL(): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('Reading seed data file...');
    const seedFile = join(import.meta.dir, 'seed', 'dev-data.sql');
    const sql = await readFile(seedFile, 'utf-8');

    console.log('Executing seed data...');
    await client.query(sql);

    console.log('✓ Seed data applied from SQL file');
  } finally {
    client.release();
  }
}

async function createProgrammaticSeedData(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create divisions
    console.log('Creating divisions...');
    const divisions = [
      { name: 'Operations', code: 'OPS' },
      { name: 'Administration', code: 'ADMIN' },
      { name: 'Training', code: 'TRAIN' },
      { name: 'Command', code: 'CMD' },
      { name: 'Logistics', code: 'LOG' }
    ];

    const divisionIds: string[] = [];
    for (const div of divisions) {
      const result = await client.query(
        'INSERT INTO divisions (name, code) VALUES ($1, $2) RETURNING id',
        [div.name, div.code]
      );
      divisionIds.push(result.rows[0].id);
    }

    // Create members
    console.log('Creating members...');
    const members = [
      { serviceNumber: 'V100001', rank: 'CPO1', firstName: 'Sarah', lastName: 'MacDonald', divisionIdx: 0, type: 'full_time' },
      { serviceNumber: 'V100002', rank: 'PO1', firstName: 'James', lastName: 'Wilson', divisionIdx: 0, type: 'full_time' },
      { serviceNumber: 'V100003', rank: 'PO2', firstName: 'Emily', lastName: 'Chen', divisionIdx: 0, type: 'full_time' },
      { serviceNumber: 'V100004', rank: 'MS', firstName: 'Michael', lastName: 'Brown', divisionIdx: 0, type: 'full_time' },
      { serviceNumber: 'V100005', rank: 'LS', firstName: 'Amanda', lastName: 'Taylor', divisionIdx: 0, type: 'full_time' },
      { serviceNumber: 'V100006', rank: 'PO2', firstName: 'Jennifer', lastName: 'Lee', divisionIdx: 0, type: 'reserve' },
      { serviceNumber: 'V100007', rank: 'MS', firstName: 'Robert', lastName: 'Martinez', divisionIdx: 0, type: 'reserve' },
      { serviceNumber: 'V100008', rank: 'LS', firstName: 'Lisa', lastName: 'Anderson', divisionIdx: 0, type: 'reserve' },
      { serviceNumber: 'V100009', rank: 'CPO2', firstName: 'Thomas', lastName: 'White', divisionIdx: 1, type: 'full_time' },
      { serviceNumber: 'V100010', rank: 'PO1', firstName: 'Michelle', lastName: 'Garcia', divisionIdx: 1, type: 'full_time' },
      { serviceNumber: 'V100011', rank: 'PO2', firstName: 'Christopher', lastName: 'Davis', divisionIdx: 1, type: 'full_time' },
      { serviceNumber: 'V100012', rank: 'MS', firstName: 'Jessica', lastName: 'Miller', divisionIdx: 1, type: 'full_time' },
      { serviceNumber: 'V100013', rank: 'LS', firstName: 'Daniel', lastName: 'Wilson', divisionIdx: 1, type: 'reserve' },
      { serviceNumber: 'V100014', rank: 'AB', firstName: 'Ashley', lastName: 'Moore', divisionIdx: 1, type: 'reserve' },
      { serviceNumber: 'V100015', rank: 'LCdr', firstName: 'Kevin', lastName: 'Thompson', divisionIdx: 2, type: 'full_time' },
      { serviceNumber: 'V100016', rank: 'Lt(N)', firstName: 'Rachel', lastName: 'Harris', divisionIdx: 2, type: 'full_time' },
      { serviceNumber: 'V100017', rank: 'CPO2', firstName: 'Brian', lastName: 'Martin', divisionIdx: 2, type: 'full_time' },
      { serviceNumber: 'V100018', rank: 'PO1', firstName: 'Nicole', lastName: 'Jackson', divisionIdx: 2, type: 'full_time' },
      { serviceNumber: 'V100019', rank: 'PO2', firstName: 'Steven', lastName: 'Lewis', divisionIdx: 2, type: 'reserve' },
      { serviceNumber: 'V100020', rank: 'MS', firstName: 'Kimberly', lastName: 'Walker', divisionIdx: 2, type: 'reserve' },
      { serviceNumber: 'V100021', rank: 'Cdr', firstName: 'William', lastName: 'Hall', divisionIdx: 3, type: 'full_time' },
      { serviceNumber: 'V100022', rank: 'LCdr', firstName: 'Elizabeth', lastName: 'Allen', divisionIdx: 3, type: 'full_time' },
      { serviceNumber: 'V100023', rank: 'Lt(N)', firstName: 'Matthew', lastName: 'Young', divisionIdx: 3, type: 'full_time' },
      { serviceNumber: 'V100024', rank: 'CPO1', firstName: 'Samantha', lastName: 'King', divisionIdx: 3, type: 'full_time' },
      { serviceNumber: 'V100025', rank: 'PO1', firstName: 'David', lastName: 'Johnson', divisionIdx: 4, type: 'full_time' }
    ];

    const memberIds: string[] = [];
    for (const member of members) {
      const result = await client.query(
        `INSERT INTO members (service_number, rank, first_name, last_name, division_id, member_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING id`,
        [member.serviceNumber, member.rank, member.firstName, member.lastName, divisionIds[member.divisionIdx], member.type]
      );
      memberIds.push(result.rows[0].id);
    }

    // Create badges
    console.log('Creating badges...');
    const badgeSerials = [];

    // Member badges (25)
    for (let i = 0; i < 25; i++) {
      const serial = `NFC-${String(i + 1).padStart(3, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      badgeSerials.push(serial);
      await client.query(
        'INSERT INTO badges (serial_number, assignment_type, assigned_to_id, status) VALUES ($1, $2, $3, $4)',
        [serial, 'member', memberIds[i], 'active']
      );
    }

    // Unassigned badges (25)
    for (let i = 0; i < 25; i++) {
      const serial = `NFC-TEMP-${String(i + 1).padStart(3, '0')}`;
      await client.query(
        'INSERT INTO badges (serial_number, assignment_type, assigned_to_id, status) VALUES ($1, $2, $3, $4)',
        [serial, 'unassigned', null, 'active']
      );
    }

    // Create admin user
    // HIGH-2 FIX: Use password that meets security policy
    // Password must be at least 12 chars with uppercase, lowercase, number, and special character
    console.log('Creating admin user...');
    const seedPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!seedPassword) {
      throw new Error('SEED_ADMIN_PASSWORD environment variable required for seeding');
    }
    const passwordHash = await hashPassword(seedPassword);
    await client.query(
      'INSERT INTO admin_users (username, password_hash, full_name, role, email) VALUES ($1, $2, $3, $4, $5)',
      ['admin', passwordHash, 'System Administrator', 'admin', 'admin@chippawa.local']
    );

    await client.query('COMMIT');
    console.log('✓ Programmatic seed data created');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runSeed(): Promise<void> {
  try {
    console.log('Starting database seeding...\n');

    // Check if data already exists
    const hasData = await checkDataExists();

    if (hasData) {
      throw new Error('Database already contains data. Drop and recreate the database before seeding.');
    }

    // Use SQL file - fail if it doesn't exist
    await seedFromSQL();

    // Verify results
    const divisionCount = await pool.query<CountResult>('SELECT COUNT(*) as count FROM divisions');
    const memberCount = await pool.query<CountResult>('SELECT COUNT(*) as count FROM members');
    const badgeCount = await pool.query<CountResult>('SELECT COUNT(*) as count FROM badges');
    const adminCount = await pool.query<CountResult>('SELECT COUNT(*) as count FROM admin_users');

    console.log('\nSeed Summary:');
    console.log(`  Divisions: ${divisionCount.rows[0].count}`);
    console.log(`  Members: ${memberCount.rows[0].count}`);
    console.log(`  Badges: ${badgeCount.rows[0].count}`);
    console.log(`  Admin Users: ${adminCount.rows[0].count}`);
    console.log('\n✓ Database seeding complete!');
    console.log('\nDefault admin credentials:');
    console.log('  Username: admin');
    console.log('  Password: (set via SEED_ADMIN_PASSWORD env var)');
  } catch (error) {
    console.error('\n✗ Seeding failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.message.includes('ENOENT')) {
      console.error('\nThe seed file backend/db/seed/dev-data.sql was not found.');
      console.error('Please ensure the file exists or use createProgrammaticSeedData() instead.');
    }
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seed
runSeed().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
