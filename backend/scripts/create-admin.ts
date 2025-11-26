#!/usr/bin/env bun
import { pool } from '../src/db/connection';
import { hashPassword } from '../src/auth/password';

interface Args {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  password?: string;
}

interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  role: string;
  created_at: Date;
}

function parseArgs(): Args {
  const args: Args = {};

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      if (key && value) {
        args[key as keyof Args] = value;
      }
    }
  }

  return args;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateRole(role: string): boolean {
  return role === 'admin' || role === 'viewer';
}

function validateArgs(args: Args): void {
  const errors: string[] = [];

  if (!args.username || args.username.trim() === '') {
    errors.push('Username is required (--username)');
  }

  if (!args.firstName || args.firstName.trim() === '') {
    errors.push('First name is required (--firstName)');
  }

  if (!args.lastName || args.lastName.trim() === '') {
    errors.push('Last name is required (--lastName)');
  }

  if (!args.email || args.email.trim() === '') {
    errors.push('Email is required (--email)');
  } else if (!validateEmail(args.email)) {
    errors.push('Invalid email format');
  }

  if (!args.role || args.role.trim() === '') {
    errors.push('Role is required (--role)');
  } else if (!validateRole(args.role)) {
    errors.push('Invalid role (must be "admin" or "viewer")');
  }

  if (!args.password || args.password.trim() === '') {
    errors.push('Password is required (--password)');
  } else if (args.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (errors.length > 0) {
    console.error('✗ Validation errors:\n');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\nUsage:');
    console.error('  bun run scripts/create-admin.ts --username=admin --firstName=John --lastName=Doe --email=admin@example.com --role=admin --password=secret123\n');
    process.exit(1);
  }
}

async function checkUsernameExists(username: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM admin_users WHERE username = $1',
    [username]
  );

  return result.rows.length > 0;
}

async function createAdmin(args: Args): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('Creating admin user...\n');

    // Check if username already exists
    const exists = await checkUsernameExists(args.username!);
    if (exists) {
      throw new Error(`Username "${args.username}" already exists`);
    }

    // Hash password
    const passwordHash = await hashPassword(args.password!);

    // Create full name
    const fullName = `${args.firstName} ${args.lastName}`;

    // Insert admin user
    const result = await client.query<AdminUser>(
      `INSERT INTO admin_users (username, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, full_name, role, created_at`,
      [args.username, passwordHash, fullName, args.role]
    );

    const user = result.rows[0];

    console.log('✓ Admin user created successfully!\n');
    console.log('User Details:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Full Name: ${user.full_name}`);
    console.log(`  Email: ${args.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Created: ${user.created_at}`);
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  try {
    const args = parseArgs();
    validateArgs(args);
    await createAdmin(args);
  } catch (error) {
    console.error('\n✗ Failed to create admin user:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await pool.end();
  }
}

// Run script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
