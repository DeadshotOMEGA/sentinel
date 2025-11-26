# Sentinel

RFID attendance tracking system for HMCS Chippawa (Royal Canadian Navy reserve unit).

## Overview

Sentinel provides automated attendance tracking using NFC/RFID badges with:
- **Kiosk Interface** - Touch-friendly check-in at building entrances
- **Admin Dashboard** - Member management, reports, and real-time monitoring
- **TV Display** - Wall-mounted passive display showing live attendance
- **Offline Support** - Kiosks continue working without network connectivity

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Kiosk (Pi)    │────▶│  Backend (Pi)   │◀────│  TV Display     │
│   + NFC HAT     │     │  Express + WS   │     │  (Wall Mount)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────┴────────┐
                        │                 │
                   ┌────▼────┐      ┌─────▼─────┐
                   │ Postgres│      │   Redis   │
                   │   DB    │      │  Sessions │
                   └─────────┘      └───────────┘
                        │
               ┌────────┴────────┐
               │  Admin Dashboard │
               │   (Browser)      │
               └──────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | [Bun](https://bun.sh) |
| Backend | Express + Socket.IO + Zod |
| Database | PostgreSQL |
| Cache | Redis |
| Frontend | React + TypeScript + Vite |
| UI | [HeroUI](https://heroui.com) + Tailwind CSS |
| State | Zustand + React Query |
| Offline | IndexedDB |

## Applications

| App | Port | Description |
|-----|------|-------------|
| `backend` | 3000 | REST API + WebSocket server |
| `frontend` | 5173 | Admin dashboard |
| `kiosk` | 5174 | Touch check-in interface |
| `tv-display` | 5175 | Passive wall display |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- PostgreSQL >= 14
- Redis >= 6

### Installation

```bash
# Clone repository
git clone https://github.com/DeadshotOMEGA/sentinel.git
cd sentinel

# Install dependencies for all apps
cd backend && bun install && cd ..
cd frontend && bun install && cd ..
cd kiosk && bun install && cd ..
cd tv-display && bun install && cd ..

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# Run database migrations
cd backend && bun run db/migrate.ts

# Seed development data (optional)
cd backend && bun run db/seed.ts
```

### Development

```bash
# Terminal 1: Backend
cd backend && bun run dev

# Terminal 2: Admin Dashboard
cd frontend && bun run dev

# Terminal 3: Kiosk (optional)
cd kiosk && bun run dev

# Terminal 4: TV Display (optional)
cd tv-display && bun run dev
```

## Features

### Member Management
- CRUD operations for unit members
- Division assignments
- Badge assignment workflow
- Bulk import from Excel/CSV

### Attendance Tracking
- NFC badge scan check-in/out
- Auto-detect direction (in/out)
- Real-time presence stats
- Historical reports with export

### Visitor Management
- Sign-in/out workflow
- Visit type categorization
- Host member assignment
- Visitor log reports

### Events & Temporary Access
- Event creation with date ranges
- Attendee management
- Temporary badge assignment
- Event-specific monitoring

### Offline Support (Kiosk)
- IndexedDB queue for offline scans
- Automatic sync on reconnection
- Conflict resolution
- Status indicators

## Hardware

| Device | Hardware | Purpose |
|--------|----------|---------|
| Server | Raspberry Pi 5 (8GB) | Backend + Database |
| Kiosk | Pi 5 + PN532 NFC HAT + 10.1" Touch | Primary entrance |
| Scanner | Pi 5 + PN532 NFC HAT | Rear door (audio only) |
| Display | Any HDMI display | Wall-mounted TV |

### NFC Daemon

The hardware NFC daemon runs on kiosk devices:

```bash
cd hardware/nfc-daemon
bun install
sudo bun run src/main.ts
```

See `hardware/nfc-daemon/README.md` for systemd service setup.

## API Documentation

See `backend/API_ROUTES.md` for complete API reference.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/members` | List members |
| POST | `/api/checkins` | Record check-in |
| POST | `/api/checkins/bulk` | Bulk sync (offline) |
| GET | `/api/checkins/presence` | Current stats |
| GET | `/api/visitors/active` | Active visitors |

## Project Structure

```
sentinel/
├── backend/           # Express API server
│   ├── db/            # Migrations and seeds
│   ├── src/
│   │   ├── auth/      # Authentication
│   │   ├── db/        # Database repositories
│   │   ├── routes/    # API endpoints
│   │   └── websocket/ # Real-time events
│   └── package.json
├── frontend/          # Admin dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── lib/
│   └── package.json
├── kiosk/             # Check-in interface
│   ├── src/
│   │   ├── screens/
│   │   ├── services/
│   │   └── state/
│   └── package.json
├── tv-display/        # Wall display
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   └── package.json
├── hardware/          # NFC daemon
│   └── nfc-daemon/
├── shared/            # TypeScript types
│   └── types/
└── docs/              # Documentation
```

## Configuration

### Backend Environment

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sentinel

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret

# Server
PORT=3000
NODE_ENV=development
```

### Kiosk Configuration

```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
VITE_KIOSK_ID=primary-entrance
```

### TV Display Configuration

Edit `tv-display/tv-config.json`:

```json
{
  "displayMode": "unit-overview",
  "refreshInterval": 60000,
  "activityFeedEnabled": true,
  "eventId": null
}
```

## Contributing

1. Use `bun` for all package management
2. Follow TypeScript strict mode (no `any` types)
3. Throw errors early - no silent fallbacks
4. Light mode only - no dark theme
5. WCAG AA accessibility (4.5:1 contrast)

## License

Private - HMCS Chippawa internal use only.
