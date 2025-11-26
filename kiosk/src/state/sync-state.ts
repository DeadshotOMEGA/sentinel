import { create } from 'zustand';

export interface SyncProgress {
  current: number;
  total: number;
}

export interface SyncState {
  isOnline: boolean;
  isBackendReachable: boolean;
  isSyncing: boolean;
  queueSize: number;
  syncProgress: SyncProgress | null;
  lastSyncError: string | null;
  lastSyncTime: Date | null;

  // Actions
  setOnline: (online: boolean) => void;
  setBackendReachable: (reachable: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setQueueSize: (size: number) => void;
  setSyncProgress: (progress: SyncProgress | null) => void;
  setSyncError: (error: string | null) => void;
  setSyncTime: (time: Date) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isBackendReachable: true,
  isSyncing: false,
  queueSize: 0,
  syncProgress: null,
  lastSyncError: null,
  lastSyncTime: null,

  setOnline: (online) => set({ isOnline: online }),

  setBackendReachable: (reachable) => set({ isBackendReachable: reachable }),

  setSyncing: (syncing) =>
    set({
      isSyncing: syncing,
      syncProgress: syncing ? { current: 0, total: 0 } : null,
    }),

  setQueueSize: (size) => set({ queueSize: size }),

  setSyncProgress: (progress) => set({ syncProgress: progress }),

  setSyncError: (error) => set({ lastSyncError: error }),

  setSyncTime: (time) => set({ lastSyncTime: time }),
}));
