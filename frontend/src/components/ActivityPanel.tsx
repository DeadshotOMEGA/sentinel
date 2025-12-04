import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardBody, Chip, Input, Tooltip, Divider } from '@heroui/react';
import { formatDistanceToNow, format } from 'date-fns';
import type { ActivityItem } from '../../../shared/types';

interface ActivityPanelProps {
  activity: ActivityItem[];
  className?: string;
  stats?: {
    members: number;
    visitors: number;
  };
}

type TypeFilter = 'all' | 'members' | 'visitors';
type DirectionFilter = 'all' | 'in' | 'out';

export default function ActivityPanel({ activity, className = '', stats }: ActivityPanelProps) {
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

  return (
    <Card className={`flex flex-1 flex-col overflow-hidden ${className}`}>
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-4">
        <div className="flex flex-row items-center gap-3 flex-nowrap">
          <h2 className="text-base font-semibold">Recent Activity</h2>

          <Divider orientation="vertical" className="h-6 self-stretch bg-default-300" />
          {/* Type Filter */}
          <div className="flex gap-2">
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

          <Divider orientation="vertical" className="h-6 self-stretch bg-default-300" />

          {/* Direction Filter */}
          <div className="flex gap-2">
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

          <Divider orientation="vertical" className="h-6 self-stretch bg-default-300" />

          {/* Search Input */}
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            classNames={{
              base: "w-40",
              inputWrapper: "border-0 border-b border-default-300 rounded-none shadow-none bg-transparent after:bg-transparent data-[focus=true]:border-default-400 data-[hover=true]:border-default-400 !ring-0 !ring-offset-0",
              input: "bg-transparent focus:outline-none",
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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
          <p className="text-center text-gray-500 py-4">No activity found</p>
        ) : (
          <div className="h-full overflow-y-auto px-3">
            <ul className="divide-y divide-gray-100">
              {filteredActivity.map((item) => {
                const visitorDetails = getVisitorDetails(item);
                return (
                  <li
                    key={item.id}
                    className={`flex items-center justify-between py-3 px-3 border-l-4 ${getBorderColor(item)} hover:bg-gray-50 transition-colors`}
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
                      <p className="text-sm text-gray-600 truncate">
                        {getSecondaryInfo(item)}
                      </p>
                      {visitorDetails && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {visitorDetails}
                        </p>
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
                );
              })}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
