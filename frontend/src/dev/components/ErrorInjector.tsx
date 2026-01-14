import { Switch, Slider, Select, SelectItem, Input, Button, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useDevStore } from '../store/dev-store';

// ============================================================================
// Constants
// ============================================================================

const STATUS_CODES = [
  { value: 400, label: '400 - Bad Request' },
  { value: 401, label: '401 - Unauthorized' },
  { value: 403, label: '403 - Forbidden' },
  { value: 404, label: '404 - Not Found' },
  { value: 500, label: '500 - Internal Server Error' },
  { value: 502, label: '502 - Bad Gateway' },
  { value: 503, label: '503 - Service Unavailable' },
];

const DEFAULT_CONFIG = {
  enabled: false,
  failureRate: 0.2,
  delayMs: 0,
  statusCode: 500,
  endpoints: [] as string[],
};

// ============================================================================
// ErrorInjector Component
// ============================================================================

export function ErrorInjector() {
  const { errorInjection, setErrorInjection } = useDevStore();

  const handleEnabledChange = (enabled: boolean) => {
    setErrorInjection({ enabled });
  };

  const handleFailureRateChange = (value: number | number[]) => {
    const rate = Array.isArray(value) ? value[0] : value;
    setErrorInjection({ failureRate: rate / 100 });
  };

  const handleDelayChange = (value: number | number[]) => {
    const delay = Array.isArray(value) ? value[0] : value;
    setErrorInjection({ delayMs: delay });
  };

  const handleStatusCodeChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return;
    const keyArray = Array.from(keys);
    if (keyArray.length > 0) {
      const statusCode = parseInt(String(keyArray[0]), 10);
      setErrorInjection({ statusCode });
    }
  };

  const handleEndpointsChange = (value: string) => {
    const endpoints = value
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    setErrorInjection({ endpoints });
  };

  const handleReset = () => {
    setErrorInjection(DEFAULT_CONFIG);
  };

  const failureRatePercent = Math.round(errorInjection.failureRate * 100);
  const endpointsValue = (errorInjection.endpoints ?? []).join(', ');

  return (
    <div className="space-y-4">
      {/* Warning indicator when active */}
      {errorInjection.enabled && (
        <div className="flex items-center gap-2 rounded-lg border border-warning-200 bg-warning-50 p-3">
          <Icon icon="solar:danger-triangle-bold" width={20} className="text-warning-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-warning-700">Error Injection Active</p>
            <p className="text-xs text-warning-600">
              {failureRatePercent}% failure rate, {errorInjection.delayMs}ms delay
            </p>
          </div>
          <Chip size="sm" color="warning" variant="flat" className="animate-pulse">
            LIVE
          </Chip>
        </div>
      )}

      {/* Master enable toggle */}
      <div className="flex items-center justify-between rounded-lg border border-default-200 bg-default-50 p-3">
        <div className="flex items-center gap-2">
          <Icon icon="solar:power-bold" width={18} className="text-default-500" />
          <div>
            <p className="text-sm font-medium text-default-700">Enable Error Injection</p>
            <p className="text-xs text-default-500">Master switch for all error injection</p>
          </div>
        </div>
        <Switch
          isSelected={errorInjection.enabled}
          onValueChange={handleEnabledChange}
          color="warning"
          size="sm"
        />
      </div>

      {/* Failure rate slider */}
      <div className="rounded-lg border border-default-200 bg-default-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="solar:danger-circle-bold" width={16} className="text-default-500" />
            <span className="text-sm font-medium text-default-700">Failure Rate</span>
          </div>
          <Chip size="sm" variant="flat" color="danger" className="font-mono">
            {failureRatePercent}%
          </Chip>
        </div>
        <Slider
          aria-label="Failure rate percentage"
          value={failureRatePercent}
          minValue={0}
          maxValue={100}
          step={5}
          onChange={handleFailureRateChange}
          color="danger"
          size="sm"
          className="max-w-full"
          isDisabled={!errorInjection.enabled}
        />
        <div className="mt-1 flex justify-between text-[10px] text-default-400">
          <span>0%</span>
          <span>Never fail</span>
          <span>100%</span>
        </div>
      </div>

      {/* Delay slider */}
      <div className="rounded-lg border border-default-200 bg-default-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="solar:stopwatch-bold" width={16} className="text-default-500" />
            <span className="text-sm font-medium text-default-700">Request Delay</span>
          </div>
          <Chip size="sm" variant="flat" color="secondary" className="font-mono">
            {errorInjection.delayMs}ms
          </Chip>
        </div>
        <Slider
          aria-label="Request delay in milliseconds"
          value={errorInjection.delayMs}
          minValue={0}
          maxValue={5000}
          step={100}
          onChange={handleDelayChange}
          color="secondary"
          size="sm"
          className="max-w-full"
          isDisabled={!errorInjection.enabled}
        />
        <div className="mt-1 flex justify-between text-[10px] text-default-400">
          <span>0ms</span>
          <span>No delay</span>
          <span>5000ms</span>
        </div>
      </div>

      {/* Status code dropdown */}
      <div className="rounded-lg border border-default-200 bg-default-50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Icon icon="solar:code-circle-bold" width={16} className="text-default-500" />
          <span className="text-sm font-medium text-default-700">Status Code</span>
        </div>
        <Select
          aria-label="HTTP status code for errors"
          selectedKeys={new Set([String(errorInjection.statusCode)])}
          onSelectionChange={handleStatusCodeChange}
          size="sm"
          variant="bordered"
          isDisabled={!errorInjection.enabled}
          classNames={{
            trigger: 'bg-default-100',
          }}
        >
          {STATUS_CODES.map((code) => (
            <SelectItem key={String(code.value)}>{code.label}</SelectItem>
          ))}
        </Select>
      </div>

      {/* Endpoint filter input */}
      <div className="rounded-lg border border-default-200 bg-default-50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Icon icon="solar:filter-bold" width={16} className="text-default-500" />
          <span className="text-sm font-medium text-default-700">Endpoint Filter</span>
        </div>
        <Input
          aria-label="Comma-separated endpoints to target"
          placeholder="/api/checkin, /api/members"
          value={endpointsValue}
          onValueChange={handleEndpointsChange}
          size="sm"
          variant="bordered"
          isDisabled={!errorInjection.enabled}
          classNames={{
            input: 'bg-default-100',
          }}
        />
        <p className="mt-1 text-[10px] text-default-400">
          Leave empty to apply to all endpoints
        </p>
      </div>

      {/* Reset button */}
      <Button
        fullWidth
        size="sm"
        variant="flat"
        color="default"
        onPress={handleReset}
        startContent={<Icon icon="solar:restart-bold" width={16} />}
      >
        Reset to Defaults
      </Button>
    </div>
  );
}
