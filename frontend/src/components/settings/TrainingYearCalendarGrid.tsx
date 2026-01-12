import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Progress,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { format } from 'date-fns';
import { api } from '../../lib/api';
import type { TrainingYear, DayException, HolidayExclusion } from '@shared/types/reports';
import type { ScheduleSettings, WorkingHoursSettings } from '@shared/types/settings';
import { getMonthsInRange, type DayType } from './calendar-utils';
import MiniMonthCalendar from './MiniMonthCalendar';

interface TrainingYearCalendarGridProps {
  trainingYear: TrainingYear;
  onTrainingYearUpdate?: (updated: TrainingYear) => void;
}

interface SettingsData {
  settings: Record<string, { value: unknown }>;
}

interface UndoState {
  message: string;
  previousData: { dayExceptions?: DayException[]; holidayExclusions?: HolidayExclusion[] };
  timeoutId: ReturnType<typeof setTimeout> | null;
  progress: number;
}

const UNDO_TIMEOUT_MS = 5000;

const LEGEND_ITEMS: { type: DayType; label: string; bgClass: string; extra?: string }[] = [
  { type: 'workday', label: 'Workday', bgClass: 'bg-success-200' },
  { type: 'training', label: 'Training Night', bgClass: 'bg-primary-200' },
  { type: 'admin', label: 'Admin Night', bgClass: 'bg-secondary-200' },
  { type: 'holiday', label: 'Holiday', bgClass: 'bg-danger-200' },
  { type: 'day_off', label: 'Day Off', bgClass: 'bg-default-300', extra: 'line-through' },
  { type: 'cancelled_training', label: 'Cancelled', bgClass: 'bg-primary-100', extra: 'line-through opacity-60' },
];

const DEFAULT_SCHEDULE: ScheduleSettings = {
  trainingNightDay: 'tuesday',
  trainingNightStart: '19:00',
  trainingNightEnd: '22:10',
  adminNightDay: 'thursday',
  adminNightStart: '19:00',
  adminNightEnd: '22:10',
};

const DEFAULT_WORKING_HOURS: WorkingHoursSettings = {
  regularWeekdayStart: '08:00',
  regularWeekdayEnd: '16:00',
  regularWeekdays: ['monday', 'wednesday', 'friday'],
  summerStartDate: '06-01',
  summerEndDate: '08-31',
  summerWeekdayStart: '09:00',
  summerWeekdayEnd: '15:00',
};

export default function TrainingYearCalendarGrid({
  trainingYear,
  onTrainingYearUpdate,
}: TrainingYearCalendarGridProps) {
  const queryClient = useQueryClient();
  const [holidayModal, setHolidayModal] = useState<{ isOpen: boolean; date: Date | null }>({
    isOpen: false,
    date: null,
  });
  const [holidayName, setHolidayName] = useState('');
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (undoState?.timeoutId) clearTimeout(undoState.timeoutId);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [undoState?.timeoutId]);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['report-settings'],
    queryFn: async () => {
      const response = await api.get<SettingsData>('/report-settings');
      return response.data.settings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { dayExceptions?: DayException[]; holidayExclusions?: HolidayExclusion[] }) => {
      const response = await api.put<{ trainingYear: TrainingYear }>(
        `/training-years/${trainingYear.id}`,
        data
      );
      return response.data.trainingYear;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['training-years'] });
      onTrainingYearUpdate?.(updated);
    },
  });

  const showUndo = useCallback((message: string, previousData: UndoState['previousData']) => {
    // Clear any existing undo state
    if (undoState?.timeoutId) clearTimeout(undoState.timeoutId);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    // Start progress countdown
    let progress = 100;
    progressIntervalRef.current = setInterval(() => {
      progress -= 2; // 100 / 50 = 2% per 100ms for 5 seconds
      setUndoState((prev) => (prev ? { ...prev, progress: Math.max(0, progress) } : null));
    }, 100);

    // Set timeout to dismiss
    const timeoutId = setTimeout(() => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setUndoState(null);
    }, UNDO_TIMEOUT_MS);

    setUndoState({ message, previousData, timeoutId, progress: 100 });
  }, [undoState?.timeoutId]);

  const handleUndo = useCallback(() => {
    if (!undoState) return;

    // Clear timers
    if (undoState.timeoutId) clearTimeout(undoState.timeoutId);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    // Restore previous state
    updateMutation.mutate(undoState.previousData);
    setUndoState(null);
  }, [undoState, updateMutation]);

  const dismissUndo = useCallback(() => {
    if (undoState?.timeoutId) clearTimeout(undoState.timeoutId);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setUndoState(null);
  }, [undoState?.timeoutId]);

  const scheduleSettings = useMemo(() => {
    if (!settingsData?.schedule?.value) return DEFAULT_SCHEDULE;
    return settingsData.schedule.value as ScheduleSettings;
  }, [settingsData]);

  const workingHoursSettings = useMemo(() => {
    if (!settingsData?.working_hours?.value) return DEFAULT_WORKING_HOURS;
    return settingsData.working_hours.value as WorkingHoursSettings;
  }, [settingsData]);

  const months = useMemo(() => getMonthsInRange(trainingYear), [trainingYear]);

  const handleDayAction = useCallback(
    (date: Date, action: 'add_holiday' | 'toggle_day_off' | 'cancel_training' | 'cancel_admin' | 'restore') => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const displayDate = format(date, 'MMM d');
      const currentExceptions = trainingYear.dayExceptions || [];

      if (action === 'add_holiday') {
        setHolidayModal({ isOpen: true, date });
        setHolidayName('');
        return;
      }

      if (action === 'restore') {
        const newExceptions = currentExceptions.filter((exc) => exc.date !== dateStr);
        updateMutation.mutate({ dayExceptions: newExceptions });
        showUndo(`Restored ${displayDate}`, { dayExceptions: currentExceptions });
        return;
      }

      if (action === 'toggle_day_off') {
        const existing = currentExceptions.find((exc) => exc.date === dateStr);
        if (existing?.type === 'day_off') {
          const newExceptions = currentExceptions.filter((exc) => exc.date !== dateStr);
          updateMutation.mutate({ dayExceptions: newExceptions });
          showUndo(`Removed day off: ${displayDate}`, { dayExceptions: currentExceptions });
        } else {
          const newException: DayException = { date: dateStr, type: 'day_off' };
          const newExceptions = [...currentExceptions.filter((exc) => exc.date !== dateStr), newException];
          updateMutation.mutate({ dayExceptions: newExceptions });
          showUndo(`Marked ${displayDate} as day off`, { dayExceptions: currentExceptions });
        }
        return;
      }

      if (action === 'cancel_training' || action === 'cancel_admin') {
        const exceptionType = action === 'cancel_training' ? 'cancelled_training' : 'cancelled_admin';
        const label = action === 'cancel_training' ? 'training night' : 'admin night';
        const newException: DayException = { date: dateStr, type: exceptionType };
        const newExceptions = [
          ...currentExceptions.filter((exc) => exc.date !== dateStr),
          newException,
        ];
        updateMutation.mutate({ dayExceptions: newExceptions });
        showUndo(`Cancelled ${label}: ${displayDate}`, { dayExceptions: currentExceptions });
        return;
      }
    },
    [trainingYear, updateMutation, showUndo]
  );

  const handleAddHoliday = useCallback(() => {
    if (!holidayModal.date || !holidayName.trim()) return;

    const dateStr = format(holidayModal.date, 'yyyy-MM-dd');
    const displayDate = format(holidayModal.date, 'MMM d');
    const currentExclusions = trainingYear.holidayExclusions || [];

    const newExclusions: HolidayExclusion[] = [
      ...currentExclusions,
      { start: dateStr, end: dateStr, name: holidayName.trim() },
    ];

    updateMutation.mutate({ holidayExclusions: newExclusions });
    showUndo(`Added holiday: ${holidayName.trim()} (${displayDate})`, { holidayExclusions: currentExclusions });
    setHolidayModal({ isOpen: false, date: null });
    setHolidayName('');
  }, [holidayModal.date, holidayName, trainingYear, updateMutation, showUndo]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {LEGEND_ITEMS.map(({ type, label, bgClass, extra }) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`h-4 w-4 rounded-full ${bgClass} ${extra || ''}`} />
            <span className="text-sm text-default-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {months.map((month) => (
          <MiniMonthCalendar
            key={month.toISOString()}
            month={month}
            trainingYear={trainingYear}
            scheduleSettings={scheduleSettings}
            workingHoursSettings={workingHoursSettings}
            onDayAction={handleDayAction}
          />
        ))}
      </div>

      {/* Undo Bar */}
      {undoState && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform">
          <div className="flex items-center gap-3 rounded-lg bg-default-800 px-4 py-3 text-white shadow-lg">
            <span className="text-sm">{undoState.message}</span>
            <Button
              size="sm"
              variant="flat"
              className="bg-white/20 text-white hover:bg-white/30"
              onPress={handleUndo}
              isLoading={updateMutation.isPending}
            >
              Undo
            </Button>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              className="text-white/60 hover:text-white"
              onPress={dismissUndo}
            >
              <Icon icon="mdi:close" width={16} />
            </Button>
            <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-lg">
              <Progress
                size="sm"
                value={undoState.progress}
                className="h-1"
                classNames={{
                  indicator: 'bg-primary-400',
                  track: 'bg-transparent',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      <Modal isOpen={holidayModal.isOpen} onClose={() => setHolidayModal({ isOpen: false, date: null })}>
        <ModalContent>
          <ModalHeader>Add Holiday</ModalHeader>
          <ModalBody>
            <p className="mb-4 text-sm text-default-500">
              Add {holidayModal.date ? format(holidayModal.date, 'EEEE, MMMM d, yyyy') : ''} as a holiday exclusion.
            </p>
            <Input
              label="Holiday Name"
              placeholder="e.g., Civic Holiday"
              value={holidayName}
              onValueChange={setHolidayName}
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setHolidayModal({ isOpen: false, date: null })}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleAddHoliday}
              isDisabled={!holidayName.trim()}
              isLoading={updateMutation.isPending}
            >
              Add Holiday
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
