import axios from 'axios';
import { offlineQueue } from './offline-queue';
import { useSyncStore } from '../state/sync-state';
import type { QueuedCheckin } from '../db/queue';

interface BulkCheckinPayload {
  checkins: Array<{
    serialNumber: string;
    timestamp: Date;
    kioskId: string;
    localTimestamp: number;
    sequenceNumber: number;
  }>;
}

interface BulkCheckinResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

type SyncState = 'idle' | 'syncing' | 'error';

const BATCH_SIZE = 100;
const RETRY_DELAYS = [5000, 15000, 45000, 120000]; // 5s, 15s, 45s, 2m

// Get API base URL with validation
function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  if (!url) {
    throw new Error('VITE_API_URL environment variable is not configured');
  }
  return url;
}

class SyncService {
  private state: SyncState = 'idle';
  private isRunning: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private networkCheckInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private currentRetryAttempt: number = 0;
  private handleOnlineRef: (() => Promise<void>) | null = null;
  private handleOfflineRef: (() => void) | null = null;
  private syncPromise: Promise<void> | null = null; // Lock to prevent concurrent syncs

  async startSync(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Initialize offline queue
    await offlineQueue.initialize();

    // Update initial queue size
    await this.updateQueueSize();

    // Set up network status monitoring
    this.setupNetworkMonitoring();

    // Set up periodic cleanup of expired items (every 6 hours)
    this.setupPeriodicCleanup();

    // Attempt initial sync
    await this.syncNow();
  }

  stopSync(): void {
    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Remove event listeners
    if (this.handleOnlineRef) {
      window.removeEventListener('online', this.handleOnlineRef);
      this.handleOnlineRef = null;
    }

    if (this.handleOfflineRef) {
      window.removeEventListener('offline', this.handleOfflineRef);
      this.handleOfflineRef = null;
    }

    useSyncStore.setState({ isSyncing: false, syncProgress: null });
  }

  async syncNow(): Promise<void> {
    // Use promise-based lock to prevent concurrent syncs (race condition fix)
    if (this.syncPromise) {
      return this.syncPromise; // Return existing sync promise
    }

    this.syncPromise = this.doSync();

    try {
      await this.syncPromise;
    } finally {
      this.syncPromise = null;
    }
  }

  private async doSync(): Promise<void> {
    const queueSize = await offlineQueue.getQueueSize();

    if (queueSize === 0) {
      this.state = 'idle';
      useSyncStore.setState({ isSyncing: false, syncProgress: null });
      return;
    }

    this.state = 'syncing';
    useSyncStore.setState({ isSyncing: true });

    try {
      await this.performSync();
      this.state = 'idle';
      this.currentRetryAttempt = 0;
      useSyncStore.setState({
        isSyncing: false,
        lastSyncError: null,
        lastSyncTime: new Date(),
        syncProgress: null,
      });
    } catch (error) {
      this.state = 'error';
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during sync';
      useSyncStore.setState({
        isSyncing: false,
        lastSyncError: errorMessage,
        syncProgress: null,
      });

      // Schedule retry with exponential backoff
      this.scheduleRetry();
    }
  }

  private async performSync(): Promise<void> {
    const checkins = await offlineQueue.getQueuedCheckins();

    if (checkins.length === 0) {
      return;
    }

    const totalBatches = Math.ceil(checkins.length / BATCH_SIZE);

    for (let i = 0; i < checkins.length; i += BATCH_SIZE) {
      const batch = checkins.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

      // Update progress
      useSyncStore.setState({
        syncProgress: {
          current: batchIndex,
          total: totalBatches,
        },
      });

      await this.syncBatch(batch);
    }
  }

  private async syncBatch(batch: QueuedCheckin[]): Promise<void> {
    const payload: BulkCheckinPayload = {
      checkins: batch.map((checkin) => ({
        serialNumber: checkin.serialNumber,
        timestamp: checkin.timestamp,
        kioskId: checkin.kioskId,
        localTimestamp: checkin.localTimestamp,
        sequenceNumber: checkin.sequenceNumber,
      })),
    };

    try {
      const apiUrl = getApiBaseUrl();
      const response = await axios.post<BulkCheckinResponse>(
        `${apiUrl}/checkins/bulk`,
        payload,
        { timeout: 15000 }
      );

      if (response.data.success) {
        // Remove successfully synced items from queue
        const successfulIds = batch
          .filter((item) => !response.data.errors.find((err) => err.id === item.id))
          .map((item) => item.id);

        await offlineQueue.markAsSynced(successfulIds);

        // Update queue size
        await this.updateQueueSize();
      } else {
        throw new Error(
          `Sync failed: ${response.data.errors.length} items failed to process`
        );
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Authentication failed - cannot sync checkins');
        }
        throw new Error(
          `Network error: ${error.response?.status || error.code || 'Unknown'}`
        );
      }
      throw error;
    }
  }

  private scheduleRetry(): void {
    const delayIndex = Math.min(
      this.currentRetryAttempt,
      RETRY_DELAYS.length - 1
    );
    const delay = RETRY_DELAYS[delayIndex];

    this.currentRetryAttempt += 1;

    setTimeout(() => {
      if (this.isRunning && useSyncStore.getState().isBackendReachable) {
        this.syncNow();
      }
    }, delay);
  }

  private setupNetworkMonitoring(): void {
    // Create handler references that can be removed later
    this.handleOnlineRef = async (): Promise<void> => {
      useSyncStore.setState({ isOnline: true });
      const isReachable = await this.checkBackendReachability();
      useSyncStore.setState({ isBackendReachable: isReachable });

      if (isReachable && this.state !== 'syncing') {
        await this.syncNow();
      }
    };

    this.handleOfflineRef = (): void => {
      useSyncStore.setState({ isOnline: false, isBackendReachable: false });
    };

    window.addEventListener('online', this.handleOnlineRef);
    window.addEventListener('offline', this.handleOfflineRef);

    // Set up periodic backend reachability checks
    this.networkCheckInterval = setInterval(async () => {
      if (navigator.onLine) {
        const isReachable = await this.checkBackendReachability();
        useSyncStore.setState({ isBackendReachable: isReachable });

        if (isReachable && this.state === 'error') {
          await this.syncNow();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private async checkBackendReachability(): Promise<boolean> {
    try {
      const apiUrl = getApiBaseUrl();
      const response = await axios.get(`${apiUrl}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private async updateQueueSize(): Promise<void> {
    const size = await offlineQueue.getQueueSize();
    useSyncStore.setState({ queueSize: size });
  }

  private setupPeriodicCleanup(): void {
    // Clean expired items every 6 hours
    this.cleanupInterval = setInterval(async () => {
      try {
        await offlineQueue.cleanExpired();
        await this.updateQueueSize();
      } catch (error) {
        console.error('[SyncService] Failed to clean expired items:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
  }
}

// Export singleton instance
export const syncService = new SyncService();
