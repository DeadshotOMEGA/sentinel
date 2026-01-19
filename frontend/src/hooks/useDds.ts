import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { api } from '../lib/api';

export interface DdsMember {
  id: string;
  name: string;
  rank: string;
  division: string | null;
}

export type DdsStatus = 'pending' | 'active' | 'released' | 'transferred';

export interface DdsAssignment {
  assignmentId: string;
  member: DdsMember;
  status: DdsStatus;
  assignedDate: string;
  acceptedAt: string | null;
  assignedBy: string | null;
}

// WebSocket event matches backend structure - receives assignment directly
type DdsUpdateEvent = DdsAssignment;

interface UseDdsResult {
  dds: DdsAssignment | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isConnected: boolean;
}

export function useDds(): UseDdsResult {
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated, token } = useAuth();
  const [dds, setDds] = useState<DdsAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch current DDS on mount
  const fetchDds = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<{ dds: DdsAssignment | null }>('/dds/current');
      setDds(response.data.dds);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(apiError.response?.data?.error?.message ?? 'Failed to fetch DDS assignment');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchDds();
  }, [fetchDds]);

  // Update DDS state from WebSocket event
  const updateDds = useCallback((event: DdsUpdateEvent) => {
    setDds(event);
  }, []);

  // Set up WebSocket connection
  useEffect(() => {
    const isDev = import.meta.env.DEV;

    // In dev mode, allow connection without auth (backend auto-authenticates)
    if (!isDev && (!isAuthenticated || !token)) return;

    socketRef.current = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: isDev ? {} : { token },
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      // Subscribe to presence room which receives DDS updates
      socketRef.current?.emit('subscribe_presence');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for DDS update events
    socketRef.current.on('dds_update', (event: DdsUpdateEvent) => {
      updateDds(event);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated, token, updateDds]);

  return {
    dds,
    isLoading,
    error,
    refetch: fetchDds,
    isConnected,
  };
}
