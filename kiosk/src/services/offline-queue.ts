import { v4 as uuidv4 } from 'uuid';
import {
  initDB,
  enqueue,
  getAll,
  remove,
  clear,
  getSize,
  incrementRetry,
  cleanExpiredItems,
  type QueuedCheckin,
} from '../db/queue';

class OfflineQueue {
  private initialized: boolean = false;
  private sequenceCounter: number = 0;
  private readonly SEQUENCE_STORAGE_KEY = 'sentinel:sequence_counter';

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await initDB();

    // Load persisted sequence counter from localStorage
    const storedSequence = localStorage.getItem(this.SEQUENCE_STORAGE_KEY);
    this.sequenceCounter = storedSequence ? parseInt(storedSequence, 10) : 0;

    this.initialized = true;
  }

  async addToQueue(serialNumber: string, kioskId: string): Promise<string> {
    await this.ensureInitialized();

    const id = uuidv4();
    const now = new Date();

    const checkin: QueuedCheckin = {
      id,
      serialNumber,
      kioskId,
      timestamp: now,
      localTimestamp: Date.now(),
      sequenceNumber: this.getNextSequence(),
      retryCount: 0,
      createdAt: now,
    };

    await enqueue(checkin);
    return id;
  }

  private getNextSequence(): number {
    this.sequenceCounter += 1;
    // Persist to localStorage immediately
    localStorage.setItem(this.SEQUENCE_STORAGE_KEY, this.sequenceCounter.toString());
    return this.sequenceCounter;
  }

  async getQueuedCheckins(): Promise<QueuedCheckin[]> {
    await this.ensureInitialized();
    return await getAll();
  }

  async markAsSynced(ids: string[]): Promise<void> {
    await this.ensureInitialized();

    for (const id of ids) {
      await remove(id);
    }
  }

  async getQueueSize(): Promise<number> {
    await this.ensureInitialized();
    return await getSize();
  }

  async incrementRetryCount(id: string): Promise<void> {
    await this.ensureInitialized();
    await incrementRetry(id);
  }

  async clearQueue(): Promise<void> {
    await this.ensureInitialized();
    await clear();
  }

  async cleanExpired(): Promise<number> {
    await this.ensureInitialized();
    return await cleanExpiredItems();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();
