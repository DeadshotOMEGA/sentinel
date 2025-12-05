import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Checkbox,
  Button,
  Spinner,
} from '@heroui/react';
import { api } from '../../lib/api';
import type { ScheduleSettings, WorkingHoursSettings as WorkingHoursSettingsType } from '@shared/types/settings';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface SettingsData {
  settings: Record<string, { value: unknown }>;
}

export default function WorkingHoursSettings() {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');

  // Training Schedule state
  const [trainingNightDay, setTrainingNightDay] = useState('tuesday');
  const [trainingNightStart, setTrainingNightStart] = useState('19:00');
  const [trainingNightEnd, setTrainingNightEnd] = useState('22:10');
  const [adminNightDay, setAdminNightDay] = useState('thursday');
  const [adminNightStart, setAdminNightStart] = useState('19:00');
  const [adminNightEnd, setAdminNightEnd] = useState('22:10');

  // Working Hours state
  const [regularWeekdays, setRegularWeekdays] = useState<string[]>(['monday', 'wednesday', 'friday']);
  const [regularWeekdayStart, setRegularWeekdayStart] = useState('08:00');
  const [regularWeekdayEnd, setRegularWeekdayEnd] = useState('16:00');
  const [summerStartDate, setSummerStartDate] = useState('06-01');
  const [summerEndDate, setSummerEndDate] = useState('08-31');
  const [summerWeekdayStart, setSummerWeekdayStart] = useState('09:00');
  const [summerWeekdayEnd, setSummerWeekdayEnd] = useState('15:00');

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['report-settings'],
    queryFn: async () => {
      const response = await api.get<SettingsData>('/report-settings');
      return response.data.settings;
    },
  });

  // Load settings into state
  useEffect(() => {
    if (settingsData) {
      const scheduleSettings = settingsData.schedule?.value as ScheduleSettings;
      const workingHoursSettings = settingsData.working_hours?.value as WorkingHoursSettingsType;

      if (scheduleSettings) {
        setTrainingNightDay(scheduleSettings.trainingNightDay);
        setTrainingNightStart(scheduleSettings.trainingNightStart);
        setTrainingNightEnd(scheduleSettings.trainingNightEnd);
        setAdminNightDay(scheduleSettings.adminNightDay);
        setAdminNightStart(scheduleSettings.adminNightStart);
        setAdminNightEnd(scheduleSettings.adminNightEnd);
      }

      if (workingHoursSettings) {
        setRegularWeekdays(workingHoursSettings.regularWeekdays);
        setRegularWeekdayStart(workingHoursSettings.regularWeekdayStart);
        setRegularWeekdayEnd(workingHoursSettings.regularWeekdayEnd);
        setSummerStartDate(workingHoursSettings.summerStartDate);
        setSummerEndDate(workingHoursSettings.summerEndDate);
        setSummerWeekdayStart(workingHoursSettings.summerWeekdayStart);
        setSummerWeekdayEnd(workingHoursSettings.summerWeekdayEnd);
      }
    }
  }, [settingsData]);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [
    trainingNightDay,
    trainingNightStart,
    trainingNightEnd,
    adminNightDay,
    adminNightStart,
    adminNightEnd,
    regularWeekdays,
    regularWeekdayStart,
    regularWeekdayEnd,
    summerStartDate,
    summerEndDate,
    summerWeekdayStart,
    summerWeekdayEnd,
  ]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      return api.put('/report-settings/bulk', { settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-settings'] });
      setHasChanges(false);
      setError('');
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = apiError.response?.data?.error?.message;
      if (!errorMessage) {
        throw new Error('Failed to save settings');
      }
      setError(errorMessage);
    },
  });

  const handleWeekdayToggle = (day: string) => {
    setRegularWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const validateTimes = (): boolean => {
    // Validate training night times
    if (trainingNightStart >= trainingNightEnd) {
      setError('Training Night start time must be before end time');
      return false;
    }

    // Validate admin night times
    if (adminNightStart >= adminNightEnd) {
      setError('Admin Night start time must be before end time');
      return false;
    }

    // Validate regular hours
    if (regularWeekdayStart >= regularWeekdayEnd) {
      setError('Regular hours start time must be before end time');
      return false;
    }

    // Validate summer hours
    if (summerWeekdayStart >= summerWeekdayEnd) {
      setError('Summer hours start time must be before end time');
      return false;
    }

    // Validate summer dates (basic MM-DD format check)
    const summerStartParts = summerStartDate.split('-');
    const summerEndParts = summerEndDate.split('-');
    if (
      summerStartParts.length !== 2 ||
      summerEndParts.length !== 2 ||
      isNaN(Number(summerStartParts[0])) ||
      isNaN(Number(summerStartParts[1])) ||
      isNaN(Number(summerEndParts[0])) ||
      isNaN(Number(summerEndParts[1]))
    ) {
      setError('Summer dates must be in MM-DD format');
      return false;
    }

    setError('');
    return true;
  };

  const handleSave = () => {
    if (!validateTimes()) {
      return;
    }

    const settings = {
      schedule: {
        trainingNightDay,
        trainingNightStart,
        trainingNightEnd,
        adminNightDay,
        adminNightStart,
        adminNightEnd,
      },
      working_hours: {
        regularWeekdays,
        regularWeekdayStart,
        regularWeekdayEnd,
        summerStartDate,
        summerEndDate,
        summerWeekdayStart,
        summerWeekdayEnd,
      },
    };

    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">{error}</div>
      )}

      {/* Training Schedule Section */}
      <Card>
        <CardBody className="gap-4">
          <h3 className="text-lg font-semibold">Training Schedule</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Select
              label="Training Night Day"
              selectedKeys={new Set([trainingNightDay])}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                if (selected) {
                  setTrainingNightDay(selected as string);
                }
              }}
            >
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day.value}>
                  {day.label}
                </SelectItem>
              ))}
            </Select>

            <Input
              type="time"
              label="Training Night Start"
              value={trainingNightStart}
              onValueChange={setTrainingNightStart}
            />

            <Input
              type="time"
              label="Training Night End"
              value={trainingNightEnd}
              onValueChange={setTrainingNightEnd}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Select
              label="Admin Night Day"
              selectedKeys={new Set([adminNightDay])}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                if (selected) {
                  setAdminNightDay(selected as string);
                }
              }}
            >
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day.value}>
                  {day.label}
                </SelectItem>
              ))}
            </Select>

            <Input
              type="time"
              label="Admin Night Start"
              value={adminNightStart}
              onValueChange={setAdminNightStart}
            />

            <Input
              type="time"
              label="Admin Night End"
              value={adminNightEnd}
              onValueChange={setAdminNightEnd}
            />
          </div>
        </CardBody>
      </Card>

      {/* Working Hours Section */}
      <Card>
        <CardBody className="gap-4">
          <h3 className="text-lg font-semibold">Working Hours</h3>

          {/* Regular Hours */}
          <div className="space-y-4">
            <h4 className="text-md font-medium">Regular Hours</h4>

            <div>
              <p className="mb-2 text-sm text-default-500">Weekdays</p>
              <div className="flex flex-wrap gap-4">
                {WEEKDAYS.map((day) => (
                  <Checkbox
                    key={day}
                    isSelected={regularWeekdays.includes(day)}
                    onValueChange={() => handleWeekdayToggle(day)}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  </Checkbox>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                type="time"
                label="Start Time"
                value={regularWeekdayStart}
                onValueChange={setRegularWeekdayStart}
              />

              <Input
                type="time"
                label="End Time"
                value={regularWeekdayEnd}
                onValueChange={setRegularWeekdayEnd}
              />
            </div>
          </div>

          {/* Summer Hours */}
          <div className="space-y-4">
            <h4 className="text-md font-medium">Summer Hours</h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Summer Start Date (MM-DD)"
                placeholder="06-01"
                value={summerStartDate}
                onValueChange={setSummerStartDate}
                description="e.g., 06-01 for June 1"
              />

              <Input
                label="Summer End Date (MM-DD)"
                placeholder="08-31"
                value={summerEndDate}
                onValueChange={setSummerEndDate}
                description="e.g., 08-31 for August 31"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                type="time"
                label="Summer Start Time"
                value={summerWeekdayStart}
                onValueChange={setSummerWeekdayStart}
              />

              <Input
                type="time"
                label="Summer End Time"
                value={summerWeekdayEnd}
                onValueChange={setSummerWeekdayEnd}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          color="primary"
          onPress={handleSave}
          isLoading={saveMutation.isPending}
          isDisabled={!hasChanges}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
