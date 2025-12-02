import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSocket } from '../useSocket';
import type { Socket } from 'socket.io-client';
import { io as mockIoFn } from 'socket.io-client';

// Mock socket instance
const mockSocket: Partial<Socket> = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
};

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Cast for type safety
const mockIo = mockIoFn as ReturnType<typeof vi.fn>;

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    // Default: not authenticated
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connection management', () => {
    it('should not connect when not authenticated', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false });

      renderHook(() => useSocket());

      expect(mockIo).not.toHaveBeenCalled();
    });

    it('should connect when authenticated', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      renderHook(() => useSocket());

      expect(mockIo).toHaveBeenCalledWith({
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      });
    });

    it('should register connect event handler', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      renderHook(() => useSocket());

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should register disconnect event handler', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      renderHook(() => useSocket());

      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should auto-subscribe to presence on connect event', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      renderHook(() => useSocket());

      // Get the connect handler that was registered
      const connectCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'connect'
      );
      expect(connectCall).toBeDefined();

      const connectHandler = connectCall![1];

      // Trigger connect event
      connectHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_presence');
    });

    it('should subscribe to presence if already connected', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });
      mockSocket.connected = true;

      renderHook(() => useSocket());

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_presence');
    });

    it('should disconnect on cleanup', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { unmount } = renderHook(() => useSocket());

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should reconnect when authentication state changes', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false });
      const { rerender } = renderHook(() => useSocket());

      expect(mockIo).not.toHaveBeenCalled();

      // Change auth state
      mockUseAuth.mockReturnValue({ isAuthenticated: true });
      rerender();

      expect(mockIo).toHaveBeenCalled();
    });
  });

  describe('event handlers - onPresenceUpdate', () => {
    it('should register callback for presence_update event', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      result.current.onPresenceUpdate(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('presence_update', callback);
    });

    it('should return unsubscribe function', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      const unsubscribe = result.current.onPresenceUpdate(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unregister callback when unsubscribe is called', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      const unsubscribe = result.current.onPresenceUpdate(callback);
      unsubscribe();

      expect(mockSocket.off).toHaveBeenCalledWith('presence_update', callback);
    });

    it('should return no-op function when socket is not initialized', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      const unsubscribe = result.current.onPresenceUpdate(callback);

      expect(mockSocket.on).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');

      // Should not throw when called
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should receive event data correctly', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      result.current.onPresenceUpdate(callback);

      // Get the registered callback
      const onCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'presence_update'
      );
      const registeredCallback = onCall![1];

      const testData = {
        stats: {
          present: 45,
          absent: 12,
          visitors: 3,
          totalMembers: 57,
        },
      };

      // Simulate event emission
      registeredCallback(testData);

      expect(callback).toHaveBeenCalledWith(testData);
    });

    it('should handle multiple subscribers', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      result.current.onPresenceUpdate(callback1);
      result.current.onPresenceUpdate(callback2);

      // connect + disconnect + 2 presence_update callbacks = 4
      expect(mockSocket.on).toHaveBeenCalledTimes(4);
    });
  });

  describe('event handlers - onCheckin', () => {
    it('should register callback for checkin event', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      result.current.onCheckin(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('checkin', callback);
    });

    it('should return unsubscribe function', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      const unsubscribe = result.current.onCheckin(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unregister callback when unsubscribe is called', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      const unsubscribe = result.current.onCheckin(callback);
      unsubscribe();

      expect(mockSocket.off).toHaveBeenCalledWith('checkin', callback);
    });

    it('should return no-op function when socket is not initialized', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      const unsubscribe = result.current.onCheckin(callback);

      expect(mockSocket.on).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should receive event data correctly', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      result.current.onCheckin(callback);

      const onCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'checkin'
      );
      const registeredCallback = onCall![1];

      const testData = {
        memberId: 'mem-123',
        memberName: 'John Smith',
        rank: 'AB',
        division: 'OPS',
        direction: 'in' as const,
        timestamp: '2025-12-01T10:30:00Z',
      };

      registeredCallback(testData);

      expect(callback).toHaveBeenCalledWith(testData);
    });

    it('should handle both in and out directions', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      result.current.onCheckin(callback);

      const onCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'checkin'
      );
      const registeredCallback = onCall![1];

      const checkinData = {
        memberId: 'mem-123',
        memberName: 'John Smith',
        rank: 'AB',
        division: 'OPS',
        direction: 'in' as const,
        timestamp: '2025-12-01T10:30:00Z',
      };

      const checkoutData = {
        ...checkinData,
        direction: 'out' as const,
        timestamp: '2025-12-01T16:30:00Z',
      };

      registeredCallback(checkinData);
      expect(callback).toHaveBeenCalledWith(checkinData);

      registeredCallback(checkoutData);
      expect(callback).toHaveBeenCalledWith(checkoutData);
    });
  });

  describe('event handlers - onVisitorSignin', () => {
    it('should register callback for visitor_signin event', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      result.current.onVisitorSignin(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('visitor_signin', callback);
    });

    it('should return unsubscribe function', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      const unsubscribe = result.current.onVisitorSignin(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unregister callback when unsubscribe is called', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      const unsubscribe = result.current.onVisitorSignin(callback);
      unsubscribe();

      expect(mockSocket.off).toHaveBeenCalledWith('visitor_signin', callback);
    });

    it('should return no-op function when socket is not initialized', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      const unsubscribe = result.current.onVisitorSignin(callback);

      expect(mockSocket.on).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should receive event data correctly', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      result.current.onVisitorSignin(callback);

      const onCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'visitor_signin'
      );
      const registeredCallback = onCall![1];

      const testData = {
        visitorId: 'vis-456',
        name: 'Jane Doe',
        organization: 'Canadian Armed Forces',
        visitType: 'official',
        checkInTime: '2025-12-01T14:00:00Z',
      };

      registeredCallback(testData);

      expect(callback).toHaveBeenCalledWith(testData);
    });
  });

  describe('reconnection handling', () => {
    it('should handle disconnect gracefully', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      renderHook(() => useSocket());

      const disconnectCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'disconnect'
      );
      expect(disconnectCall).toBeDefined();

      const disconnectHandler = disconnectCall![1];

      // Should not throw when disconnect occurs
      expect(() => disconnectHandler()).not.toThrow();
    });

    it('should re-subscribe to presence after reconnect', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      renderHook(() => useSocket());

      // Find the connect handler BEFORE clearing mocks
      const connectCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'connect'
      );
      const connectHandler = connectCall![1];

      vi.clearAllMocks();

      // Simulate reconnect by triggering connect event again
      connectHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_presence');
    });

    it('should preserve event listeners across reconnection', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result } = renderHook(() => useSocket());
      const presenceCallback = vi.fn();
      const checkinCallback = vi.fn();

      result.current.onPresenceUpdate(presenceCallback);
      result.current.onCheckin(checkinCallback);

      // Simulate disconnect then reconnect
      const disconnectCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'disconnect'
      );
      const connectCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'connect'
      );

      const disconnectHandler = disconnectCall![1];
      const connectHandler = connectCall![1];

      disconnectHandler();
      connectHandler();

      // Callbacks should still be registered
      expect(mockSocket.off).not.toHaveBeenCalledWith('presence_update', presenceCallback);
      expect(mockSocket.off).not.toHaveBeenCalledWith('checkin', checkinCallback);
    });
  });

  describe('callback stability', () => {
    it('onPresenceUpdate should have stable reference', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result, rerender } = renderHook(() => useSocket());
      const firstRef = result.current.onPresenceUpdate;

      rerender();
      const secondRef = result.current.onPresenceUpdate;

      expect(firstRef).toBe(secondRef);
    });

    it('onCheckin should have stable reference', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result, rerender } = renderHook(() => useSocket());
      const firstRef = result.current.onCheckin;

      rerender();
      const secondRef = result.current.onCheckin;

      expect(firstRef).toBe(secondRef);
    });

    it('onVisitorSignin should have stable reference', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { result, rerender } = renderHook(() => useSocket());
      const firstRef = result.current.onVisitorSignin;

      rerender();
      const secondRef = result.current.onVisitorSignin;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe('cleanup on authentication change', () => {
    it('should disconnect when authentication is lost', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { rerender } = renderHook(() => useSocket());

      vi.clearAllMocks();

      mockUseAuth.mockReturnValue({ isAuthenticated: false });
      rerender();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should clean up event listeners when authentication is lost', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      const { rerender } = renderHook(() => useSocket());

      vi.clearAllMocks();

      mockUseAuth.mockReturnValue({ isAuthenticated: false });
      rerender();

      expect(mockSocket.off).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });
});
