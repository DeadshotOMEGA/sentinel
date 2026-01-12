import { useState, useCallback } from 'react';
import {
  Button,
  ButtonGroup,
  Chip,
  Card,
  CardBody,
} from '@heroui/react';
import PageWrapper from '../components/PageWrapper';
import { LogFilters } from '../components/logs/LogFilters';
import { LogViewer } from '../components/logs/LogViewer';
import { LogDetailDrawer } from '../components/logs/LogDetailDrawer';
import { useLogStream } from '../hooks/useLogStream';
import type { LogEvent, LogFilter } from '../../../shared/types';

export default function Logs() {
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    logs,
    isConnected,
    isPaused,
    isEnabled,
    pause,
    resume,
    clear,
    updateFilter,
    filter,
  } = useLogStream();

  const handleSelectLog = useCallback((log: LogEvent) => {
    setSelectedLog(log);
    setIsDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handleFilterChange = useCallback(
    (newFilter: LogFilter) => {
      updateFilter(newFilter);
    },
    [updateFilter]
  );

  const handleExport = useCallback(() => {
    const json = JSON.stringify(logs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  // Show warning if not enabled (production or non-admin)
  if (!isEnabled) {
    return (
      <PageWrapper title="Logs">
        <Card className="mx-auto max-w-xl">
          <CardBody className="text-center">
            <h2 className="mb-2 text-lg font-semibold">
              Live Logs Not Available
            </h2>
            <p className="text-default-500">
              Live log streaming is only available in development mode for admin
              users.
            </p>
            <p className="mt-2 text-sm text-default-400">
              Set <code className="rounded bg-default-100 px-1">NODE_ENV=development</code> and{' '}
              <code className="rounded bg-default-100 px-1">ENABLE_LIVE_LOGS=true</code> on the
              backend to enable this feature.
            </p>
          </CardBody>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Logs">
      <div className="flex flex-1 flex-col gap-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <Chip
            color={isConnected ? 'success' : 'danger'}
            variant="dot"
            size="sm"
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </Chip>

          {/* Live/Paused Indicator */}
          {isConnected && (
            <Chip
              color={isPaused ? 'warning' : 'primary'}
              variant="flat"
              size="sm"
            >
              {isPaused ? 'Paused' : 'Live'}
            </Chip>
          )}

          {/* Log Count */}
          <span className="text-sm text-default-500">
            {logs.length} logs
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <ButtonGroup size="sm">
            {isPaused ? (
              <Button color="primary" onPress={resume}>
                Resume
              </Button>
            ) : (
              <Button color="warning" variant="flat" onPress={pause}>
                Pause
              </Button>
            )}
            <Button variant="flat" onPress={clear}>
              Clear
            </Button>
          </ButtonGroup>
          <Button
            size="sm"
            variant="bordered"
            onPress={handleExport}
            isDisabled={logs.length === 0}
          >
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <LogFilters
        filter={filter}
        onFilterChange={handleFilterChange}
        autoScroll={autoScroll}
        onAutoScrollChange={setAutoScroll}
      />

      {/* Log Viewer */}
      <LogViewer
        logs={logs}
        isLoading={!isConnected}
        autoScroll={autoScroll}
        onSelectLog={handleSelectLog}
      />

      {/* Detail Drawer */}
      <LogDetailDrawer
        log={selectedLog}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
      </div>
    </PageWrapper>
  );
}
