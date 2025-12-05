import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardBody, Button, Chip, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { formatDistanceToNow, format } from 'date-fns';
import type { ActivityItem, DashboardFilters } from '../../../../shared/types';

interface CollapsibleActivityPanelProps {
  activity: ActivityItem[];
  filters: DashboardFilters;
  isCollapsed: boolean;
  onCollapseChange: (collapsed: boolean) => void;
  onDirectionFilterChange: (direction: 'all' | 'in' | 'out') => void;
}

export default function CollapsibleActivityPanel({
  activity,
  filters,
  isCollapsed,
  onCollapseChange,
  onDirectionFilterChange,
}: CollapsibleActivityPanelProps) {
  // Update relative times every 60 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter activity based on type, direction, and search
  const filteredActivity = useMemo(() => {
    return activity.filter((item) => {
      // Type filter
      if (filters.typeFilter === 'members' && item.type !== 'checkin') return false;
      if (filters.typeFilter === 'visitors' && item.type !== 'visitor') return false;

      // Direction filter
      if (filters.directionFilter !== 'all' && item.direction !== filters.directionFilter)
        return false;

      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(query);
        const rankMatch = item.rank?.toLowerCase().includes(query) ?? false;
        const divisionMatch = item.division?.toLowerCase().includes(query) ?? false;
        const organizationMatch = item.organization?.toLowerCase().includes(query) ?? false;

        if (!nameMatch && !rankMatch && !divisionMatch && !organizationMatch) {
          return false;
        }
      }

      return true;
    });
  }, [activity, filters.typeFilter, filters.directionFilter, filters.searchQuery]);

  const getBorderColor = useCallback((item: ActivityItem): string => {
    if (item.direction === 'in') return 'border-l-success';
    return 'border-l-warning';
  }, []);

  const getBadgeColor = useCallback((item: ActivityItem): 'success' | 'warning' => {
    if (item.direction === 'in') return 'success';
    return 'warning';
  }, []);

  const getBadgeLabel = useCallback((item: ActivityItem): string => {
    if (item.direction === 'in') return 'Check-In';
    return 'Check-Out';
  }, []);

  const getSecondaryInfo = useCallback((item: ActivityItem): string => {
    if (item.type === 'checkin') {
      // Member: show division and kiosk
      const parts: string[] = [];
      if (item.division) parts.push(item.division);
      if (item.kioskName) parts.push(item.kioskName);
      return parts.join(' • ');
    }
    // Visitor: show organization and visit details
    const parts: string[] = [];
    if (item.organization) parts.push(item.organization);
    if (item.visitType) {
      const visitTypeLabels: Record<string, string> = {
        contractor: 'Contractor',
        recruitment: 'Recruitment',
        event: 'Event',
        official: 'Official',
        museum: 'Museum',
        other: 'Other',
      };
      parts.push(visitTypeLabels[item.visitType] ?? item.visitType);
    }
    if (item.kioskName) parts.push(item.kioskName);
    return parts.join(' • ');
  }, []);

  const getVisitorDetails = useCallback((item: ActivityItem): string | null => {
    if (item.type !== 'visitor') return null;
    const parts: string[] = [];
    if (item.visitReason) parts.push(item.visitReason);
    if (item.hostName) parts.push(`Host: ${item.hostName}`);
    if (item.eventName) parts.push(`Event: ${item.eventName}`);
    return parts.length > 0 ? parts.join(' • ') : null;
  }, []);

  if (isCollapsed) {
    return (
      <div
        className="w-10 h-full bg-default-100 flex items-center justify-center cursor-pointer hover:bg-default-200 transition-colors rounded-l-lg border-l border-y border-default-200"
        onClick={() => onCollapseChange(false)}
        role="button"
        aria-label="Expand activity panel"
      >
        <div className="flex flex-col items-center" style={{ writingMode: 'vertical-rl' }}>
          <span className="text-sm font-medium text-default-600">Activity</span>
          <Icon icon="solar:alt-arrow-left-linear" width={14} className="text-default-400 mt-1 rotate-180" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 h-full transition-all duration-300">
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-col gap-3 shrink-0">
          <div className="flex flex-row items-center justify-between w-full">
            <h3 className="font-semibold">Activity</h3>
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onClick={() => onCollapseChange(true)}
              aria-label="Collapse activity panel"
            >
              <Icon icon="solar:alt-arrow-right-linear" width={16} />
            </Button>
          </div>
          {/* Direction Filter */}
          <div className="flex gap-2 w-full">
            {(['all', 'in', 'out'] as const).map((direction) => (
              <Chip
                key={direction}
                variant={filters.directionFilter === direction ? 'solid' : 'bordered'}
                color={filters.directionFilter === direction ? 'primary' : 'default'}
                className="cursor-pointer flex-1"
                onClick={() => onDirectionFilterChange(direction)}
                role="button"
                aria-pressed={filters.directionFilter === direction}
                aria-label={`Filter by direction: ${direction}`}
              >
                {direction.charAt(0).toUpperCase() + direction.slice(1)}
              </Chip>
            ))}
          </div>
        </CardHeader>
        <CardBody className="overflow-y-auto flex-1 p-0">
          {filteredActivity.length === 0 ? (
            <p className="text-center text-default-500 py-4">No activity found</p>
          ) : (
            <div className="h-full">
              <ul className="divide-y divide-divider">
                {filteredActivity.map((item) => {
                  const visitorDetails = getVisitorDetails(item);
                  return (
                    <li
                      key={item.id}
                      className={`flex items-center justify-between py-3 px-3 border-l-4 ${getBorderColor(item)} hover:bg-default-100 transition-colors`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {item.rank && `${item.rank} `}
                            {item.name}
                          </p>
                          {item.type === 'visitor' && (
                            <Chip size="sm" variant="flat" color="primary" className="shrink-0">
                              Visitor
                            </Chip>
                          )}
                        </div>
                        <p className="text-sm text-default-600 truncate">{getSecondaryInfo(item)}</p>
                        {visitorDetails && (
                          <p className="text-xs text-default-500 truncate mt-0.5">{visitorDetails}</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={getBadgeColor(item)}
                          className="font-medium"
                        >
                          {getBadgeLabel(item)}
                        </Chip>
                        <Tooltip content={format(new Date(item.timestamp), 'PPpp')} placement="left">
                          <p className="text-xs text-default-500 cursor-help">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </p>
                        </Tooltip>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
