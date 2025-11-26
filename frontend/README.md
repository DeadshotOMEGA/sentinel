# Sentinel Frontend

React admin dashboard for HMCS Chippawa RFID attendance system.

## Tech Stack

- **React 18** with TypeScript
- **Vite** - Fast build tool
- **HeroUI** - Component library with Tailwind
- **React Router** - Client-side routing
- **Zustand** - State management
- **TanStack Query** - Server state management
- **Axios** - HTTP client
- **Socket.IO** - Real-time updates

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── layouts/        # Page layout components
│   ├── lib/            # API client, utilities
│   ├── pages/          # Route page components
│   ├── styles/         # Global CSS
│   ├── App.tsx         # Main app with routing
│   └── main.tsx        # Entry point
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tailwind.config.ts  # Tailwind + HeroUI theme
└── tsconfig.json       # TypeScript config
```

## Development

### Prerequisites

- Bun (package manager)
- Node.js 18+

### Commands

```bash
# Install dependencies
bun install

# Start dev server (http://localhost:5173)
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Type checking
bun run typecheck
```

## Configuration

### Environment Variables

Create `.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
```

### API Proxy

Vite dev server proxies `/api` and `/socket.io` to backend (port 3000).

## Design System

- **Light mode only** - No dark theme
- **Primary color**: #007fff (Azure Blue)
- **Accent color**: #ff8000 (Orange)
- **Font**: Inter (sans-serif)
- **WCAG AA compliant** - 4.5:1 minimum contrast

See `/home/sauk/projects/sentinel/heroui-theme-config.ts` for complete theme tokens.

## Authentication

Uses Zustand with persist middleware. Token stored in localStorage as `sentinel-auth`.

### Auth Flow

1. Login with username/password → JWT token
2. Token added to all API requests via Axios interceptor
3. 401 responses trigger automatic logout

## State Management

- **Zustand**: Client state (auth, UI)
- **TanStack Query**: Server state (data fetching, caching)

## Key Features

- ✅ TypeScript strict mode
- ✅ Path aliases (`@/`, `@shared/`)
- ✅ Auto token injection
- ✅ Auto logout on 401
- ✅ Persistent auth state
- ✅ Real-time WebSocket support (Socket.IO)

## Notes

- Use `bun` not `npm` (better WSL2 performance)
- Never use `any` type - look up actual types
- Share types via `/shared/types/index.ts`
- No dark mode implementation
- Touch targets minimum 48px (kiosk: 56px)
