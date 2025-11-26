import { v4 as uuidv4 } from 'uuid';
import {
  initDB,
  enqueue,
  getAll,
  remove,
  clear,
  getSize,
  incrementRetry,
  type QueuedCheckin,
} from '../db/queue';

class OfflineQueue {
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await initDB();
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
      retryCount: 0,
      createdAt: now,
    };

    await enqueue(checkin);
    return id;
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

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();
