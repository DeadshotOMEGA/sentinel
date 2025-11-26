# Sentinel Backend

Express API server with WebSocket support for the Sentinel RFID attendance system.

## Features

- REST API with Zod validation
- WebSocket (Socket.IO) for real-time updates
- PostgreSQL database with repository pattern
- Redis for sessions and caching
- JWT authentication

## Quick Start

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
bun run db/migrate.ts

# Seed development data
bun run db/seed.ts

# Start development server
bun run dev
```

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/sentinel
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
PORT=3000
NODE_ENV=development
```

## Project Structure

```
backend/
├── db/
│   ├── migrations/     # SQL migration files
│   ├── seed/           # Development seed data
│   ├── migrate.ts      # Migration runner
│   └── seed.ts         # Seed script
├── src/
│   ├── auth/           # Authentication (JWT, sessions, middleware)
│   ├── db/
│   │   ├── repositories/  # Database access layer
│   │   ├── connection.ts  # PostgreSQL pool
│   │   └── redis.ts       # Redis client
│   ├── middleware/     # Express middleware
│   ├── routes/         # API endpoints
│   ├── services/       # Business logic
│   ├── utils/          # Helpers and errors
│   ├── websocket/      # Socket.IO server
│   └── server.ts       # Entry point
└── package.json
```

## API Routes

See `API_ROUTES.md` for complete documentation.

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### Members
- `GET /api/members` - List members
- `POST /api/members` - Create member
- `GET /api/members/:id` - Get member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

### Check-ins
- `POST /api/checkins` - Record check-in (badge scan)
- `POST /api/checkins/bulk` - Bulk sync (offline queue)
- `GET /api/checkins/presence` - Current presence stats
- `GET /api/checkins/presence/list` - Member presence list

### Visitors
- `GET /api/visitors` - List visitors
- `GET /api/visitors/active` - Currently signed in
- `POST /api/visitors` - Sign in visitor
- `PUT /api/visitors/:id/checkout` - Sign out visitor

### Badges
- `GET /api/badges` - List badges
- `POST /api/badges` - Register badge
- `PUT /api/badges/:id/assign` - Assign to member
- `PUT /api/badges/:id/unassign` - Unassign badge

### Divisions
- `GET /api/divisions` - List divisions
- `POST /api/divisions` - Create division
- `PUT /api/divisions/:id` - Update division

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event details
- `GET /api/events/:id/attendees` - List attendees
- `POST /api/events/:id/attendees` - Add attendee
- `PUT /api/events/:id/attendees/:aid/assign-badge` - Assign badge
- `POST /api/events/:id/close` - Close event

## WebSocket Events

### Server → Client
- `checkin` - Member check-in/out
- `presence_update` - Stats update
- `visitor_signin` - Visitor arrival
- `event_checkin` - Event attendee check-in

### Client → Server
- `subscribe_presence` - Subscribe to presence updates
- `subscribe_event` - Subscribe to event updates

## Database

### Tables
- `members` - Unit personnel
- `divisions` - Organizational units
- `badges` - NFC cards
- `checkins` - Attendance records
- `visitors` - Non-member access
- `admin_users` - Dashboard users
- `audit_log` - Action history
- `events` - Special events
- `event_attendees` - Event participants
- `event_checkins` - Event attendance

### Migrations

```bash
# Run pending migrations
bun run db/migrate.ts

# Create new migration
# Add file: db/migrations/XXX_description.sql
```

## Scripts

```bash
# Development server with hot reload
bun run dev

# Type checking
bun run tsc --noEmit

# Create admin user
bun run scripts/create-admin.ts
```
