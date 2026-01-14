import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardBody, Chip, Button, Divider } from '@heroui/react';
import { Icon } from '@iconify/react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';

// ============================================================================
// Types
// ============================================================================

type ConnectionState = 'connected' | 'disconnected' | 'connecting';

interface QueryCacheEntry {
  queryKey: string[];
  isStale: boolean;
  dataUpdatedAt: number;
}

interface JsonTreeNodeProps {
  label: string;
  value: unknown;
  depth?: number;
}

// ============================================================================
// JSON Tree Component (Recursive)
// ============================================================================

function JsonTreeNode({ label, value, depth = 0 }: JsonTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isExpandable = typeof value === 'object' && value !== null;
  const entries = isExpandable ? Object.entries(value) : [];

  const copyValue = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(value, null, 2));
  }, [value]);

  const getValueDisplay = () => {
    if (value === null) return <span className="text-warning">null</span>;
    if (value === undefined) return <span className="text-default-400">undefined</span>;
    if (typeof value === 'boolean') {
      return <span className="text-primary">{value ? 'true' : 'false'}</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-success">{value}</span>;
    }
    if (typeof value === 'string') {
      const displayValue = value.length > 50 ? `${value.slice(0, 50)}...` : value;
      return <span className="text-danger">"{displayValue}"</span>;
    }
    if (Array.isArray(value)) {
      return <span className="text-default-400">[{value.length}]</span>;
    }
    return <span className="text-default-400">{'{...}'}</span>;
  };

  if (!isExpandable) {
    return (
      <div className="flex items-center gap-1.5 py-0.5 group" style={{ paddingLeft: depth * 12 }}>
        <span className="text-default-300 text-xs">{label}:</span>
        <span className="text-xs font-mono">{getValueDisplay()}</span>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="opacity-0 group-hover:opacity-100 w-4 h-4 min-w-4"
          onPress={copyValue}
          aria-label="Copy value"
        >
          <Icon icon="solar:copy-linear" width={10} />
        </Button>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <div
        className="flex items-center gap-1 py-0.5 cursor-pointer group hover:bg-default-800/50 rounded"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon
          icon={expanded ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
          width={12}
          className="text-default-400"
        />
        <span className="text-default-300 text-xs">{label}:</span>
        <span className="text-xs font-mono">{getValueDisplay()}</span>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="opacity-0 group-hover:opacity-100 w-4 h-4 min-w-4"
          onPress={copyValue}
          aria-label="Copy value"
        >
          <Icon icon="solar:copy-linear" width={10} />
        </Button>
      </div>
      {expanded && (
        <div>
          {entries.map(([key, val]) => (
            <JsonTreeNode key={key} label={key} value={val} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WebSocket Monitor Hook
// ============================================================================

function useWebSocketMonitor() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const isDev = import.meta.env.DEV;

    setConnectionState('connecting');

    socketRef.current = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: isDev ? {} : { token },
      reconnection: true,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setConnectionState('connected');
      setReconnectAttempts(0);
    });

    socket.on('disconnect', () => {
      setConnectionState('disconnected');
    });

    socket.on('reconnect_attempt', (attempt: number) => {
      setConnectionState('connecting');
      setReconnectAttempts(attempt);
    });

    // Listen for any event to track last activity
    const originalOnAny = socket.onAny;
    socket.onAny(() => {
      setLastEventTime(Date.now());
    });

    return () => {
      socket.offAny(originalOnAny);
      socket.disconnect();
    };
  }, [token]);

  return { connectionState, lastEventTime, reconnectAttempts };
}

// ============================================================================
// Section Components
// ============================================================================

function AuthStateSection() {
  const { user, token, isAuthenticated, isLoading } = useAuth();

  return (
    <Card className="bg-default-800/50 border border-default-700">
      <CardBody className="gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-default-300">Auth State</span>
          <Chip
            size="sm"
            color={isAuthenticated ? 'success' : 'danger'}
            variant="flat"
            className="h-5 text-[10px]"
          >
            {isLoading ? 'Loading' : isAuthenticated ? 'Authenticated' : 'Not Auth'}
          </Chip>
        </div>
        <Divider className="bg-default-700" />
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-default-400">User</span>
            <span className="text-default-200 font-mono">
              {user ? `${user.firstName} ${user.lastName}` : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-default-400">Role</span>
            <Chip
              size="sm"
              color={user?.role === 'admin' ? 'primary' : 'default'}
              variant="flat"
              className="h-4 text-[9px]"
            >
              {user?.role ?? '-'}
            </Chip>
          </div>
          <div className="flex justify-between">
            <span className="text-default-400">Token</span>
            <span className="text-default-200 font-mono">{token ? 'present' : 'none'}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ReactQueryCacheSection() {
  const queryClient = useQueryClient();
  const [queries, setQueries] = useState<QueryCacheEntry[]>([]);

  const refreshCache = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const allQueries = cache.getAll();

    const entries: QueryCacheEntry[] = allQueries.map((query) => ({
      queryKey: query.queryKey as string[],
      isStale: query.isStale(),
      dataUpdatedAt: query.state.dataUpdatedAt,
    }));

    setQueries(entries);
  }, [queryClient]);

  useEffect(() => {
    refreshCache();
    const interval = setInterval(refreshCache, 2000);
    return () => clearInterval(interval);
  }, [refreshCache]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
    refreshCache();
  }, [queryClient, refreshCache]);

  const activeQueries = queries.filter((q) => q.dataUpdatedAt > 0);

  return (
    <Card className="bg-default-800/50 border border-default-700">
      <CardBody className="gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-default-300">React Query Cache</span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="flat"
              color="default"
              className="h-5 text-[10px] px-2 min-w-0"
              onPress={refreshCache}
            >
              <Icon icon="solar:refresh-linear" width={10} />
            </Button>
            <Button
              size="sm"
              variant="flat"
              color="warning"
              className="h-5 text-[10px] px-2 min-w-0"
              onPress={invalidateAll}
            >
              Invalidate All
            </Button>
          </div>
        </div>
        <Divider className="bg-default-700" />
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {activeQueries.length === 0 ? (
            <div className="text-xs text-default-400 text-center py-2">No active queries</div>
          ) : (
            activeQueries.map((query, idx) => (
              <div key={idx} className="flex items-center justify-between text-[10px]">
                <span className="text-default-300 font-mono truncate flex-1 mr-2">
                  {JSON.stringify(query.queryKey)}
                </span>
                <Chip
                  size="sm"
                  color={query.isStale ? 'warning' : 'success'}
                  variant="flat"
                  className="h-4 text-[9px]"
                >
                  {query.isStale ? 'stale' : 'fresh'}
                </Chip>
              </div>
            ))
          )}
        </div>
        <div className="text-[10px] text-default-500">
          {activeQueries.length} active queries
        </div>
      </CardBody>
    </Card>
  );
}

function WebSocketSection() {
  const { connectionState, lastEventTime, reconnectAttempts } = useWebSocketMonitor();

  const getConnectionColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'disconnected':
        return 'danger';
    }
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <Card className="bg-default-800/50 border border-default-700">
      <CardBody className="gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-default-300">WebSocket</span>
          <Chip
            size="sm"
            color={getConnectionColor()}
            variant="flat"
            className="h-5 text-[10px]"
          >
            {connectionState}
          </Chip>
        </div>
        <Divider className="bg-default-700" />
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-default-400">Last Event</span>
            <span className="text-default-200 font-mono">{formatTime(lastEventTime)}</span>
          </div>
          {reconnectAttempts > 0 && (
            <div className="flex justify-between">
              <span className="text-default-400">Reconnect Attempts</span>
              <span className="text-warning font-mono">{reconnectAttempts}</span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function RouteInfoSection() {
  const location = useLocation();
  const params = useParams();

  const routeParams = useMemo(() => Object.entries(params), [params]);

  return (
    <Card className="bg-default-800/50 border border-default-700">
      <CardBody className="gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-default-300">Route Info</span>
          <Icon icon="solar:routing-2-linear" width={14} className="text-default-400" />
        </div>
        <Divider className="bg-default-700" />
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-default-400">Path</span>
            <span className="text-default-200 font-mono truncate max-w-[180px]">
              {location.pathname}
            </span>
          </div>
          {location.search && (
            <div className="flex justify-between">
              <span className="text-default-400">Search</span>
              <span className="text-default-200 font-mono truncate max-w-[180px]">
                {location.search}
              </span>
            </div>
          )}
          {routeParams.length > 0 && (
            <>
              <div className="text-default-400 mt-1">Params:</div>
              {routeParams.map(([key, value]) => (
                <div key={key} className="flex justify-between pl-2">
                  <span className="text-default-500">{key}</span>
                  <span className="text-default-200 font-mono">{value}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function ExpandableStateSection() {
  const { user, token, isAuthenticated } = useAuth();
  const location = useLocation();
  const params = useParams();

  const appState = useMemo(
    () => ({
      auth: {
        isAuthenticated,
        hasToken: !!token,
        user: user
          ? {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              email: user.email,
            }
          : null,
      },
      route: {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        params,
      },
    }),
    [user, token, isAuthenticated, location, params]
  );

  return (
    <Card className="bg-default-800/50 border border-default-700">
      <CardBody className="gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-default-300">Full State Tree</span>
          <Button
            size="sm"
            variant="flat"
            color="default"
            className="h-5 text-[10px] px-2 min-w-0"
            onPress={() => {
              navigator.clipboard.writeText(JSON.stringify(appState, null, 2));
            }}
          >
            <Icon icon="solar:copy-linear" width={10} className="mr-1" />
            Copy All
          </Button>
        </div>
        <Divider className="bg-default-700" />
        <div className="max-h-48 overflow-y-auto">
          {Object.entries(appState).map(([key, value]) => (
            <JsonTreeNode key={key} label={key} value={value} depth={0} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Main StateInspector Component
// ============================================================================

export function StateInspector() {
  return (
    <div className="space-y-3">
      <AuthStateSection />
      <ReactQueryCacheSection />
      <WebSocketSection />
      <RouteInfoSection />
      <ExpandableStateSection />
    </div>
  );
}
