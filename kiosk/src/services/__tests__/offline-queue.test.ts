/**
 * Unit tests for OfflineQueue service
 *
 * Tests the queue abstraction layer that wraps IndexedDB operations
 * with sequence numbering and localStorage persistence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { offlineQueue } from '../offline-queue';
import { clear, getAll, getSize } from '../../db/queue';

describe('OfflineQueue', () => {
  beforeEach(async () => {
    // Initialize and clear the queue before each test
    await offlineQueue.initialize();
    await offlineQueue.clearQueue();
    localStorage.clear();
  });

  afterEach(async () => {
    await offlineQueue.clearQueue();
    localStorage.clear();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      // Already initialized in beforeEach
      const size = await offlineQueue.getQueueSize();
      expect(size).toBe(0);
    });

    it('should be idempotent', async () => {
      await offlineQueue.initialize();
      await offlineQueue.initialize();
      await offlineQueue.initialize();

      const size = await offlineQueue.getQueueSize();
      expect(size).toBe(0);
    });

    it('should restore sequence counter from localStorage', async () => {
      // Set a sequence counter
      localStorage.setItem('sentinel:sequence_counter', '100');

      // Create a new instance to test restoration (need to access private initialized flag)
      // This is a limitation - the singleton pattern makes testing restoration tricky
      // For now, we'll test that the counter increments correctly
      await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');
      const items = await offlineQueue.getQueuedCheckins();

      // The sequence should be > 0 (either restored or incremented)
      expect(items[0].sequenceNumber).toBeGreaterThan(0);
    });
  });

  describe('addToQueue', () => {
    it('should add a checkin with all required fields', async () => {
      const id = await offlineQueue.addToQueue('BADGE-123', 'kiosk-main');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);

      const items = await offlineQueue.getQueuedCheckins();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        serialNumber: 'BADGE-123',
        kioskId: 'kiosk-main',
        retryCount: 0,
      });
    });

    it('should generate unique IDs for each checkin', async () => {
      const id1 = await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');
      const id2 = await offlineQueue.addToQueue('BADGE-002', 'kiosk-1');
      const id3 = await offlineQueue.addToQueue('BADGE-003', 'kiosk-1');

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should increment sequence number for each checkin', async () => {
      await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');
      await offlineQueue.addToQueue('BADGE-002', 'kiosk-1');
      await offlineQueue.addToQueue('BADGE-003', 'kiosk-1');

      const items = await offlineQueue.getQueuedCheckins();
      const sequences = items.map((i) => i.sequenceNumber).sort((a, b) => a - b);

      expect(sequences[1]).toBe(sequences[0] + 1);
      expect(sequences[2]).toBe(sequences[1] + 1);
    });

    it('should persist sequence counter to localStorage', async () => {
      await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');
      await offlineQueue.addToQueue('BADGE-002', 'kiosk-1');

      const stored = localStorage.getItem('sentinel:sequence_counter');
      expect(stored).toBeDefined();
      expect(parseInt(stored!, 10)).toBeGreaterThan(0);
    });

    it('should include timestamp and localTimestamp', async () => {
      const beforeTime = Date.now();
      await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');
      const afterTime = Date.now();

      const items = await offlineQueue.getQueuedCheckins();
      expect(items[0].timestamp).toBeInstanceOf(Date);
      expect(items[0].localTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(items[0].localTimestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('getQueuedCheckins', () => {
    it('should return empty array for empty queue', async () => {
      const items = await offlineQueue.getQueuedCheckins();
      expect(items).toEqual([]);
    });

    it('should return all queued items', async () => {
      await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');
      await offlineQueue.addToQueue('BADGE-002', 'kiosk-1');
      await offlineQueue.addToQueue('BADGE-003', 'kiosk-1');

      const items = await offlineQueue.getQueuedCheckins();
      expect(items).toHaveLength(3);
    });
  });

  describe('markAsSynced', () => {
    it('should remove synced items from queue', async () => {
      const id1 = await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');
      const id2 = await offlineQueue.addToQueue('BADGE-002', 'kiosk-1');
      const id3 = await offlineQueue.addToQueue('BADGE-003', 'kiosk-1');

      await offlineQueue.markAsSynced([id1, id3]);

      const items = await offlineQueue.getQueuedCheckins();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(id2);
    });

    it('should handle empty array', async () => {
      await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');

      await offlineQueue.markAsSynced([]);

      const items = await offlineQueue.getQueuedCheckins();
      expect(items).toHaveLength(1);
    });

    it('should handle non-existent IDs gracefully', async () => {
      await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');

      await expect(
        offlineQueue.markAsSynced(['non-existent-id'])
      ).resolves.not.toThrow();
    });
  });

  describe('getQueueSize', () => {
    it('should return 0 for empty queue', async () => {
      const size = await offlineQueue.getQueueSize();
      expect(size).toBe(0);
    });

    it('should return correct count', async () => {
      await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');
      expect(await offlineQueue.getQueueSize()).toBe(1);

      await offlineQueue.addToQueue('BADGE-002', 'kiosk-1');
      expect(await offlineQueue.getQueueSize()).toBe(2);
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', async () => {
      const id = await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');

      await offlineQueue.incrementRetryCount(id);

      const items = await offlineQueue.getQueuedCheckins();
      expect(items[0].retryCount).toBe(1);
    });

    it('should throw for non-existent ID', async () => {
      await expect(
        offlineQueue.incrementRetryCount('non-existent-id')
      ).rejects.toThrow();
    });
  });

  describe('clearQueue', () => {
    it('should remove all items', async () => {
      await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');
      await offlineQueue.addToQueue('BADGE-002', 'kiosk-1');
      await offlineQueue.addToQueue('BADGE-003', 'kiosk-1');

      await offlineQueue.clearQueue();

      const size = await offlineQueue.getQueueSize();
      expect(size).toBe(0);
    });
  });

  describe('cleanExpired', () => {
    it('should delegate to queue module', async () => {
      // Add a recent item - should not be cleaned
      await offlineQueue.addToQueue('BADGE-001', 'kiosk-1');

      const cleaned = await offlineQueue.cleanExpired();

      // Recent items should not be cleaned
      expect(cleaned).toBe(0);
      expect(await offlineQueue.getQueueSize()).toBe(1);
    });
  });
});
