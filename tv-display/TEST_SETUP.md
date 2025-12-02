# Test Setup for TV Display

This document explains how to set up and run unit tests for the TV Display application.

## Required Dependencies

To run the unit tests, you need to install the following dev dependencies:

```bash
cd /home/sauk/projects/sentinel/tv-display
bun add -d vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/ui
```

## Configuration Files

The following test configuration files have been created:

1. **vitest.config.ts** - Vitest configuration with React plugin and jsdom environment
2. **src/test/setup.ts** - Test setup with automatic cleanup and jest-dom matchers
3. **src/hooks/__tests__/usePresenceData.test.ts** - Comprehensive unit tests for usePresenceData hook

## Running Tests

After installing dependencies, update the test script in `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

Then run tests with:

```bash
# Run tests in watch mode
bun test

# Run tests once
bun run vitest run

# Run tests with UI
bun test:ui
```

## Test Coverage

The `usePresenceData.test.ts` file provides comprehensive coverage for:

### 1. Initial Data Fetching
- Fetches presence, visitors, and present members on mount
- Handles fetch errors gracefully (silent failure)
- Sets isLoading to false after fetch completes
- Handles partial fetch failures
- Handles missing nested data

### 2. WebSocket Connection
- Connects to WebSocket with correct config
- Sets isConnected on connect/disconnect
- Subscribes to presence on connect
- Registers all required event handlers

### 3. Real-time Updates
- Updates data on presence_update event
- Refetches lists after presence update
- Handles missing divisions in updates
- Preserves previous data during updates

### 4. Cleanup
- Disconnects socket on unmount
- Ensures single disconnect call

### 5. Configuration Changes
- Reconnects WebSocket when wsUrl changes
- Refetches data when apiUrl changes

### 6. Loading States
- Validates initial state values
- Tracks loading state transitions

### 7. Error Handling
- Handles malformed responses
- Handles network timeouts
- Handles invalid JSON

## Mock Strategy

The tests use Vitest's `vi.hoisted()` to properly mock:

1. **socket.io-client** - Mock socket instance with event handlers
2. **authenticatedFetch** - Mock API responses for all endpoints

All mocks are reset between tests using `beforeEach()` hooks.

## Test Philosophy

Following the project's testing standards:

- ✅ No `any` types - all mocks are properly typed
- ✅ Tests throw errors early - no silent fallbacks in test code
- ✅ Descriptive test names that explain expected behavior
- ✅ Tests are organized by feature category
- ✅ Each test is independent and can run in isolation
