import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardBody, Chip, Input, Tooltip } from '@heroui/react';
import { formatDistanceToNow, format } from 'date-fns';
import type { ActivityItem } from '../../../shared/types';

interface ActivityPanelProps {
  activity: ActivityItem[];
  className?: string;
}

type TypeFilter = 'all' | 'members' | 'visitors';
type DirectionFilter = 'all' | 'in' | 'out';

export default function ActivityPanel({ activity, className = '' }: ActivityPanelProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [, setTick] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update relative times every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter activity based on type, direction, and search
  const filteredActivity = useMemo(() => {
    return activity.filter(item => {
      // Type filter
      if (typeFilter === 'members' && item.type !== 'checkin') return false;
      if (typeFilter === 'visitors' && item.type !== 'visitor') return false;

      // Direction filter
      if (directionFilter !== 'all' && item.direction !== directionFilter) return false;

      // Search filter
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
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
  }, [activity, typeFilter, directionFilter, debouncedSearch]);

  const getBorderColor = useCallback((item: ActivityItem): string => {
    if (item.type === 'visitor') return 'border-l-primary';
    if (item.direction === 'in') return 'border-l-success';
    return 'border-l-warning';
  }, []);

  const getBadgeColor = useCallback((item: ActivityItem): 'success' | 'warning' | 'primary' => {
    if (item.type === 'visitor') return 'primary';
    if (item.direction === 'in') return 'success';
    return 'warning';
  }, []);

  const getBadgeLabel = useCallback((item: ActivityItem): string => {
    if (item.type === 'visitor') return 'VISITOR';
    if (item.direction === 'in') return 'IN';
    return 'OUT';
  }, []);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Recent Activity</h2>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Type Filter */}
          <div className="flex gap-2 flex-wrap">
            <Chip
              onClick={() => setTypeFilter('all')}
              variant={typeFilter === 'all' ? 'solid' : 'bordered'}
              className="cursor-pointer"
              color={typeFilter === 'all' ? 'primary' : 'default'}
            >
              All
            </Chip>
            <Chip
              onClick={() => setTypeFilter('members')}
              variant={typeFilter === 'members' ? 'solid' : 'bordered'}
              className="cursor-pointer"
              color={typeFilter === 'members' ? 'primary' : 'default'}
            >
              Members
            </Chip>
            <Chip
              onClick={() => setTypeFilter('visitors')}
              variant={typeFilter === 'visitors' ? 'solid' : 'bordered'}
              className="cursor-pointer"
              color={typeFilter === 'visitors' ? 'primary' : 'default'}
            >
              Visitors
            </Chip>
          </div>

          {/* Direction Filter */}
          <div className="flex gap-2 flex-wrap">
            <Chip
              onClick={() => setDirectionFilter('all')}
              variant={directionFilter === 'all' ? 'solid' : 'bordered'}
              className="cursor-pointer"
              color={directionFilter === 'all' ? 'secondary' : 'default'}
            >
              All
            </Chip>
            <Chip
              onClick={() => setDirectionFilter('in')}
              variant={directionFilter === 'in' ? 'solid' : 'bordered'}
              className="cursor-pointer"
              color={directionFilter === 'in' ? 'secondary' : 'default'}
            >
              In
            </Chip>
            <Chip
              onClick={() => setDirectionFilter('out')}
              variant={directionFilter === 'out' ? 'solid' : 'bordered'}
              className="cursor-pointer"
              color={directionFilter === 'out' ? 'secondary' : 'default'}
            >
              Out
            </Chip>
          </div>

          {/* Search Input */}
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-[200px]"
            size="sm"
            isClearable
            onClear={() => setSearchQuery('')}
          />
        </div>
      </CardHeader>

      <CardBody>
        {filteredActivity.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No activity found</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <ul className="divide-y divide-gray-100">
              {filteredActivity.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-center justify-between py-3 px-3 border-l-4 ${getBorderColor(item)} hover:bg-gray-50 transition-colors`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {item.rank && `${item.rank} `}
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {item.type === 'checkin' ? item.division : item.organization}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 ml-4">
                    <Chip
                      size="sm"
                      variant="flat"
                      color={getBadgeColor(item)}
                      className="font-medium"
                    >
                      {getBadgeLabel(item)}
                    </Chip>
                    <Tooltip
                      content={format(new Date(item.timestamp), 'PPpp')}
                      placement="left"
                    >
                      <p className="text-xs text-gray-500 cursor-help">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </p>
                    </Tooltip>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
