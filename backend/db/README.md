# Database Management Scripts

## Quick Start

```bash
# 1. Run migrations
bun run migrate

# 2. Seed development data
bun run seed

# 3. Create admin user (optional)
bun run create-admin --username=admin --firstName=John --lastName=Doe --email=admin@example.com --role=admin --password=secret123
```

## Scripts

### migrate.ts
Applies database migrations from `/backend/db/migrations/` directory.

**Features:**
- Creates `migrations` table to track applied migrations
- Skips already-applied migrations
- Applies migrations in alphabetical order
- Runs all SQL in a transaction (rollback on error)
- Exit code 1 on failure

**Usage:**
```bash
bun run migrate
```

**Output:**
```
Starting database migrations...

✓ Migrations table ready
- Skipping (already applied): 001_initial_schema.sql
✓ Applied migration: 002_add_events.sql

✓ Migration complete! Applied 1 migration(s)
```

### seed.ts
Populates database with development data from `/backend/db/seed/dev-data.sql`.

**Features:**
- Checks for existing data (fails if found)
- Imports seed data from SQL file
- Hashes admin password using bcrypt
- Displays summary of created records
- Exit code 1 on failure

**Usage:**
```bash
bun run seed
```

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

**Output:**
```
Starting database seeding...

Reading seed data file...
Executing seed data...
✓ Seed data applied from SQL file

Seed Summary:
  Divisions: 4
  Members: 26
  Badges: 50
  Admin Users: 2

✓ Database seeding complete!

Default admin credentials:
  Username: admin
  Password: admin123
```

### create-admin.ts
Interactive admin user creation script.

**Features:**
- Command-line argument parsing
- Email format validation
- Role validation (admin or viewer)
- Password strength check (min 8 chars)
- Duplicate username detection
- Bcrypt password hashing

**Usage:**
```bash
bun run create-admin \
  --username=jdoe \
  --firstName=Jane \
  --lastName=Doe \
  --email=jane.doe@example.com \
  --role=admin \
  --password=securepass123
```

**Required Arguments:**
- `--username` - Unique username
- `--firstName` - First name
- `--lastName` - Last name
- `--email` - Valid email address
- `--role` - Either `admin` or `viewer`
- `--password` - Minimum 8 characters

**Output:**
```
Creating admin user...

✓ Admin user created successfully!

User Details:
  ID: 12345678-1234-1234-1234-123456789012
  Username: jdoe
  Full Name: Jane Doe
  Email: jane.doe@example.com
  Role: admin
  Created: 2025-11-25T12:00:00.000Z
```

## Database Connection

All scripts use the connection pool from `/backend/src/db/connection.ts`.

**Environment Variables:**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sentinel
DB_USER=sentinel
DB_PASSWORD=sentinel
```

## Error Handling

All scripts:
- Throw errors early (no fallbacks)
- Log detailed error messages
- Exit with code 1 on failure
- Close database pool on completion

## Development Workflow

```bash
# Fresh database setup
dropdb sentinel && createdb sentinel
bun run migrate
bun run seed

# Add new admin user
bun run create-admin --username=viewer --firstName=Guest --lastName=User --email=guest@example.com --role=viewer --password=password123
```

## Migration Files

Place migration files in `/backend/db/migrations/`:
- Use format: `NNN_description.sql` (e.g., `001_initial_schema.sql`)
- Files are applied in alphabetical order
- Once applied, migrations are not re-run

## Seed Data

The seed file at `/backend/db/seed/dev-data.sql` contains:
- 4 divisions (Operations, Admin, Training, Command)
- 26 members (full-time and reserve)
- 50 badges (assigned and unassigned)
- 2 admin users
- Sample check-ins, visitors, events, and audit logs

**WARNING:** Never run seed data in production!
