import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Checkbox, Input, Button, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useDevStore } from '../store/dev-store';
import type { NetworkLogEntry } from '@shared/types/dev-mode';

// ============================================================================
// Type Definitions
// ============================================================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type StatusCategory = '2xx' | '4xx' | '5xx';

interface MethodFilterState {
  GET: boolean;
  POST: boolean;
  PUT: boolean;
  DELETE: boolean;
  PATCH: boolean;
}

interface StatusFilterState {
  '2xx': boolean;
  '4xx': boolean;
  '5xx': boolean;
}

// ============================================================================
// Constants
// ============================================================================

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-success',
  POST: 'text-primary',
  PUT: 'text-warning',
  DELETE: 'text-danger',
  PATCH: 'text-secondary',
};

const STATUS_COLORS: Record<StatusCategory, string> = {
  '2xx': 'text-success',
  '4xx': 'text-warning',
  '5xx': 'text-danger',
};

const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
];

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusCategory(status: number): StatusCategory {
  if (status >= 200 && status < 300) return '2xx';
  if (status >= 400 && status < 500) return '4xx';
  return '5xx';
}

function truncateUrl(url: string, maxLength = 40): string {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength - 3) + '...';
}

function formatJson(value: unknown): string {
  if (value === undefined || value === null) return 'N/A';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function filterSensitiveHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> {
  if (!headers) return {};
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      filtered[key] = '[REDACTED]';
    } else {
      filtered[key] = value;
    }
  }
  return filtered;
}

// ============================================================================
// NetworkMonitor Component
// ============================================================================

export function NetworkMonitor() {
  const { networkLog, clearNetworkLog } = useDevStore();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const [urlFilter, setUrlFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState<MethodFilterState>({
    GET: true,
    POST: true,
    PUT: true,
    DELETE: true,
    PATCH: true,
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilterState>({
    '2xx': true,
    '4xx': true,
    '5xx': true,
  });

  const tableBodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest entry
  useEffect(() => {
    if (autoScroll && tableBodyRef.current && networkLog.length > 0) {
      tableBodyRef.current.scrollTop = 0;
    }
  }, [networkLog.length, autoScroll]);

  // Filter network log entries
  const filteredLog = useMemo(() => {
    return networkLog.filter((entry) => {
      // Method filter
      const method = entry.method.toUpperCase() as HttpMethod;
      if (method in methodFilter && !methodFilter[method]) {
        return false;
      }

      // Status filter
      const statusCategory = getStatusCategory(entry.status);
      if (!statusFilter[statusCategory]) {
        return false;
      }

      // URL pattern filter
      if (urlFilter && !entry.url.toLowerCase().includes(urlFilter.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [networkLog, methodFilter, statusFilter, urlFilter]);

  // Toggle method filter
  const handleMethodToggle = useCallback((method: HttpMethod) => {
    setMethodFilter((prev) => ({
      ...prev,
      [method]: !prev[method],
    }));
  }, []);

  // Toggle status filter
  const handleStatusToggle = useCallback((status: StatusCategory) => {
    setStatusFilter((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  }, []);

  // Toggle row expansion
  const handleRowClick = useCallback((id: string) => {
    setExpandedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Clear all
  const handleClear = useCallback(() => {
    clearNetworkLog();
    setExpandedKeys(new Set());
  }, [clearNetworkLog]);

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Method filters */}
        <div className="flex items-center gap-1">
          {(['GET', 'POST', 'PUT', 'DELETE'] as const).map((method) => (
            <Checkbox
              key={method}
              size="sm"
              isSelected={methodFilter[method]}
              onValueChange={() => handleMethodToggle(method)}
              classNames={{
                label: `text-[10px] ${METHOD_COLORS[method]}`,
                wrapper: 'h-4 w-4',
              }}
            >
              {method}
            </Checkbox>
          ))}
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 border-l border-default-600 pl-2">
          {(['2xx', '4xx', '5xx'] as const).map((status) => (
            <Checkbox
              key={status}
              size="sm"
              isSelected={statusFilter[status]}
              onValueChange={() => handleStatusToggle(status)}
              classNames={{
                label: `text-[10px] ${STATUS_COLORS[status]}`,
                wrapper: 'h-4 w-4',
              }}
            >
              {status}
            </Checkbox>
          ))}
        </div>
      </div>

      {/* URL search and actions */}
      <div className="flex items-center gap-2">
        <Input
          size="sm"
          placeholder="Filter by URL..."
          value={urlFilter}
          onValueChange={setUrlFilter}
          startContent={<Icon icon="solar:magnifer-linear" width={14} className="text-default-400" />}
          classNames={{
            base: 'flex-1',
            input: 'text-xs',
            inputWrapper: 'h-7 min-h-7 bg-default-800 border-default-600',
          }}
        />
        <Button
          size="sm"
          variant="flat"
          color={autoScroll ? 'success' : 'default'}
          onPress={() => setAutoScroll(!autoScroll)}
          className="h-7 min-w-0 px-2"
          aria-label={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
        >
          <Icon icon="solar:arrow-down-linear" width={14} />
        </Button>
        <Button
          size="sm"
          variant="flat"
          color="danger"
          onPress={handleClear}
          className="h-7 min-w-0 px-2"
          aria-label="Clear all"
        >
          <Icon icon="solar:trash-bin-trash-linear" width={14} />
        </Button>
      </div>

      {/* Request list */}
      <div ref={tableBodyRef} className="flex-1 overflow-auto">
        {filteredLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-default-400">
            <Icon icon="solar:routing-2-bold" width={32} className="mb-2" />
            <p className="text-sm">No requests captured</p>
            <p className="text-xs">Network activity will appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLog.map((entry) => (
              <NetworkRequestRow
                key={entry.id}
                entry={entry}
                isExpanded={expandedKeys.has(entry.id)}
                onToggle={() => handleRowClick(entry.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="flex items-center justify-between border-t border-default-700 pt-1 text-[10px] text-default-500">
        <span>
          {filteredLog.length} / {networkLog.length} requests
        </span>
        <span>Max: 50</span>
      </div>
    </div>
  );
}

// ============================================================================
// NetworkRequestRow Component
// ============================================================================

interface NetworkRequestRowProps {
  entry: NetworkLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function NetworkRequestRow({ entry, isExpanded, onToggle }: NetworkRequestRowProps) {
  const method = entry.method.toUpperCase() as HttpMethod;
  const statusCategory = getStatusCategory(entry.status);
  const methodColor = METHOD_COLORS[method] || 'text-default-500';
  const statusColor = STATUS_COLORS[statusCategory];

  // Extract headers from the entry if available (extended type)
  const extendedEntry = entry as NetworkLogEntry & {
    requestHeaders?: Record<string, string>;
  };

  return (
    <div className="rounded border border-default-700 bg-default-800/50">
      {/* Summary row */}
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-default-700/50"
        onClick={onToggle}
      >
        <Icon
          icon={isExpanded ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
          width={12}
          className="text-default-400"
        />
        <span className={`w-12 text-[10px] font-mono font-semibold ${methodColor}`}>
          {method}
        </span>
        <span className="flex-1 truncate text-[11px] font-mono text-default-300" title={entry.url}>
          {truncateUrl(entry.url)}
        </span>
        <Chip
          size="sm"
          variant="flat"
          className={`h-4 min-w-0 px-1 text-[10px] ${statusColor}`}
          classNames={{
            base: 'bg-transparent',
          }}
        >
          {entry.status}
        </Chip>
        <span className="w-14 text-right text-[10px] text-default-500">
          {entry.duration}ms
        </span>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-default-700 p-2 space-y-2">
          {/* Full URL */}
          <DetailSection title="Full URL">
            <span className="font-mono break-all text-default-300 text-[10px]">
              {entry.url}
            </span>
          </DetailSection>

          {/* Request Headers */}
          {extendedEntry.requestHeaders && Object.keys(extendedEntry.requestHeaders).length > 0 && (
            <DetailSection title="Request Headers">
              <pre className="whitespace-pre-wrap text-default-300 text-[10px] font-mono max-h-24 overflow-auto">
                {formatJson(filterSensitiveHeaders(extendedEntry.requestHeaders))}
              </pre>
            </DetailSection>
          )}

          {/* Request Body */}
          {entry.requestBody !== undefined && (
            <DetailSection title="Request Body">
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-default-300 text-[10px] font-mono">
                {formatJson(entry.requestBody)}
              </pre>
            </DetailSection>
          )}

          {/* Response Body */}
          {entry.responseBody !== undefined && (
            <DetailSection title="Response Body">
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-default-300 text-[10px] font-mono">
                {formatJson(entry.responseBody)}
              </pre>
            </DetailSection>
          )}

          {/* Error */}
          {entry.error && (
            <DetailSection title="Error">
              <span className="text-danger font-mono text-[10px]">{entry.error}</span>
            </DetailSection>
          )}

          {/* Timestamp */}
          <div className="pt-1 text-[9px] text-default-500 border-t border-default-700">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DetailSection Component
// ============================================================================

interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
}

function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <div className="rounded bg-default-800 p-2">
      <div className="text-[9px] text-default-500 mb-1">{title}</div>
      {children}
    </div>
  );
}
