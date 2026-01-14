import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Tabs,
  Tab,
  Spinner,
  Chip,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { useDevStore } from '../store/dev-store';
import { ErrorInjector } from './ErrorInjector';
import { FeatureToggles } from './FeatureToggles';
import { MockScanPanel } from './MockScanPanel';
import { NetworkMonitor } from './NetworkMonitor';
import { StateInspector } from './StateInspector';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import type { SeedScenario, SeedResult } from '@shared/types/dev-mode';

// ============================================================================
// Type Definitions
// ============================================================================

interface ScenarioMetadata {
  id: SeedScenario;
  name: string;
  description: string;
}

interface ScenariosResponse {
  scenarios: ScenarioMetadata[];
}

// ============================================================================
// Seeds Tab Component
// ============================================================================

function SeedsTab() {
  const [scenarios, setScenarios] = useState<ScenarioMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [applyingScenario, setApplyingScenario] = useState<SeedScenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SeedResult | null>(null);

  // Fetch scenarios on mount
  useEffect(() => {
    async function fetchScenarios() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<ScenariosResponse>('/dev-tools/scenarios');
        setScenarios(response.data.scenarios);
      } catch (err) {
        const error = err as { response?: { data?: { error?: string } }; message?: string };
        const errorMessage = error.response?.data?.error ?? error.message ?? 'Failed to fetch scenarios';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    fetchScenarios();
  }, []);

  const handleApplyScenario = async (scenarioId: SeedScenario) => {
    setApplyingScenario(scenarioId);
    setLastResult(null);
    try {
      const response = await api.post<SeedResult>('/dev-tools/seed-scenario', {
        scenario: scenarioId,
      });
      setLastResult(response.data);
      toast.success(`Scenario "${scenarioId}" applied successfully`);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = error.response?.data?.error ?? error.message ?? 'Failed to apply scenario';
      toast.error(errorMessage);
    } finally {
      setApplyingScenario(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-danger">
        <Icon icon="solar:danger-triangle-bold" width={32} className="mb-2" />
        <p className="text-sm">{error}</p>
        <Button
          size="sm"
          variant="flat"
          color="danger"
          className="mt-2"
          onPress={() => {
            setError(null);
            setIsLoading(true);
            api
              .get<ScenariosResponse>('/dev-tools/scenarios')
              .then((res) => setScenarios(res.data.scenarios))
              .catch((e) => {
                const err = e as { response?: { data?: { error?: string } }; message?: string };
                setError(err.response?.data?.error ?? err.message ?? 'Failed to fetch');
              })
              .finally(() => setIsLoading(false));
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lastResult && (
        <div className="rounded-lg border border-success-200 bg-success-50 p-3">
          <div className="flex items-center gap-2 text-success-700">
            <Icon icon="solar:check-circle-bold" width={16} />
            <span className="text-sm font-medium">Applied: {lastResult.scenario}</span>
          </div>
          <div className="mt-1 text-xs text-success-600">
            Created: {lastResult.created.members} members, {lastResult.created.checkins} check-ins,{' '}
            {lastResult.created.visitors} visitors, {lastResult.created.events} events
          </div>
          <div className="mt-1 text-xs text-default-400">
            Duration: {lastResult.duration}ms
          </div>
        </div>
      )}

      {scenarios.map((scenario) => (
        <div
          key={scenario.id}
          className="rounded-lg border border-default-200 bg-default-50 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-default-700">{scenario.name}</p>
              <p className="text-xs text-default-500 mt-0.5">{scenario.description}</p>
            </div>
            <Button
              size="sm"
              color="primary"
              variant="flat"
              isLoading={applyingScenario === scenario.id}
              isDisabled={applyingScenario !== null}
              onPress={() => handleApplyScenario(scenario.id)}
            >
              Apply
            </Button>
          </div>
        </div>
      ))}

      {scenarios.length === 0 && !isLoading && (
        <div className="text-center py-4 text-default-400 text-sm">
          No scenarios available
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main DebugPanel Component
// ============================================================================

const PANEL_WIDTH = 400;
const PANEL_HEIGHT = 500;

export function DebugPanel() {
  const {
    panelOpen,
    panelPosition,
    activeTab,
    togglePanel,
    setActiveTab,
    setPanelPosition,
  } = useDevStore();

  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, [role="tab"]')) {
        return;
      }
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - panelPosition.x,
        y: e.clientY - panelPosition.y,
      };
    },
    [panelPosition]
  );

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - PANEL_WIDTH, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - PANEL_HEIGHT, e.clientY - dragOffset.current.y));
      setPanelPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setPanelPosition]);

  // Collapsed indicator button
  if (!panelOpen) {
    return (
      <Button
        isIconOnly
        size="lg"
        color="warning"
        variant="solid"
        className="fixed z-[9999] shadow-xl animate-pulse"
        style={{
          bottom: 20,
          right: 20,
        }}
        onPress={togglePanel}
        aria-label="Open dev panel (Ctrl+Shift+D)"
      >
        <Icon icon="solar:bug-bold" width={24} />
      </Button>
    );
  }

  // Expanded panel
  return (
    <div
      ref={panelRef}
      className="fixed z-[9999]"
      style={{
        left: panelPosition.x,
        top: panelPosition.y,
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
      }}
    >
      <Card
        className="h-full bg-default-900/95 text-default-100 shadow-2xl border border-default-700"
        classNames={{
          base: 'h-full',
          body: 'overflow-hidden p-0',
        }}
      >
        {/* Header - Draggable */}
        <CardHeader
          className="flex items-center justify-between px-3 py-2 cursor-move select-none bg-default-800/50 border-b border-default-700"
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <Icon icon="solar:bug-bold" width={18} className="text-warning" />
            <span className="text-sm font-semibold">Dev Panel</span>
            <Chip size="sm" color="warning" variant="flat" className="h-5 text-[10px]">
              DEV
            </Chip>
          </div>
          <div className="flex items-center gap-1">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="text-default-400 hover:text-default-100"
              onPress={togglePanel}
              aria-label="Close dev panel"
            >
              <Icon icon="solar:close-circle-bold" width={18} />
            </Button>
          </div>
        </CardHeader>

        {/* Body with tabs */}
        <CardBody className="flex flex-col p-0 flex-1 overflow-hidden">
          <Tabs
            aria-label="Dev panel tabs"
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            variant="underlined"
            classNames={{
              base: 'w-full px-2 pt-1',
              tabList: 'gap-1 w-full relative rounded-none p-0 border-b border-default-700',
              tab: 'max-w-fit px-2 h-8 text-xs',
              tabContent: 'group-data-[selected=true]:text-warning',
              cursor: 'w-full bg-warning',
            }}
            color="warning"
          >
            <Tab
              key="state"
              title={
                <div className="flex items-center gap-1">
                  <Icon icon="solar:code-scan-linear" width={14} />
                  <span>State</span>
                </div>
              }
            />
            <Tab
              key="network"
              title={
                <div className="flex items-center gap-1">
                  <Icon icon="solar:routing-2-linear" width={14} />
                  <span>Network</span>
                </div>
              }
            />
            <Tab
              key="toggles"
              title={
                <div className="flex items-center gap-1">
                  <Icon icon="solar:settings-linear" width={14} />
                  <span>Toggles</span>
                </div>
              }
            />
            <Tab
              key="scan"
              title={
                <div className="flex items-center gap-1">
                  <Icon icon="solar:nfc-linear" width={14} />
                  <span>Scan</span>
                </div>
              }
            />
            <Tab
              key="errors"
              title={
                <div className="flex items-center gap-1">
                  <Icon icon="solar:bug-linear" width={14} />
                  <span>Errors</span>
                </div>
              }
            />
            <Tab
              key="seeds"
              title={
                <div className="flex items-center gap-1">
                  <Icon icon="solar:database-linear" width={14} />
                  <span>Seeds</span>
                </div>
              }
            />
          </Tabs>

          {/* Tab content */}
          <div className="flex-1 overflow-auto p-3">
            {activeTab === 'state' && <StateInspector />}
            {activeTab === 'network' && <NetworkMonitor />}
            {activeTab === 'toggles' && <FeatureToggles />}
            {activeTab === 'scan' && <MockScanPanel />}
            {activeTab === 'errors' && <ErrorInjector />}
            {activeTab === 'seeds' && <SeedsTab />}
          </div>
        </CardBody>

        {/* Footer hint */}
        <div className="px-3 py-1.5 text-[10px] text-default-500 border-t border-default-700 bg-default-800/30">
          Press <kbd className="px-1 py-0.5 rounded bg-default-700 text-default-300">Ctrl</kbd>+
          <kbd className="px-1 py-0.5 rounded bg-default-700 text-default-300">Shift</kbd>+
          <kbd className="px-1 py-0.5 rounded bg-default-700 text-default-300">D</kbd> to toggle
        </div>
      </Card>
    </div>
  );
}
