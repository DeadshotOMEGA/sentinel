import axios, { AxiosError } from 'axios';
import type { CheckinResult } from '../state/kiosk-state';
import { offlineQueue } from '../services/offline-queue';
import { useSyncStore } from '../state/sync-state';

const API_BASE_URL = import.meta.env.VITE_API_URL;
if (!API_BASE_URL) {
  throw new Error('VITE_API_URL environment variable is not set');
}

const KIOSK_API_KEY = import.meta.env.VITE_KIOSK_API_KEY;
if (!KIOSK_API_KEY) {
  throw new Error('VITE_KIOSK_API_KEY environment variable is not set');
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'X-Kiosk-API-Key': KIOSK_API_KEY,
  },
});

interface CheckinApiResponse {
  checkin: {
    id: string;
    memberId: string;
    badgeId: string;
    direction: 'in' | 'out';
    timestamp: string;
  };
  member: {
    id: string;
    firstName: string;
    lastName: string;
    rank: string;
    serviceNumber: string;
    division: {
      id: string;
      name: string;
      code: string;
    };
  };
  direction: 'in' | 'out';
}

export interface QueuedCheckinResult {
  queued: true;
  message: string;
}

export async function scanBadge(
  serialNumber: string,
  kioskId: string
): Promise<CheckinResult | QueuedCheckinResult> {
  const syncState = useSyncStore.getState();

  // If we know we're offline, queue immediately
  if (!syncState.isOnline || !syncState.isBackendReachable) {
    await offlineQueue.addToQueue(serialNumber, kioskId);
    const size = await offlineQueue.getQueueSize();
    useSyncStore.getState().setQueueSize(size);
    return {
      queued: true,
      message: 'Scan saved offline. Will sync when connected.',
    };
  }

  try {
    const response = await api.post<CheckinApiResponse>('/checkins', {
      serialNumber,
      kioskId,
      timestamp: new Date().toISOString(),
    });

    return {
      memberName: `${response.data.member.firstName} ${response.data.member.lastName}`,
      rank: response.data.member.rank,
      division: response.data.member.division.name,
      direction: response.data.direction,
      timestamp: response.data.checkin.timestamp,
    };
  } catch (error) {
    // Network error - queue for later sync
    if (error instanceof AxiosError && !error.response) {
      await offlineQueue.addToQueue(serialNumber, kioskId);
      const size = await offlineQueue.getQueueSize();
      useSyncStore.getState().setQueueSize(size);
      useSyncStore.getState().setOnline(false);
      return {
        queued: true,
        message: 'Network error. Scan saved offline.',
      };
    }
    throw error;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    await api.get('/health', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

interface VisitorPayload {
  name: string;
  organization: string;
  visitType: string;
  purpose?: string;
  eventId?: string;
}

interface VisitorResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    organization: string;
    timestamp: string;
  };
}

export async function recordVisitor(
  visitor: VisitorPayload,
  kioskId: string
): Promise<void> {
  await api.post<VisitorResponse>('/visitors', {
    ...visitor,
    kioskId,
  });
}
