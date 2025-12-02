import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { TVConfig } from '../../lib/config';
import type {
  PresentMember,
  ActiveVisitor,
} from '../usePresenceData';

/**
 * Unit tests for usePresenceData hook
 * Tests initial data fetching, WebSocket connection, real-time updates, and cleanup
 * Critical test coverage to ensure TV display shows accurate presence data
 */

// Mock socket instance
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

// Mock socket.io-client using vi.hoisted
const { mockIo } = vi.hoisted(() => ({
  mockIo: vi.fn(() => mockSocket),
}));

vi.mock('socket.io-client', () => ({
  io: mockIo,
}));

// Mock authenticatedFetch using vi.hoisted
const { mockAuthenticatedFetch } = vi.hoisted(() => ({
  mockAuthenticatedFetch: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  authenticatedFetch: mockAuthenticatedFetch,
}));

// Now import the hook with mocked dependencies
import { usePresenceData } from '../usePresenceData';

// Test fixtures
const mockConfig: TVConfig = {
  displayMode: 'unit-overview',
  refreshInterval: 5000,
  activityFeedEnabled: true,
  eventId: null,
  eventName: null,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3000',
};

const mockPresenceData = {
  stats: {
    present: 45,
    absent: 23,
    divisions: [
      { name: 'Operations', present: 15, total: 20 },
      { name: 'Administration', present: 10, total: 15 },
      { name: 'Training', present: 20, total: 33 },
    ],
  },
};

const mockPresentMembers: PresentMember[] = [
  {
    id: 'mem-1',
    firstName: 'John',
    lastName: 'Smith',
    rank: 'Petty Officer',
    division: 'Operations',
    mess: 'Officers',
    checkedInAt: '2025-12-01T08:00:00Z',
  },
  {
    id: 'mem-2',
    firstName: 'Jane',
    lastName: 'Doe',
    rank: 'Leading Seaman',
    division: 'Administration',
    mess: null,
    checkedInAt: '2025-12-01T08:15:00Z',
  },
];

const mockActiveVisitors: ActiveVisitor[] = [
  {
    id: 'vis-1',
    name: 'Robert Johnson',
    organization: 'HMCS York',
    visitType: 'Official Visit',
    checkInTime: '2025-12-01T09:00:00Z',
  },
  {
    id: 'vis-2',
    name: 'Sarah Williams',
    organization: 'Canadian Coast Guard',
    visitType: 'Training',
    checkInTime: '2025-12-01T09:30:00Z',
  },
];

// Helper to create mock response
function createMockResponse(ok: boolean, data: unknown): Promise<Response> {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  } as Response);
}

describe('usePresenceData', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default fetch responses
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/checkins/presence/present')) {
        return createMockResponse(true, { members: mockPresentMembers });
      }
      if (url.includes('/checkins/presence')) {
        return createMockResponse(true, mockPresenceData);
      }
      if (url.includes('/visitors/active')) {
        return createMockResponse(true, { visitors: mockActiveVisitors });
      }
      return createMockResponse(false, {});
    });

    // Reset socket mock
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('initial fetch', () => {
    it('should fetch all data on mount', async () => {
      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should have called all three endpoints
      expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(3);
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/checkins/presence'
      );
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/visitors/active'
      );
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/checkins/presence/present'
      );
    });

    it('should set correct initial data after successful fetch', async () => {
      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toMatchObject({
        present: 45,
        absent: 23,
        visitors: 2,
        divisions: mockPresenceData.stats.divisions,
        presentMembers: mockPresentMembers,
        activeVisitors: mockActiveVisitors,
      });
    });

    it('should handle fetch errors gracefully with silent failure', async () => {
      mockAuthenticatedFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should still have default data structure
      expect(result.current.data).toEqual({
        present: 0,
        absent: 0,
        visitors: 0,
        divisions: [],
        presentMembers: [],
        activeVisitors: [],
      });
    });

    it('should handle partial fetch failures', async () => {
      mockAuthenticatedFetch.mockImplementation((url: string) => {
        if (url.includes('/checkins/presence/present')) {
          return createMockResponse(false, {});
        }
        if (url.includes('/checkins/presence')) {
          return createMockResponse(true, mockPresenceData);
        }
        if (url.includes('/visitors/active')) {
          return createMockResponse(false, {});
        }
        return createMockResponse(false, {});
      });

      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should have presence stats but empty lists
      expect(result.current.data.present).toBe(45);
      expect(result.current.data.absent).toBe(23);
      expect(result.current.data.presentMembers).toEqual([]);
      expect(result.current.data.activeVisitors).toEqual([]);
    });

    it('should handle missing nested data gracefully', async () => {
      mockAuthenticatedFetch.mockImplementation((url: string) => {
        if (url.includes('/checkins/presence/present')) {
          return createMockResponse(true, {}); // Missing members array
        }
        if (url.includes('/checkins/presence')) {
          return createMockResponse(true, { stats: {} }); // Missing stats fields
        }
        if (url.includes('/visitors/active')) {
          return createMockResponse(true, {}); // Missing visitors array
        }
        return createMockResponse(false, {});
      });

      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual({
        present: 0,
        absent: 0,
        visitors: 0,
        divisions: [],
        presentMembers: [],
        activeVisitors: [],
      });
    });

    it('should set isLoading to false after fetch completes', async () => {
      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('should set isLoading to false even when fetch fails', async () => {
      mockAuthenticatedFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  describe('WebSocket connection', () => {
    it('should connect to WebSocket with correct config', () => {
      renderHook(() => usePresenceData({ config: mockConfig }));

      expect(mockIo).toHaveBeenCalledWith('ws://localhost:3000', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
      });
    });

    it('should register connect event handler', () => {
      renderHook(() => usePresenceData({ config: mockConfig }));

      const connectCall = mockSocket.on.mock.calls.find((call) => call[0] === 'connect');
      expect(connectCall).toBeDefined();
      expect(connectCall?.[1]).toBeInstanceOf(Function);
    });

    it('should register disconnect event handler', () => {
      renderHook(() => usePresenceData({ config: mockConfig }));

      const disconnectCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'disconnect'
      );
      expect(disconnectCall).toBeDefined();
      expect(disconnectCall?.[1]).toBeInstanceOf(Function);
    });

    it('should register presence_update event handler', () => {
      renderHook(() => usePresenceData({ config: mockConfig }));

      const presenceUpdateCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'presence_update'
      );
      expect(presenceUpdateCall).toBeDefined();
      expect(presenceUpdateCall?.[1]).toBeInstanceOf(Function);
    });

    it('should set isConnected to true on connect', async () => {
      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      expect(result.current.isConnected).toBe(false);

      // Get the connect handler and invoke it
      const connectCall = mockSocket.on.mock.calls.find((call) => call[0] === 'connect');
      const connectHandler = connectCall?.[1] as () => void;

      act(() => {
        connectHandler();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should emit subscribe_presence on connect', () => {
      renderHook(() => usePresenceData({ config: mockConfig }));

      // Get the connect handler and invoke it
      const connectCall = mockSocket.on.mock.calls.find((call) => call[0] === 'connect');
      const connectHandler = connectCall?.[1] as () => void;

      act(() => {
        connectHandler();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_presence');
    });

    it('should set isConnected to false on disconnect', async () => {
      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      // First connect
      const connectCall = mockSocket.on.mock.calls.find((call) => call[0] === 'connect');
      const connectHandler = connectCall?.[1] as () => void;

      act(() => {
        connectHandler();
      });

      expect(result.current.isConnected).toBe(true);

      // Then disconnect
      const disconnectCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'disconnect'
      );
      const disconnectHandler = disconnectCall?.[1] as () => void;

      act(() => {
        disconnectHandler();
      });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('real-time updates', () => {
    it('should update data on presence_update event', async () => {
      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      // Wait for initial fetch to complete
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Clear mock to track only the refetch calls
      mockAuthenticatedFetch.mockClear();

      // Get the presence_update handler
      const presenceUpdateCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'presence_update'
      );
      const presenceUpdateHandler = presenceUpdateCall?.[1] as (event: unknown) => void;

      const updateEvent = {
        present: 50,
        absent: 18,
        visitors: 3,
        divisions: [
          { name: 'Operations', present: 18, total: 20 },
          { name: 'Administration', present: 12, total: 15 },
          { name: 'Training', present: 20, total: 33 },
        ],
      };

      // Simulate presence_update event
      act(() => {
        presenceUpdateHandler(updateEvent);
      });

      // Data should be updated immediately
      expect(result.current.data.present).toBe(50);
      expect(result.current.data.absent).toBe(18);
      expect(result.current.data.visitors).toBe(3);
      expect(result.current.data.divisions).toEqual(updateEvent.divisions);
    });

    it('should refetch lists after presence update', async () => {
      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      // Wait for initial fetch to complete
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Clear mock to track only the refetch calls
      mockAuthenticatedFetch.mockClear();

      // Get the presence_update handler
      const presenceUpdateCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'presence_update'
      );
      const presenceUpdateHandler = presenceUpdateCall?.[1] as (event: unknown) => void;

      const updateEvent = {
        present: 50,
        absent: 18,
        visitors: 3,
        divisions: [],
      };

      // Simulate presence_update event
      act(() => {
        presenceUpdateHandler(updateEvent);
      });

      // Should refetch all three endpoints
      await waitFor(() => {
        expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(3);
      });

      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/checkins/presence'
      );
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/visitors/active'
      );
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/checkins/presence/present'
      );
    });

    it('should handle presence_update with missing divisions', async () => {
      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const presenceUpdateCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'presence_update'
      );
      const presenceUpdateHandler = presenceUpdateCall?.[1] as (event: unknown) => void;

      const updateEvent = {
        present: 30,
        absent: 38,
        visitors: 1,
        divisions: undefined,
      };

      act(() => {
        presenceUpdateHandler(updateEvent);
      });

      expect(result.current.data.present).toBe(30);
      expect(result.current.data.absent).toBe(38);
      expect(result.current.data.visitors).toBe(1);
      expect(result.current.data.divisions).toEqual([]);
    });

    it('should preserve previous members/visitors during count update', async () => {
      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const initialMembers = result.current.data.presentMembers;
      const initialVisitors = result.current.data.activeVisitors;

      const presenceUpdateCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'presence_update'
      );
      const presenceUpdateHandler = presenceUpdateCall?.[1] as (event: unknown) => void;

      // Mock refetch to return same data
      mockAuthenticatedFetch.mockClear();

      const updateEvent = {
        present: 50,
        absent: 18,
        visitors: 2,
        divisions: [],
      };

      act(() => {
        presenceUpdateHandler(updateEvent);
      });

      // Members and visitors should still be present (from initial fetch)
      // until refetch completes
      expect(result.current.data.presentMembers).toEqual(initialMembers);
      expect(result.current.data.activeVisitors).toEqual(initialVisitors);
    });
  });

  describe('cleanup', () => {
    it('should disconnect socket on unmount', () => {
      const { unmount } = renderHook(() => usePresenceData({ config: mockConfig }));

      expect(mockSocket.disconnect).not.toHaveBeenCalled();

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should only disconnect once on unmount', () => {
      const { unmount } = renderHook(() => usePresenceData({ config: mockConfig }));

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('config changes', () => {
    it('should reconnect WebSocket when wsUrl changes', () => {
      const { rerender } = renderHook(
        ({ config }) => usePresenceData({ config }),
        {
          initialProps: { config: mockConfig },
        }
      );

      expect(mockIo).toHaveBeenCalledTimes(1);
      expect(mockIo).toHaveBeenCalledWith('ws://localhost:3000', expect.any(Object));

      const newConfig = {
        ...mockConfig,
        wsUrl: 'ws://localhost:4000',
      };

      rerender({ config: newConfig });

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockIo).toHaveBeenCalledTimes(2);
      expect(mockIo).toHaveBeenLastCalledWith('ws://localhost:4000', expect.any(Object));
    });

    it('should refetch data when apiUrl changes', async () => {
      const { rerender } = renderHook(
        ({ config }) => usePresenceData({ config }),
        {
          initialProps: { config: mockConfig },
        }
      );

      await waitFor(() => expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(3));

      mockAuthenticatedFetch.mockClear();

      const newConfig = {
        ...mockConfig,
        apiUrl: 'http://localhost:4000/api',
      };

      rerender({ config: newConfig });

      await waitFor(() => expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(3));

      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/checkins/presence'
      );
    });
  });

  describe('loading states', () => {
    it('should start with isLoading true', () => {
      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      expect(result.current.isLoading).toBe(true);
    });

    it('should start with isConnected false', () => {
      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      expect(result.current.isConnected).toBe(false);
    });

    it('should start with empty data structure', () => {
      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      expect(result.current.data).toEqual({
        present: 0,
        absent: 0,
        visitors: 0,
        divisions: [],
        presentMembers: [],
        activeVisitors: [],
      });
    });
  });

  describe('error handling', () => {
    it('should handle malformed presence response', async () => {
      mockAuthenticatedFetch.mockImplementation((url: string) => {
        if (url.includes('/checkins/presence')) {
          return createMockResponse(true, { invalid: 'data' });
        }
        return createMockResponse(true, {});
      });

      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should use default values for missing fields
      expect(result.current.data.present).toBe(0);
      expect(result.current.data.absent).toBe(0);
    });

    it('should handle network timeout gracefully', async () => {
      mockAuthenticatedFetch.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      );

      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      await waitFor(() => expect(result.current.isLoading).toBe(false), {
        timeout: 200,
      });

      expect(result.current.data).toEqual({
        present: 0,
        absent: 0,
        visitors: 0,
        divisions: [],
        presentMembers: [],
        activeVisitors: [],
      });
    });

    it('should not throw on invalid JSON response', async () => {
      mockAuthenticatedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      const { result } = renderHook(() => usePresenceData({ config: mockConfig }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should have default data
      expect(result.current.data.present).toBe(0);
    });
  });
});
