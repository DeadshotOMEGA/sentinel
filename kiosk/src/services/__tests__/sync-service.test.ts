import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { QueuedCheckin } from '../../db/queue';
import type { SyncState } from '../../state/sync-state';
import axios from 'axios';
import { syncService } from '../sync-service';
import { offlineQueue } from '../offline-queue';
import { useSyncStore } from '../../state/sync-state';

// Create spies for each method
const axiosPostSpy = vi.spyOn(axios, 'post');
const axiosGetSpy = vi.spyOn(axios, 'get');
const axiosErrorSpy = vi.spyOn(axios, 'isAxiosError');
const queueInitSpy = vi.spyOn(offlineQueue, 'initialize');
const queueSizeSpy = vi.spyOn(offlineQueue, 'getQueueSize');
const queueGetSpy = vi.spyOn(offlineQueue, 'getQueuedCheckins');
const queueSyncSpy = vi.spyOn(offlineQueue, 'markAsSynced');
const queueAddSpy = vi.spyOn(offlineQueue, 'addToQueue');
const storeSetSpy = vi.spyOn(useSyncStore, 'setState');
const storeGetSpy = vi.spyOn(useSyncStore, 'getState');

describe('SyncService Integration Tests', () => {
  beforeEach(() => {
    // Clear all spies
    axiosPostSpy.mockReset();
    axiosGetSpy.mockReset();
    axiosErrorSpy.mockReset();
    queueInitSpy.mockReset();
    queueSizeSpy.mockReset();
    queueGetSpy.mockReset();
    queueSyncSpy.mockReset();
    queueAddSpy.mockReset();
    storeSetSpy.mockReset();
    storeGetSpy.mockReset();

    // Setup default behaviors
    queueInitSpy.mockResolvedValue(undefined);
    queueSizeSpy.mockResolvedValue(0);
    queueGetSpy.mockResolvedValue([]);
    queueSyncSpy.mockResolvedValue(undefined);
    queueAddSpy.mockResolvedValue('id-1');

    storeSetSpy.mockReturnValue(undefined);
    storeGetSpy.mockReturnValue({
      isOnline: true,
      isBackendReachable: true,
      isSyncing: false,
      queueSize: 0,
      syncProgress: null,
      lastSyncError: null,
      lastSyncTime: null,
      setOnline: vi.fn(),
      setBackendReachable: vi.fn(),
      setSyncing: vi.fn(),
      setQueueSize: vi.fn(),
      setSyncProgress: vi.fn(),
      setSyncError: vi.fn(),
      setSyncTime: vi.fn(),
    } as unknown as SyncState);

    axiosPostSpy.mockResolvedValue(undefined);
    axiosGetSpy.mockResolvedValue(undefined);
    axiosErrorSpy.mockReturnValue(false);

    // Mock window events - only in browser environments
    if (typeof globalThis !== 'undefined' && 'addEventListener' in globalThis) {
      Object.defineProperty(globalThis, 'addEventListener', {
        value: vi.fn(),
        writable: true,
      });
      Object.defineProperty(globalThis, 'removeEventListener', {
        value: vi.fn(),
        writable: true,
      });
    }
  });

  afterEach(() => {
    syncService.stopSync();
  });

  describe('Queue Management', () => {
    it('should initialize queue on startSync', async () => {
      await syncService.startSync();
      expect(queueInitSpy).toHaveBeenCalled();
    });

    it('should handle empty queue gracefully', async () => {
      queueSizeSpy.mockResolvedValue(0);
      await syncService.syncNow();
      expect(axiosPostSpy).not.toHaveBeenCalled();
    });

    it('should remove synced items from queue', async () => {
      const checkins: QueuedCheckin[] = [
        {
          id: 'test-1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: new Date(),
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockResolvedValueOnce({
        data: { success: true, processed: 1, failed: 0, errors: [] },
      });

      await syncService.syncNow();

      expect(queueSyncSpy).toHaveBeenCalledWith(['test-1']);
    });

    it('should queue checkins when offline', async () => {
      queueAddSpy.mockResolvedValue('queue-id');
      const id = await offlineQueue.addToQueue('BADGE001', 'kiosk-1');
      expect(id).toBe('queue-id');
    });
  });

  describe('Network Sync', () => {
    it('should successfully sync checkins', async () => {
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: new Date(),
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockResolvedValueOnce({
        data: { success: true, processed: 1, failed: 0, errors: [] },
      });

      await syncService.syncNow();

      expect(storeSetSpy).toHaveBeenCalledWith({
        isSyncing: false,
        lastSyncError: null,
        lastSyncTime: expect.any(Date),
        syncProgress: null,
      });
    });

    it('should handle network errors', async () => {
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: new Date(),
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockRejectedValueOnce(new Error('Network error'));

      await syncService.syncNow();

      expect(storeSetSpy).toHaveBeenCalledWith({
        isSyncing: false,
        lastSyncError: expect.any(String),
        syncProgress: null,
      });
    });

    it('should handle 401 authentication errors', async () => {
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: new Date(),
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosErrorSpy.mockReturnValue(true);
      axiosPostSpy.mockRejectedValueOnce({
        response: { status: 401 },
      });

      await syncService.syncNow();

      expect(storeSetSpy).toHaveBeenCalledWith({
        isSyncing: false,
        lastSyncError: 'Authentication failed - cannot sync checkins',
        syncProgress: null,
      });
    });

    it('should handle 403 forbidden errors', async () => {
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: new Date(),
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosErrorSpy.mockReturnValue(true);
      axiosPostSpy.mockRejectedValueOnce({
        response: { status: 403 },
      });

      await syncService.syncNow();

      expect(storeSetSpy).toHaveBeenCalledWith({
        isSyncing: false,
        lastSyncError: 'Authentication failed - cannot sync checkins',
        syncProgress: null,
      });
    });

    it('should handle partial sync failures', async () => {
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: new Date(),
          retryCount: 0,
          createdAt: new Date(),
        },
        {
          id: '2',
          serialNumber: 'BADGE002',
          kioskId: 'kiosk-1',
          timestamp: new Date(),
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(2);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockResolvedValueOnce({
        data: {
          success: true,
          processed: 1,
          failed: 1,
          errors: [{ id: '2', error: 'Badge not found' }],
        },
      });

      await syncService.syncNow();

      expect(queueSyncSpy).toHaveBeenCalledWith(['1']);
    });

    it('should treat failed response as error', async () => {
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: new Date(),
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockResolvedValueOnce({
        data: {
          success: false,
          processed: 0,
          failed: 1,
          errors: [{ id: '1', error: 'Server error' }],
        },
      });

      await syncService.syncNow();

      expect(storeSetSpy).toHaveBeenCalledWith({
        isSyncing: false,
        lastSyncError: expect.stringContaining('Sync failed'),
        syncProgress: null,
      });
    });
  });

  describe('Batch Processing', () => {
    it('should split large queue into batches', async () => {
      const checkins: QueuedCheckin[] = Array.from({ length: 150 }, (_, i) => ({
        id: `test-${i}`,
        serialNumber: `BADGE${i.toString().padStart(3, '0')}`,
        kioskId: 'kiosk-1',
        timestamp: new Date(),
        retryCount: 0,
        createdAt: new Date(),
      }));

      queueSizeSpy.mockResolvedValue(150);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockResolvedValue({
        data: { success: true, processed: 100, failed: 0, errors: [] },
      });

      await syncService.syncNow();

      expect(axiosPostSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle batch timeout', async () => {
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: new Date(),
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockRejectedValueOnce(new Error('Request timeout'));

      await syncService.syncNow();

      expect(storeSetSpy).toHaveBeenCalledWith({
        isSyncing: false,
        lastSyncError: expect.stringContaining('Request timeout'),
        syncProgress: null,
      });
    });
  });

  describe('Retry Logic', () => {
    it('should reset retry counter on success', async () => {
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: new Date(),
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockResolvedValueOnce({
        data: { success: true, processed: 1, failed: 0, errors: [] },
      });

      await syncService.syncNow();

      expect(storeSetSpy).toHaveBeenCalledWith({
        isSyncing: false,
        lastSyncError: null,
        lastSyncTime: expect.any(Date),
        syncProgress: null,
      });
    });
  });

  describe('Timestamp Handling', () => {
    it('should handle future timestamps', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: futureDate,
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockResolvedValueOnce({
        data: { success: true, processed: 1, failed: 0, errors: [] },
      });

      await syncService.syncNow();

      expect(axiosPostSpy).toHaveBeenCalledWith(
        expect.stringContaining('/checkins/bulk'),
        expect.objectContaining({
          checkins: expect.arrayContaining([
            expect.objectContaining({ timestamp: futureDate }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should handle old timestamps', async () => {
      const oldDate = new Date('2024-01-01T12:00:00Z');
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: oldDate,
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockResolvedValueOnce({
        data: { success: true, processed: 1, failed: 0, errors: [] },
      });

      await syncService.syncNow();

      expect(axiosPostSpy).toHaveBeenCalledWith(
        expect.stringContaining('/checkins/bulk'),
        expect.objectContaining({
          checkins: expect.arrayContaining([
            expect.objectContaining({ timestamp: oldDate }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should preserve timestamp precision', async () => {
      const preciseDate = new Date('2025-01-15T14:30:45.123Z');
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: preciseDate,
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockResolvedValueOnce({
        data: { success: true, processed: 1, failed: 0, errors: [] },
      });

      await syncService.syncNow();

      const call = axiosPostSpy.mock.calls[0];
      const payload = call[1] as { checkins: Array<{ timestamp: Date }> };
      expect(payload.checkins[0].timestamp).toEqual(preciseDate);
    });
  });

  describe('Network Monitoring', () => {
    it('should set up network monitoring on start', async () => {
      await syncService.startSync();

      expect(window.addEventListener).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
    });
  });

  describe('API Configuration', () => {
    it('should use 15s timeout for bulk endpoint', async () => {
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: new Date(),
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockResolvedValueOnce({
        data: { success: true, processed: 1, failed: 0, errors: [] },
      });

      await syncService.syncNow();

      const call = axiosPostSpy.mock.calls[0];
      expect(call[2]).toEqual({ timeout: 15000 });
    });
  });

  describe('Edge Cases', () => {
    it('should not sync if already syncing', async () => {
      const checkins: QueuedCheckin[] = [
        {
          id: '1',
          serialNumber: 'BADGE001',
          kioskId: 'kiosk-1',
          timestamp: new Date(),
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      queueSizeSpy.mockResolvedValue(1);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                data: { success: true, processed: 1, failed: 0, errors: [] },
              });
            }, 100);
          })
      );

      const sync1 = syncService.syncNow();
      const sync2 = syncService.syncNow();

      await Promise.all([sync1, sync2]);

      expect(axiosPostSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle very large batches', async () => {
      const checkins: QueuedCheckin[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `test-${i}`,
        serialNumber: `BADGE${i.toString().padStart(4, '0')}`,
        kioskId: 'kiosk-1',
        timestamp: new Date(),
        retryCount: 0,
        createdAt: new Date(),
      }));

      queueSizeSpy.mockResolvedValue(1000);
      queueGetSpy.mockResolvedValue(checkins);
      axiosPostSpy.mockResolvedValue({
        data: { success: true, processed: 100, failed: 0, errors: [] },
      });

      await syncService.syncNow();

      expect(axiosPostSpy).toHaveBeenCalledTimes(10);
    });
  });
});
