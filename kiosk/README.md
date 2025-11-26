# Sentinel Kiosk

Touch-optimized kiosk interface for RFID badge scanning and visitor sign-in at HMCS Chippawa.

## Features

- **Badge Scanning**: RFID badge tap for check-in/check-out
- **Visitor Sign-In**: Self-service visitor registration
- **Touch-Optimized**: 56px minimum touch targets
- **Audio Feedback**: Success/error sounds
- **Auto-Reset**: Returns to idle screen after timeout
- **Offline-Ready**: Works without network connection (with local queue)

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- Axios (API client)

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your configuration:
   - `VITE_API_URL`: Backend API URL
   - `VITE_KIOSK_ID`: Unique kiosk identifier
   - `VITE_VISITOR_MODE_ENABLED`: Enable/disable visitor sign-in

4. Add sound files to `public/sounds/`:
   - `success.mp3` - Check-in/check-out success
   - `error.mp3` - Error alert
   - `scan.mp3` - Badge scan feedback

## Development

```bash
bun dev
```

## Production Build

```bash
bun run build
bun preview
```

## Screens

1. **IdleScreen**: Main waiting screen with "Tap Your Badge" prompt
2. **ScanningScreen**: Processing indicator during badge scan
3. **SuccessScreen**: Check-in/check-out confirmation
4. **ErrorScreen**: Error display with "how to fix" guidance
5. **VisitorScreen**: Multi-step visitor sign-in flow

## Hardware Integration

The kiosk expects badge scans to come from a PN532 NFC reader connected via GPIO. The reader should trigger API calls to `/api/checkins/scan` with the badge ID.

For development, you can simulate badge scans by calling the API directly or using the debug interface.

## Kiosk Mode

For production deployment on Raspberry Pi:

1. Set up Chromium in kiosk mode
2. Disable screensaver/power management
3. Auto-start browser on boot
4. Point to `http://localhost:5173` (dev) or production URL
