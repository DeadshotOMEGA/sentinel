# Sentinel TV Display

Passive wall-mounted display for the Sentinel RFID attendance system.

## Features

- 10-foot UI (readable from distance)
- Real-time presence stats
- Activity feed with auto-scroll
- Division breakdown
- Event-specific view mode
- No interactive elements

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Open http://localhost:5175

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Socket.IO** - Real-time updates
- **Tailwind CSS** - Styling
- **date-fns** - Date formatting

## Project Structure

```
tv-display/
├── src/
│   ├── components/
│   │   ├── ActivityFeed.tsx      # Recent check-ins
│   │   ├── Clock.tsx             # Time/date display
│   │   ├── ConnectionStatus.tsx  # WebSocket indicator
│   │   ├── DivisionStats.tsx     # Division breakdown
│   │   ├── EventPresenceCards.tsx # Event KPIs
│   │   └── PresenceCards.tsx     # Main KPIs
│   ├── hooks/
│   │   ├── useActivityFeed.ts
│   │   ├── useEventPresenceData.ts
│   │   └── usePresenceData.ts
│   ├── lib/
│   │   └── config.ts             # TV configuration
│   ├── pages/
│   │   ├── EventView.tsx         # Event-only mode
│   │   └── PresenceView.tsx      # Default view
│   ├── types/
│   │   └── activity.ts
│   ├── App.tsx
│   ├── index.css                 # TV-specific styles
│   └── main.tsx
├── tv-config.json                # Runtime configuration
└── package.json
```

## Display Modes

### Unit Overview (Default)

Shows overall unit attendance:
- Present/Absent/Visitors KPIs
- Division breakdown
- Activity feed
- Clock

### Event-Only

Shows single event attendance:
- Event name header
- Present/Away/Pending KPIs
- Attendee list
- Activity feed

Configure via `tv-config.json`:

```json
{
  "displayMode": "event-only",
  "eventId": "uuid-of-event",
  "eventName": "Annual Training"
}
```

## Configuration

Edit `tv-config.json`:

```json
{
  "displayMode": "unit-overview",
  "refreshInterval": 60000,
  "activityFeedEnabled": true,
  "apiUrl": "http://localhost:3000/api",
  "wsUrl": "http://localhost:3000",
  "eventId": null,
  "eventName": null
}
```

### Options

| Key | Values | Description |
|-----|--------|-------------|
| `displayMode` | `unit-overview`, `event-only` | Display mode |
| `refreshInterval` | Number (ms) | Data refresh interval |
| `activityFeedEnabled` | Boolean | Show activity feed |
| `eventId` | UUID or null | Event to display |
| `eventName` | String or null | Event display name |

## TV Mode CSS

The display uses special CSS for TV viewing:

```css
.tv-mode {
  cursor: default;        /* No pointer */
  font-size: 2rem;        /* Large base font */
}

/* No hover states */
.tv-mode button:hover,
.tv-mode a:hover {
  background-color: inherit;
  transform: none;
}

/* Large KPI values */
.kpi-stat-value {
  font-size: 5rem;
  font-weight: 700;
}
```

## WebSocket Events

Subscribes to:
- `presence_update` - Unit presence stats
- `checkin` - Individual check-ins
- `visitor_signin` - Visitor arrivals
- `event_presence_update` - Event stats (event mode)

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

### Raspberry Pi TV Mode

1. Build the app: `bun run build`
2. Serve via nginx
3. Configure Chromium fullscreen:

```bash
chromium-browser --kiosk --start-fullscreen http://localhost:5175
```

### Auto-start on Boot

Add to `/etc/xdg/lxsession/LXDE-pi/autostart`:

```
@chromium-browser --kiosk --start-fullscreen http://localhost:5175
```

## Design

- **Light mode only** - No dark theme
- **No interactivity** - Passive display
- **10-foot viewing** - Large fonts, high contrast
- **Auto-reconnect** - WebSocket reconnection
- **Memory efficient** - Runs 24/7 without leaks
