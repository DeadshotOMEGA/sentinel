/**
 * LogViewer Component
 *
 * Displays a table of log events with level indicators and truncated messages.
 * Uses extracted log formatting utilities for consistent display.
 */

import { useRef, useEffect } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Spinner,
} from '@heroui/react';
import type { LogEvent } from '../../types';
import {
  getLogLevelColor,
  formatLogTime,
  truncateId,
  truncateMessage,
  getLogLevelLabel,
} from '../../utils/log-formatting';

export interface LogViewerProps {
  /** Array of log events to display */
  logs: LogEvent[];
  /** Whether logs are currently loading */
  isLoading?: boolean;
  /** Whether to auto-scroll to newest logs */
  autoScroll: boolean;
  /** Callback when a log entry is selected */
  onSelectLog: (log: LogEvent) => void;
}

/** Log with index for table key */
interface LogWithIndex extends LogEvent {
  _index: number;
}

/**
 * LogViewer displays a scrollable table of log events.
 * Supports auto-scrolling to newest entries and selection for detail view.
 */
export function LogViewer({ logs, isLoading, autoScroll, onSelectLog }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top (newest logs) when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [logs.length, autoScroll]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner label="Connecting to log stream..." />
      </div>
    );
  }

  const logsWithIndex: LogWithIndex[] = logs.map((log, index) => ({
    ...log,
    _index: index,
  }));

  return (
    <div ref={containerRef} className="-mx-1 -mt-1 flex-1 overflow-auto px-1 pt-1">
      <Table
        aria-label="Log events"
        isHeaderSticky
        classNames={{
          base: 'max-h-full',
          wrapper: 'min-h-[400px]',
          tr: 'cursor-pointer hover:bg-default-100',
        }}
        selectionMode="single"
        onRowAction={(key) => {
          const index = parseInt(String(key).replace('log-', ''), 10);
          if (!isNaN(index) && logs[index]) {
            onSelectLog(logs[index]);
          }
        }}
      >
        <TableHeader>
          <TableColumn key="time" width={100}>
            TIME
          </TableColumn>
          <TableColumn key="level" width={80}>
            LEVEL
          </TableColumn>
          <TableColumn key="module" width={80}>
            MODULE
          </TableColumn>
          <TableColumn key="event" width={120}>
            EVENT
          </TableColumn>
          <TableColumn key="message">MESSAGE</TableColumn>
          <TableColumn key="requestId" width={100}>
            REQ ID
          </TableColumn>
        </TableHeader>
        <TableBody
          emptyContent="No logs to display. Logs will appear here when activity occurs."
          items={logsWithIndex}
        >
          {(log) => (
            <TableRow key={`log-${log._index}`}>
              <TableCell>
                <span className="font-mono text-xs text-default-500">
                  {formatLogTime(log.ts)}
                </span>
              </TableCell>
              <TableCell>
                <Chip
                  color={getLogLevelColor(log.level)}
                  size="sm"
                  variant="flat"
                  classNames={{
                    base: 'h-5',
                    content: 'text-xs font-medium',
                  }}
                >
                  {getLogLevelLabel(log.level)}
                </Chip>
              </TableCell>
              <TableCell>
                {log.module ? (
                  <span className="text-xs">{log.module}</span>
                ) : (
                  <span className="text-xs text-default-400">-</span>
                )}
              </TableCell>
              <TableCell>
                {log.event ? (
                  <span className="font-mono text-xs text-default-600">{log.event}</span>
                ) : (
                  <span className="text-xs text-default-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm">{truncateMessage(log.msg)}</span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-default-500">
                  {truncateId(log.requestId || log.correlationId)}
                </span>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default LogViewer;
