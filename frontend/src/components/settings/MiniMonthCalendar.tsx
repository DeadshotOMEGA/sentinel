import { useMemo } from 'react';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import type { TrainingYear } from '@shared/types/reports';
import type { ScheduleSettings, WorkingHoursSettings } from '@shared/types/settings';
import {
  getMonthDays,
  getFirstDayOffset,
  getDayType,
  getDayTypeColor,
  isInTrainingYear,
  getBaseDayType,
  type DayType,
} from './calendar-utils';

interface DayAction {
  label: string;
  icon: string;
  action: 'add_holiday' | 'toggle_day_off' | 'cancel_training' | 'cancel_admin' | 'restore';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

interface MiniMonthCalendarProps {
  month: Date;
  trainingYear: TrainingYear;
  scheduleSettings: ScheduleSettings;
  workingHoursSettings: WorkingHoursSettings;
  onDayAction?: (date: Date, action: DayAction['action']) => void;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getActionsForDay(dayType: DayType, baseType: string): DayAction[] {
  const actions: DayAction[] = [];

  switch (dayType) {
    case 'training':
      actions.push({
        label: 'Cancel Training Night',
        icon: 'mdi:close-circle',
        action: 'cancel_training',
        color: 'danger',
      });
      actions.push({
        label: 'Add to Holiday',
        icon: 'mdi:calendar-remove',
        action: 'add_holiday',
      });
      break;

    case 'admin':
      actions.push({
        label: 'Cancel Admin Night',
        icon: 'mdi:close-circle',
        action: 'cancel_admin',
        color: 'danger',
      });
      actions.push({
        label: 'Add to Holiday',
        icon: 'mdi:calendar-remove',
        action: 'add_holiday',
      });
      break;

    case 'workday':
      actions.push({
        label: 'Mark as Day Off',
        icon: 'mdi:calendar-minus',
        action: 'toggle_day_off',
        color: 'warning',
      });
      actions.push({
        label: 'Add to Holiday',
        icon: 'mdi:calendar-remove',
        action: 'add_holiday',
      });
      break;

    case 'day_off':
      actions.push({
        label: 'Remove Day Off',
        icon: 'mdi:calendar-check',
        action: 'restore',
        color: 'success',
      });
      break;

    case 'cancelled_training':
    case 'cancelled_admin':
      actions.push({
        label: baseType === 'training' ? 'Restore Training Night' : 'Restore Admin Night',
        icon: 'mdi:calendar-check',
        action: 'restore',
        color: 'success',
      });
      break;

    case 'none':
      actions.push({
        label: 'Add to Holiday',
        icon: 'mdi:calendar-remove',
        action: 'add_holiday',
      });
      break;

    // Holiday days have no actions - they're already excluded
    case 'holiday':
    default:
      break;
  }

  return actions;
}

export default function MiniMonthCalendar({
  month,
  trainingYear,
  scheduleSettings,
  workingHoursSettings,
  onDayAction,
}: MiniMonthCalendarProps) {
  const monthDays = useMemo(() => getMonthDays(month), [month]);
  const firstDayOffset = useMemo(() => getFirstDayOffset(month), [month]);

  const dayClassifications = useMemo(() => {
    return monthDays.map(({ date, dayOfMonth }) => {
      const dayType = getDayType(date, trainingYear, scheduleSettings, workingHoursSettings);
      const baseType = getBaseDayType(date, trainingYear, scheduleSettings, workingHoursSettings);
      const isOutsideRange = !isInTrainingYear(date, trainingYear);
      const colors = getDayTypeColor(dayType);
      const actions = isOutsideRange ? [] : getActionsForDay(dayType, baseType);

      return {
        date,
        dayOfMonth,
        dayType,
        baseType,
        colors,
        isOutsideRange,
        actions,
      };
    });
  }, [monthDays, trainingYear, scheduleSettings, workingHoursSettings]);

  return (
    <div className="rounded-lg border border-default-200 p-3">
      {/* Month Header */}
      <h4 className="mb-2 text-center text-sm font-semibold text-default-700">
        {format(month, 'MMMM yyyy')}
      </h4>

      {/* Day Labels */}
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="flex h-6 w-6 items-center justify-center text-xs font-medium text-default-500"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="h-6 w-6" />
        ))}

        {/* Day cells */}
        {dayClassifications.map(({ date, dayOfMonth, colors, isOutsideRange, actions }) => {
          const hasActions = actions.length > 0 && onDayAction;

          const dayCell = (
            <div
              className={`
                flex h-6 w-6 items-center justify-center rounded-full text-xs
                ${colors.bg}
                ${colors.text}
                ${colors.extra || ''}
                ${isOutsideRange ? 'opacity-40' : ''}
                ${hasActions ? 'cursor-pointer hover:ring-2 hover:ring-primary-300' : ''}
              `}
            >
              {dayOfMonth}
            </div>
          );

          if (!hasActions) {
            return <div key={dayOfMonth}>{dayCell}</div>;
          }

          return (
            <Popover key={dayOfMonth} placement="bottom">
              <PopoverTrigger>{dayCell}</PopoverTrigger>
              <PopoverContent className="p-2">
                <div className="flex flex-col gap-1">
                  <div className="mb-1 text-xs font-medium text-default-500">
                    {format(date, 'EEE, MMM d')}
                  </div>
                  {actions.map((action) => (
                    <Button
                      key={action.action}
                      size="sm"
                      variant="light"
                      color={action.color || 'default'}
                      className="justify-start"
                      startContent={<Icon icon={action.icon} width={16} />}
                      onPress={() => onDayAction(date, action.action)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}
