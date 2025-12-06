import { useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Divider,
  CheckboxGroup,
  Checkbox,
  Tooltip,
  Slider,
  Select,
  SelectItem,
  Chip,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import type {
  SimulationRequest,
  SimulationResponse,
  SimulationPrecheck,
  SimulationAttendanceRates,
  SimulationIntensity,
} from '@shared/types';

type ClearableTable = 'members' | 'checkins' | 'visitors' | 'badges' | 'events' | 'event_attendees' | 'event_checkins';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  severity?: 'warning' | 'danger';
  requireTyping?: string;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  severity = 'danger',
  requireTyping,
}: ConfirmationModalProps) {
  const [typedText, setTypedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      setTypedText('');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTypedText('');
    onClose();
  };

  const isValid = requireTyping ? typedText === requireTyping : true;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <p className="mb-4">{message}</p>
          {requireTyping && (
            <Input
              label={`Type "${requireTyping}" to confirm`}
              value={typedText}
              onValueChange={setTypedText}
              placeholder={requireTyping}
              autoFocus
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Cancel
          </Button>
          <Button
            color={severity}
            onPress={handleConfirm}
            isDisabled={!isValid}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const ALL_TABLES: ClearableTable[] = ['members', 'checkins', 'visitors', 'badges', 'events', 'event_attendees', 'event_checkins'];

const TABLE_LABELS: Record<ClearableTable, string> = {
  members: 'Members',
  checkins: 'Check-ins',
  visitors: 'Visitors',
  badges: 'Badges',
  events: 'Events',
  event_attendees: 'Event Attendees',
  event_checkins: 'Event Check-ins',
};

const TABLE_DESCRIPTIONS: Record<ClearableTable, string> = {
  members: 'All unit member records',
  checkins: 'All daily check-in/out records',
  visitors: 'All visitor sign-in records',
  badges: 'All RFID badge registrations',
  events: 'All scheduled events',
  event_attendees: 'All event attendee registrations',
  event_checkins: 'All event check-in records',
};

// Default simulation parameters
const DEFAULT_ATTENDANCE_RATES: SimulationAttendanceRates = {
  ftsWorkDays: 95,
  ftsTrainingNight: 90,
  ftsAdminNight: 70,
  reserveTrainingNight: 70,
  reserveAdminNight: 40,
  bmqAttendance: 90,
  edtAppearance: 15,
};

const DEFAULT_INTENSITY: SimulationIntensity = {
  visitorsPerDay: { min: 2, max: 8 },
  eventsPerMonth: { min: 1, max: 3 },
  edgeCasePercentage: 10,
};

const TIME_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'custom', label: 'Custom range' },
];

export default function DevToolsSection() {
  const [selectedTables, setSelectedTables] = useState<ClearableTable[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    requireTyping?: string;
    severity: 'warning' | 'danger';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    severity: 'warning',
    onConfirm: async () => {},
  });

  // Simulation state
  const [simTimeRangeMode, setSimTimeRangeMode] = useState<string>('30');
  const [simCustomStart, setSimCustomStart] = useState<string>('');
  const [simCustomEnd, setSimCustomEnd] = useState<string>('');
  const [simAttendanceRates, setSimAttendanceRates] = useState<SimulationAttendanceRates>(DEFAULT_ATTENDANCE_RATES);
  const [simIntensity, setSimIntensity] = useState<SimulationIntensity>(DEFAULT_INTENSITY);
  const [simWarnOnOverlap, setSimWarnOnOverlap] = useState(true);
  const [simIsLoading, setSimIsLoading] = useState(false);
  const [simPrecheck, setSimPrecheck] = useState<SimulationPrecheck | null>(null);
  const [simResult, setSimResult] = useState<SimulationResponse | null>(null);
  const [simShowAdvanced, setSimShowAdvanced] = useState(false);

  // Build simulation request
  const buildSimulationRequest = (): SimulationRequest => {
    const isCustom = simTimeRangeMode === 'custom';
    return {
      timeRange: isCustom
        ? { mode: 'custom', startDate: simCustomStart, endDate: simCustomEnd }
        : { mode: 'last_days', lastDays: parseInt(simTimeRangeMode) },
      attendanceRates: simAttendanceRates,
      intensity: simIntensity,
      warnOnOverlap: simWarnOnOverlap,
    };
  };

  // Pre-check simulation
  const handleSimulationPrecheck = async () => {
    try {
      setSimIsLoading(true);
      const request = buildSimulationRequest();
      const response = await api.post<SimulationPrecheck>('/dev-tools/simulate/precheck', request);
      setSimPrecheck(response.data);
    } catch (error) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message;
      toast.error(errorMessage ?? 'Failed to precheck simulation');
    } finally {
      setSimIsLoading(false);
    }
  };

  // Run simulation
  const handleRunSimulation = async () => {
    try {
      setSimIsLoading(true);
      setSimResult(null);
      const request = buildSimulationRequest();
      const response = await api.post<SimulationResponse>('/dev-tools/simulate', request);
      setSimResult(response.data);
      toast.success(
        `Generated ${response.data.summary.generated.checkins} check-ins, ` +
        `${response.data.summary.generated.visitors} visitors, ` +
        `${response.data.summary.generated.events} events`
      );
    } catch (error) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message;
      toast.error(errorMessage ?? 'Simulation failed');
    } finally {
      setSimIsLoading(false);
    }
  };

  // Update attendance rate helper
  const updateAttendanceRate = (key: keyof SimulationAttendanceRates, value: number) => {
    setSimAttendanceRates((prev) => ({ ...prev, [key]: value }));
  };

  // Reset to defaults
  const handleResetSimDefaults = () => {
    setSimAttendanceRates(DEFAULT_ATTENDANCE_RATES);
    setSimIntensity(DEFAULT_INTENSITY);
    setSimPrecheck(null);
    setSimResult(null);
  };

  const handleClearAll = async () => {
    try {
      const response = await api.post<{ cleared: string[] }>('/dev-tools/clear-all');
      toast.success(`Cleared ${response.data.cleared.length} tables: ${response.data.cleared.join(', ')}`);
    } catch (error) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message;
      if (!errorMessage) {
        throw new Error('Failed to clear data - no error message received');
      }
      toast.error(errorMessage);
    }
  };

  const handleClearSelectedTables = async () => {
    const results: string[] = [];
    const errors: string[] = [];

    for (const table of selectedTables) {
      try {
        const response = await api.post<{ cleared: string; count: number }>('/dev-tools/clear-table', {
          table,
        });
        results.push(`${response.data.cleared}: ${response.data.count}`);
      } catch (error) {
        const err = error as { response?: { data?: { error?: { message?: string } } } };
        const errorMessage = err.response?.data?.error?.message;
        errors.push(`${table}: ${errorMessage ? errorMessage : 'Failed to clear table'}`);
      }
    }

    if (results.length > 0) {
      toast.success(`Cleared: ${results.join(', ')}`);
    }
    if (errors.length > 0) {
      toast.error(`Errors: ${errors.join(', ')}`);
    }

    setSelectedTables([]);
  };

  const handleReset = async () => {
    try {
      await api.post<{ success: boolean }>('/dev-tools/reset');
      toast.success('Database reset complete. Please refresh the page.');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message;
      if (!errorMessage) {
        throw new Error('Failed to reset database - no error message received');
      }
      toast.error(errorMessage);
    }
  };

  const openConfirmModal = (
    title: string,
    message: string,
    confirmText: string,
    requireTyping: string | undefined,
    severity: 'warning' | 'danger',
    onConfirm: () => Promise<void>
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      requireTyping,
      severity,
      onConfirm,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Developer Tools</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="space-y-6">
            {/* Clear All Data - Warning level (keeps divisions) */}
            <div className="rounded-lg border border-warning-200 bg-warning-50 p-4">
              <div className="flex items-start gap-3 mb-3">
                <Icon icon="solar:trash-bin-trash-bold" className="text-warning-600 mt-0.5" width={24} />
                <div>
                  <h4 className="text-md font-semibold text-warning-700">Clear All Data</h4>
                  <p className="text-sm text-warning-600">
                    Clears all operational data (members, checkins, visitors, badges, events). Keeps admin users and divisions.
                  </p>
                </div>
              </div>
              <Tooltip content="Requires typing 'DELETE' to confirm. Admin users and divisions are preserved.">
                <Button
                  color="warning"
                  variant="solid"
                  startContent={<Icon icon="solar:trash-bin-minimalistic-linear" width={18} />}
                  onPress={() =>
                    openConfirmModal(
                      'Clear All Data',
                      'This will permanently delete all members, checkins, visitors, badges, and events. Admin users and divisions will be kept. This action cannot be undone.',
                      'Clear All Data',
                      'DELETE',
                      'warning',
                      handleClearAll
                    )
                  }
                >
                  Clear All Data
                </Button>
              </Tooltip>
            </div>

            {/* Clear by Table - Warning level */}
            <div className="rounded-lg border border-warning-200 bg-warning-50 p-4">
              <div className="flex items-start gap-3 mb-3">
                <Icon icon="solar:database-bold" className="text-warning-600 mt-0.5" width={24} />
                <div>
                  <h4 className="text-md font-semibold text-warning-700">Clear Individual Tables</h4>
                  <p className="text-sm text-warning-600">
                    Select tables to clear. Use caution as this may leave orphaned records.
                  </p>
                </div>
              </div>
              <CheckboxGroup
                value={selectedTables}
                onValueChange={(values) => setSelectedTables(values as ClearableTable[])}
                orientation="horizontal"
                classNames={{
                  wrapper: 'gap-4 flex-wrap',
                }}
              >
                {ALL_TABLES.map((table) => (
                  <Tooltip key={table} content={TABLE_DESCRIPTIONS[table]}>
                    <div className="inline-block">
                      <Checkbox value={table} color="warning">
                        {TABLE_LABELS[table]}
                      </Checkbox>
                    </div>
                  </Tooltip>
                ))}
              </CheckboxGroup>
              <div className="mt-4 flex gap-2">
                <Tooltip content={selectedTables.length === 0 ? 'Select at least one table to clear' : `Clear ${selectedTables.length} selected table(s)`}>
                  <Button
                    color="warning"
                    variant="solid"
                    isDisabled={selectedTables.length === 0}
                    startContent={<Icon icon="solar:trash-bin-minimalistic-linear" width={18} />}
                    onPress={() =>
                      openConfirmModal(
                        'Clear Selected Tables',
                        `This will permanently delete all records from: ${selectedTables.map(t => TABLE_LABELS[t]).join(', ')}. This action cannot be undone.`,
                        'Clear Selected',
                        'DELETE',
                        'warning',
                        handleClearSelectedTables
                      )
                    }
                  >
                    Clear Selected ({selectedTables.length})
                  </Button>
                </Tooltip>
                {selectedTables.length > 0 && (
                  <Tooltip content="Deselect all tables">
                    <Button
                      variant="light"
                      onPress={() => setSelectedTables([])}
                    >
                      Clear Selection
                    </Button>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Reset to Fresh - Danger level (nuclear option) */}
            <div className="rounded-lg border border-danger-200 bg-danger-50 p-4">
              <div className="flex items-start gap-3 mb-3">
                <Icon icon="solar:danger-triangle-bold" className="text-danger mt-0.5" width={24} />
                <div>
                  <h4 className="text-md font-semibold text-danger">Reset to Fresh State</h4>
                  <p className="text-sm text-danger-600">
                    <strong>DANGER:</strong> Deletes ALL data including divisions. Only admin users are kept for login access. This completely resets the database to a fresh state.
                  </p>
                </div>
              </div>
              <Tooltip color="danger" content="Requires typing 'RESET EVERYTHING' to confirm. Only use for development!">
                <Button
                  color="danger"
                  startContent={<Icon icon="solar:restart-bold" width={18} />}
                  onPress={() =>
                    openConfirmModal(
                      'Reset to Fresh State',
                      'This will DELETE EVERYTHING including divisions. Only admin users will remain. This is irreversible and should only be used for development.',
                      'Reset Everything',
                      'RESET EVERYTHING',
                      'danger',
                      handleReset
                    )
                  }
                >
                  Reset to Fresh State
                </Button>
              </Tooltip>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Data Simulation Tool */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon icon="solar:chart-2-bold" width={24} className="text-primary" />
            <h3 className="text-lg font-semibold">Data Simulation Tool</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="space-y-6">
            <p className="text-sm text-default-500">
              Generate realistic historical attendance data for testing reports, timelines, and system functionality.
              Data is added to existing records (non-destructive).
            </p>

            {/* Time Range Selection */}
            <div className="space-y-3">
              <h4 className="text-md font-medium">Time Range</h4>
              <Select
                label="Simulation Period"
                selectedKeys={new Set([simTimeRangeMode])}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  if (selected) {
                    setSimTimeRangeMode(selected as string);
                    setSimPrecheck(null);
                  }
                }}
              >
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value}>{opt.label}</SelectItem>
                ))}
              </Select>

              {simTimeRangeMode === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="date"
                    label="Start Date"
                    value={simCustomStart}
                    onValueChange={setSimCustomStart}
                  />
                  <Input
                    type="date"
                    label="End Date"
                    value={simCustomEnd}
                    onValueChange={setSimCustomEnd}
                  />
                </div>
              )}
            </div>

            {/* Attendance Rates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium">Attendance Rates</h4>
                <Button
                  size="sm"
                  variant="light"
                  onPress={() => setSimShowAdvanced(!simShowAdvanced)}
                  endContent={<Icon icon={simShowAdvanced ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width={16} />}
                >
                  {simShowAdvanced ? 'Hide' : 'Show'} Advanced
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>FTS Work Days</span>
                    <span className="font-medium">{simAttendanceRates.ftsWorkDays}%</span>
                  </div>
                  <Slider
                    aria-label="FTS Work Days Attendance"
                    size="sm"
                    step={5}
                    minValue={0}
                    maxValue={100}
                    value={simAttendanceRates.ftsWorkDays}
                    onChange={(val) => updateAttendanceRate('ftsWorkDays', val as number)}
                    color="primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Reserve Training Night</span>
                    <span className="font-medium">{simAttendanceRates.reserveTrainingNight}%</span>
                  </div>
                  <Slider
                    aria-label="Reserve Training Night Attendance"
                    size="sm"
                    step={5}
                    minValue={0}
                    maxValue={100}
                    value={simAttendanceRates.reserveTrainingNight}
                    onChange={(val) => updateAttendanceRate('reserveTrainingNight', val as number)}
                    color="secondary"
                  />
                </div>
              </div>

              {simShowAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>FTS Training Night</span>
                      <span className="font-medium">{simAttendanceRates.ftsTrainingNight}%</span>
                    </div>
                    <Slider
                      aria-label="FTS Training Night Attendance"
                      size="sm"
                      step={5}
                      minValue={0}
                      maxValue={100}
                      value={simAttendanceRates.ftsTrainingNight}
                      onChange={(val) => updateAttendanceRate('ftsTrainingNight', val as number)}
                      color="primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>FTS Admin Night</span>
                      <span className="font-medium">{simAttendanceRates.ftsAdminNight}%</span>
                    </div>
                    <Slider
                      aria-label="FTS Admin Night Attendance"
                      size="sm"
                      step={5}
                      minValue={0}
                      maxValue={100}
                      value={simAttendanceRates.ftsAdminNight}
                      onChange={(val) => updateAttendanceRate('ftsAdminNight', val as number)}
                      color="primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Reserve Admin Night</span>
                      <span className="font-medium">{simAttendanceRates.reserveAdminNight}%</span>
                    </div>
                    <Slider
                      aria-label="Reserve Admin Night Attendance"
                      size="sm"
                      step={5}
                      minValue={0}
                      maxValue={100}
                      value={simAttendanceRates.reserveAdminNight}
                      onChange={(val) => updateAttendanceRate('reserveAdminNight', val as number)}
                      color="secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>BMQ Attendance</span>
                      <span className="font-medium">{simAttendanceRates.bmqAttendance}%</span>
                    </div>
                    <Slider
                      aria-label="BMQ Attendance"
                      size="sm"
                      step={5}
                      minValue={0}
                      maxValue={100}
                      value={simAttendanceRates.bmqAttendance}
                      onChange={(val) => updateAttendanceRate('bmqAttendance', val as number)}
                      color="success"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>ED&T Appearance (rare)</span>
                      <span className="font-medium">{simAttendanceRates.edtAppearance}%</span>
                    </div>
                    <Slider
                      aria-label="ED&T Appearance Rate"
                      size="sm"
                      step={5}
                      minValue={0}
                      maxValue={50}
                      value={simAttendanceRates.edtAppearance}
                      onChange={(val) => updateAttendanceRate('edtAppearance', val as number)}
                      color="warning"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Edge Cases</span>
                      <span className="font-medium">{simIntensity.edgeCasePercentage}%</span>
                    </div>
                    <Slider
                      aria-label="Edge Case Percentage"
                      size="sm"
                      step={5}
                      minValue={0}
                      maxValue={30}
                      value={simIntensity.edgeCasePercentage}
                      onChange={(val) => setSimIntensity((prev) => ({ ...prev, edgeCasePercentage: val as number }))}
                      color="danger"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Simulation Intensity */}
            {simShowAdvanced && (
              <div className="space-y-4">
                <h4 className="text-md font-medium">Simulation Intensity</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Visitors per Day</span>
                      <span className="font-medium">{simIntensity.visitorsPerDay.min} - {simIntensity.visitorsPerDay.max}</span>
                    </div>
                    <Slider
                      aria-label="Visitors per Day Range"
                      size="sm"
                      step={1}
                      minValue={0}
                      maxValue={20}
                      value={[simIntensity.visitorsPerDay.min, simIntensity.visitorsPerDay.max]}
                      onChange={(val) => {
                        const [min, max] = val as number[];
                        setSimIntensity((prev) => ({
                          ...prev,
                          visitorsPerDay: { min: min ?? 0, max: max ?? 10 },
                        }));
                      }}
                      color="primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Events per Month</span>
                      <span className="font-medium">{simIntensity.eventsPerMonth.min} - {simIntensity.eventsPerMonth.max}</span>
                    </div>
                    <Slider
                      aria-label="Events per Month Range"
                      size="sm"
                      step={1}
                      minValue={0}
                      maxValue={10}
                      value={[simIntensity.eventsPerMonth.min, simIntensity.eventsPerMonth.max]}
                      onChange={(val) => {
                        const [min, max] = val as number[];
                        setSimIntensity((prev) => ({
                          ...prev,
                          eventsPerMonth: { min: min ?? 0, max: max ?? 3 },
                        }));
                      }}
                      color="secondary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="flex items-center gap-4">
              <Checkbox
                isSelected={simWarnOnOverlap}
                onValueChange={setSimWarnOnOverlap}
              >
                Warn if existing data in range
              </Checkbox>
              <Button
                size="sm"
                variant="flat"
                onPress={handleResetSimDefaults}
              >
                Reset to Defaults
              </Button>
            </div>

            {/* Pre-check Results */}
            {simPrecheck && (
              <div className="rounded-lg border border-default-200 bg-default-50 p-4 space-y-3">
                <h4 className="text-md font-medium flex items-center gap-2">
                  <Icon icon="solar:info-circle-bold" width={18} className="text-primary" />
                  Pre-check Results
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-default-500">Date Range</span>
                    <p className="font-medium">{simPrecheck.dateRange.start} to {simPrecheck.dateRange.end}</p>
                  </div>
                  <div>
                    <span className="text-default-500">Active Members</span>
                    <p className="font-medium">{simPrecheck.activeMembers}</p>
                  </div>
                  <div>
                    <span className="text-default-500">Existing Check-ins</span>
                    <p className="font-medium">{simPrecheck.existingCheckins}</p>
                  </div>
                  <div>
                    <span className="text-default-500">Existing Visitors</span>
                    <p className="font-medium">{simPrecheck.existingVisitors}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Chip size="sm" color="primary" variant="flat">FTS: {simPrecheck.memberCategories.fts}</Chip>
                  <Chip size="sm" color="secondary" variant="flat">Reserve: {simPrecheck.memberCategories.reserve}</Chip>
                  <Chip size="sm" color="success" variant="flat">BMQ: {simPrecheck.memberCategories.bmq_student}</Chip>
                  <Chip size="sm" color="warning" variant="flat">ED&T: {(simPrecheck.memberCategories.fts_edt ?? 0) + (simPrecheck.memberCategories.reserve_edt ?? 0)}</Chip>
                </div>
                {simPrecheck.hasOverlap && (
                  <div className="flex items-center gap-2 text-warning-600">
                    <Icon icon="solar:danger-triangle-bold" width={18} />
                    <span className="text-sm">Existing data found in the selected range</span>
                  </div>
                )}
              </div>
            )}

            {/* Simulation Results */}
            {simResult && (
              <div className="rounded-lg border border-success-200 bg-success-50 p-4 space-y-3">
                <h4 className="text-md font-medium flex items-center gap-2 text-success-700">
                  <Icon icon="solar:check-circle-bold" width={18} />
                  Simulation Complete
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-default-500">Days Simulated</span>
                    <p className="font-medium">{simResult.summary.daysSimulated}</p>
                  </div>
                  <div>
                    <span className="text-default-500">Check-ins</span>
                    <p className="font-medium text-success-600">{simResult.summary.generated.checkins}</p>
                  </div>
                  <div>
                    <span className="text-default-500">Visitors</span>
                    <p className="font-medium text-success-600">{simResult.summary.generated.visitors}</p>
                  </div>
                  <div>
                    <span className="text-default-500">Events</span>
                    <p className="font-medium text-success-600">{simResult.summary.generated.events}</p>
                  </div>
                  <div>
                    <span className="text-default-500">Event Attendees</span>
                    <p className="font-medium text-success-600">{simResult.summary.generated.eventAttendees}</p>
                  </div>
                </div>
                <div className="text-sm text-default-500">
                  Edge cases: {simResult.summary.edgeCases.forgottenCheckouts} forgotten checkouts,
                  {' '}{simResult.summary.edgeCases.lateArrivals} late arrivals,
                  {' '}{simResult.summary.edgeCases.flaggedEntries} flagged entries
                </div>
                {simResult.warnings.length > 0 && (
                  <div className="text-sm text-warning-600">
                    {simResult.warnings.map((w, i) => (
                      <p key={i}>⚠️ {w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                color="default"
                variant="flat"
                onPress={handleSimulationPrecheck}
                isLoading={simIsLoading}
                startContent={<Icon icon="solar:eye-bold" width={18} />}
              >
                Pre-check
              </Button>
              <Button
                color="primary"
                onPress={handleRunSimulation}
                isLoading={simIsLoading}
                startContent={<Icon icon="solar:play-bold" width={18} />}
              >
                Generate Test Data
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        requireTyping={confirmModal.requireTyping}
        severity={confirmModal.severity}
      />
    </div>
  );
}
