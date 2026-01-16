/**
 * ActivityPanel Component
 *
 * Displays a filterable activity feed with member check-ins and visitor activity.
 * Uses HeroUI semantic colors and extracted utilities for consistent theming.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardBody, Chip, Input, Tooltip, Divider } from '@heroui/react';
import { formatDistanceToNow, format } from 'date-fns';
import type { ActivityItem } from '../../types';
import {
  filterActivityItems,
  getActivityBorderColor,
  getActivityBadgeColor,
  getActivityBadgeLabel,
  getActivitySecondaryInfo,
  getVisitorDetails,
  type ActivityTypeFilter,
  type ActivityDirectionFilter,
} from '../../utils/activity-feed';

export interface ActivityPanelStats {
  members: number;
  visitors: number;
}

export interface ActivityPanelProps {
  /** Array of activity items to display */
  activity: ActivityItem[];
  /** Optional class name for additional styling */
  className?: string;
  /** Optional stats to display in header */
  stats?: ActivityPanelStats;
}

/**
 * ActivityPanel displays a filterable list of recent activity.
 * Supports filtering by type (members/visitors), direction (in/out),
 * and free-text search.
 */
export function ActivityPanel({ activity, className = '', stats }: ActivityPanelProps) {
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<ActivityDirectionFilter>('all');
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
      setTick((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter activity using extracted utility
  const filteredActivity = useMemo(() => {
    return filterActivityItems(activity, {
      typeFilter,
      directionFilter,
      searchQuery: debouncedSearch,
    });
  }, [activity, typeFilter, directionFilter, debouncedSearch]);

  const renderActivityItem = useCallback((item: ActivityItem) => {
    const visitorDetails = getVisitorDetails(item);
    const borderColor = getActivityBorderColor(item.direction);
    const badgeColor = getActivityBadgeColor(item.direction);
    const badgeLabel = getActivityBadgeLabel(item.direction);
    const secondaryInfo = getActivitySecondaryInfo(item);

    return (
      <li
        key={item.id}
        className={`flex items-center justify-between py-3 px-3 border-l-4 ${borderColor} hover:bg-default-100 transition-colors`}
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
          <p className="text-sm text-default-600 truncate">{secondaryInfo}</p>
          {visitorDetails && (
            <p className="text-xs text-default-500 truncate mt-0.5">{visitorDetails}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
          <Chip size="sm" variant="flat" color={badgeColor} className="font-medium">
            {badgeLabel}
          </Chip>
          <Tooltip content={format(new Date(item.timestamp), 'PPpp')} placement="left">
            <p className="text-xs text-default-500 cursor-help">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </p>
          </Tooltip>
        </div>
      </li>
    );
  }, []);

  return (
    <Card className={`flex flex-1 flex-col overflow-hidden ${className}`}>
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-4">
        <div className="flex flex-row items-center gap-3 flex-nowrap">
          <h2 className="text-base font-semibold">Recent Activity</h2>

          <Divider orientation="vertical" className="h-6 self-stretch bg-default-300" />
          {/* Type Filter */}
          <div className="flex gap-2">
            {(['all', 'members', 'visitors'] as const).map((type) => (
              <Chip
                key={type}
                onClick={() => setTypeFilter(type)}
                variant={typeFilter === type ? 'solid' : 'bordered'}
                className="cursor-pointer"
                color={typeFilter === type ? 'primary' : 'default'}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Chip>
            ))}
          </div>

          <Divider orientation="vertical" className="h-6 self-stretch bg-default-300" />

          {/* Direction Filter */}
          <div className="flex gap-2">
            {(['all', 'in', 'out'] as const).map((direction) => (
              <Chip
                key={direction}
                onClick={() => setDirectionFilter(direction)}
                variant={directionFilter === direction ? 'solid' : 'bordered'}
                className="cursor-pointer"
                color={directionFilter === direction ? 'secondary' : 'default'}
              >
                {direction.charAt(0).toUpperCase() + direction.slice(1)}
              </Chip>
            ))}
          </div>

          <Divider orientation="vertical" className="h-6 self-stretch bg-default-300" />

          {/* Search Input */}
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            classNames={{
              base: 'w-40',
              inputWrapper:
                'border-0 border-b border-default-300 rounded-none shadow-none bg-transparent after:bg-transparent data-[focus=true]:border-default-400 data-[hover=true]:border-default-400 !ring-0 !ring-offset-0',
              input: 'bg-transparent focus:outline-none',
            }}
            size="sm"
            variant="underlined"
            isClearable
            onClear={() => setSearchQuery('')}
          />
        </div>

        {stats && (
          <div className="flex items-center gap-3">
            <Chip
              variant="flat"
              color="primary"
              startContent={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
            >
              {stats.visitors} Visitors
            </Chip>
            <Chip
              variant="flat"
              color="success"
              startContent={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              }
            >
              {stats.members} Members
            </Chip>
          </div>
        )}
      </CardHeader>

      <CardBody className="min-h-0 flex-1 overflow-hidden p-0">
        {filteredActivity.length === 0 ? (
          <p className="text-center text-default-500 py-4">No activity found</p>
        ) : (
          <div className="h-full overflow-y-auto px-3">
            <ul className="divide-y divide-divider">{filteredActivity.map(renderActivityItem)}</ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default ActivityPanel;
