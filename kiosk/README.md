# Sentinel Kiosk

Touch-friendly check-in interface for the Sentinel RFID attendance system.

## Features

- Large touch targets (56px minimum)
- Offline-first architecture
- NFC badge scanning
- Visitor sign-in flow
- Event selection for event visitors
- Audio feedback
- Sync status indicator

## Quick Start

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env

# Start development server
bun run dev
```

Open http://localhost:5174

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **IndexedDB (idb)** - Offline storage
- **Axios** - HTTP client

## Project Structure

```
kiosk/
├── public/
│   └── sounds/         # Audio feedback files
├── src/
│   ├── components/     # UI components
│   │   ├── NetworkIndicator.tsx
│   │   └── SyncStatus.tsx
│   ├── db/             # IndexedDB
│   │   └── queue.ts
│   ├── hooks/          # Custom hooks
│   │   └── useNetworkStatus.ts
│   ├── lib/            # Utilities
│   │   ├── api.ts
│   │   ├── audio.ts
│   │   └── config.ts
│   ├── screens/        # Screen components
│   │   ├── ErrorScreen.tsx
│   │   ├── EventSelectionScreen.tsx
│   │   ├── IdleScreen.tsx
│   │   ├── ScanningScreen.tsx
│   │   ├── SuccessScreen.tsx
│   │   └── VisitorScreen.tsx
│   ├── services/       # Business logic
│   │   ├── event-service.ts
│   │   ├── offline-queue.ts
│   │   └── sync-service.ts
│   ├── state/          # Zustand stores
│   │   ├── kiosk-state.ts
│   │   └── sync-state.ts
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

## Screen Flow

```
┌─────────────┐
│    Idle     │◀──────────────────────┐
│ "Tap Badge" │                       │
└──────┬──────┘                       │
       │ Badge Scan                   │
       ▼                              │
┌─────────────┐                       │
│  Scanning   │                       │
│ Processing  │                       │
└──────┬──────┘                       │
       │                              │
   ┌───┴───┐                          │
   ▼       ▼                          │
┌──────┐ ┌──────┐                     │
│Success│ │Error │                     │
│ Info  │ │ Help │──────────┐         │
└───┬───┘ └───┬──┘          │         │
    │         │             │         │
    └────┬────┘             │         │
         │ 5s timeout       │ Retry   │
         ▼                  ▼         │
         └──────────────────┴─────────┘
```

## Offline Support

### How It Works

1. **Online Mode**: Check-ins POST directly to backend
2. **Offline Mode**: Check-ins stored in IndexedDB queue
3. **Network Detection**: `navigator.onLine` + health ping every 30s
4. **Auto-Sync**: When connection restored, queue uploads automatically
5. **Conflict Resolution**: Backend validates timestamps, deduplicates

### Queue Storage

```typescript
interface QueuedCheckin {
  id: string;           // UUID
  serialNumber: string; // Badge serial
  kioskId: string;
  timestamp: Date;
  retryCount: number;
  createdAt: Date;
}
```

### Sync Process

1. Check queue size
2. Batch items (100 per request)
3. POST to `/api/checkins/bulk`
4. Remove synced items on success
5. Retry with exponential backoff on failure (5s, 15s, 45s, 2m max)

## Environment Variables

```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
VITE_KIOSK_ID=primary-entrance
```

## Audio Feedback

Place audio files in `public/sounds/`:
- `scan.mp3` - Badge detected
- `success.mp3` - Check-in successful
- `error.mp3` - Check-in failed

## Scripts

```bash
# Development server
bun run dev

# Production build
bun run build

# Type checking
bun run tsc --noEmit
```

## Deployment

### Raspberry Pi Kiosk Mode

1. Build the app: `bun run build`
2. Serve via nginx or static server
3. Configure Chromium kiosk mode:

```bash
chromium-browser --kiosk --disable-restore-session-state http://localhost:5174
```

### NFC Daemon

The NFC daemon runs separately to handle badge scans.
See `hardware/nfc-daemon/README.md` for setup.

## Design

- **Light mode only** - No dark theme
- **56px touch targets** - Accessible on touchscreen
- **Large fonts** - Readable at arm's length
- **High contrast** - WCAG AA compliant
- **Reduced animations** - Respects `prefers-reduced-motion`
