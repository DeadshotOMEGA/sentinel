import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  Tabs,
  Tab,
  Select,
  SelectItem,
  Spinner,
  Button,
  DateRangePicker,
  ButtonGroup,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '../components/ui/heroui-polyfills';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { parseDate, CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import { UserCheck, UserX, Users, Download, Calendar } from '@shared/ui/icons';
import PageWrapper from '../components/PageWrapper';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '../components/ui/SentinelTable';
import { api } from '../lib/api';
import { StatsCard, Badge } from '@sentinel/ui';
import type { MemberWithDivision, Division } from '@shared/types';
import AttendanceTrendChart from '../components/AttendanceTrendChart';

interface MemberPresence extends MemberWithDivision {
  currentStatus: 'present' | 'absent';
  lastCheckIn?: string;
  lastCheckOut?: string;
}

interface MemberPresenceApiItem {
  member: MemberWithDivision;
  status: 'present' | 'absent';
  lastCheckin?: {
    id: string;
    timestamp: string;
    direction: 'in' | 'out';
  };
}

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

interface DateRange {
  start: CalendarDate;
  end: CalendarDate;
}

export default function Reports() {
  const [tab, setTab] = useState('presence');
  const [divisionFilter, setDivisionFilter] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);
  const [reportGeneratedAt] = useState(new Date());

  // Calculate actual date range based on preset or custom selection
  const dateRange = useMemo((): DateRange => {
    if (datePreset === 'custom' && customDateRange) {
      return customDateRange;
    }

    const todayDate = today(getLocalTimeZone());

    switch (datePreset) {
      case 'today':
        return { start: todayDate, end: todayDate };
      case 'yesterday': {
        const yesterday = todayDate.subtract({ days: 1 });
        return { start: yesterday, end: yesterday };
      }
      case 'week': {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        return {
          start: parseDate(format(weekStart, 'yyyy-MM-dd')),
          end: parseDate(format(weekEnd, 'yyyy-MM-dd')),
        };
      }
      case 'month': {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        return {
          start: parseDate(format(monthStart, 'yyyy-MM-dd')),
          end: parseDate(format(monthEnd, 'yyyy-MM-dd')),
        };
      }
      default:
        return { start: todayDate, end: todayDate };
    }
  }, [datePreset, customDateRange]);

  const { data: divisions, isLoading: divisionsLoading } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const response = await api.get<{ divisions: Division[] }>('/divisions');
      return response.data.divisions;
    },
  });

  const { data: presenceList, isLoading: presenceLoading, error: presenceError } = useQuery({
    queryKey: ['presence-list', divisionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (divisionFilter) params.set('divisionId', divisionFilter);
      const response = await api.get<{ presenceList: MemberPresenceApiItem[] }>(`/checkins/presence/list?${params}`);
      // Transform API response to flat MemberPresence structure
      return response.data.presenceList.map((item): MemberPresence => ({
        ...item.member,
        currentStatus: item.status,
        lastCheckIn: item.lastCheckin?.direction === 'in' ? item.lastCheckin.timestamp : undefined,
        lastCheckOut: item.lastCheckin?.direction === 'out' ? item.lastCheckin.timestamp : undefined,
      }));
    },
    enabled: tab === 'presence',
  });

  const isLoading = presenceLoading || divisionsLoading;

  const presentCount = presenceList?.filter((m) => m.currentStatus === 'present').length ? presenceList.filter((m) => m.currentStatus === 'present').length : 0;
  const absentCount = presenceList?.filter((m) => m.currentStatus === 'absent').length ? presenceList.filter((m) => m.currentStatus === 'absent').length : 0;

  const handleExport = (exportFormat: 'csv' | 'pdf') => {
    if (!presenceList) {
      throw new Error('Cannot export - no presence data available');
    }

    if (exportFormat === 'pdf') {
      throw new Error('PDF export not yet implemented');
    }

    // CSV Export
    const headers = ['Service #', 'Name', 'Rank', 'Division', 'Status', 'Last Check-In'];
    const rows = presenceList.map((m) => [
      m.serviceNumber,
      `${m.firstName} ${m.lastName}`,
      m.rank,
      m.division.name,
      m.currentStatus,
      m.lastCheckIn ? format(new Date(m.lastCheckIn), 'yyyy-MM-dd HH:mm') : '',
    ]);

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const dateRangeStr = dateRange.start.toString() === dateRange.end.toString()
      ? dateRange.start.toString()
      : `${dateRange.start.toString()}_to_${dateRange.end.toString()}`;
    a.download = `attendance-${dateRangeStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePresetClick = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      setCustomDateRange(null);
    }
  };

  const handleCustomDateChange = (value: { start: CalendarDate; end: CalendarDate } | null) => {
    if (value) {
      setDatePreset('custom');
      setCustomDateRange(value);
    }
  };

  return (
    <PageWrapper title="Reports">
      <div className="space-y-6">
        <Tabs
          selectedKey={tab}
          onSelectionChange={(k) => setTab(k as string)}
          aria-label="Report type tabs"
        >
          <Tab key="presence" title="Current Presence" />
          <Tab key="history" title="Attendance History" />
        </Tabs>

        {tab === 'presence' && (
          <>
            {/* Date Range Controls */}
            <Card>
              <CardBody>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex-1">
                    <label id="date-range-label" className="text-sm font-medium text-gray-700 mb-2 block">
                      Select Date Range
                    </label>
                    <ButtonGroup variant="flat" size="sm" aria-labelledby="date-range-label" role="group">
                      <Button
                        onPress={() => handlePresetClick('today')}
                        color={datePreset === 'today' ? 'primary' : 'default'}
                        aria-pressed={datePreset === 'today'}
                        aria-label="Show today's report"
                      >
                        Today
                      </Button>
                      <Button
                        onPress={() => handlePresetClick('yesterday')}
                        color={datePreset === 'yesterday' ? 'primary' : 'default'}
                        aria-pressed={datePreset === 'yesterday'}
                        aria-label="Show yesterday's report"
                      >
                        Yesterday
                      </Button>
                      <Button
                        onPress={() => handlePresetClick('week')}
                        color={datePreset === 'week' ? 'primary' : 'default'}
                        aria-pressed={datePreset === 'week'}
                        aria-label="Show this week's report"
                      >
                        This Week
                      </Button>
                      <Button
                        onPress={() => handlePresetClick('month')}
                        color={datePreset === 'month' ? 'primary' : 'default'}
                        aria-pressed={datePreset === 'month'}
                        aria-label="Show this month's report"
                      >
                        This Month
                      </Button>
                    </ButtonGroup>
                  </div>
                  <div className="w-full sm:w-auto">
                    <DateRangePicker
                      label="Custom Range"
                      value={datePreset === 'custom' && customDateRange ? customDateRange : dateRange}
                      onChange={handleCustomDateChange}
                      variant="bordered"
                      size="sm"
                      className="max-w-xs"
                      startContent={<Calendar className="w-4 h-4" />}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Report as of {format(reportGeneratedAt, 'MMM d, yyyy h:mm a')}
                </p>
              </CardBody>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatsCard
                value={presentCount}
                label="Present"
                variant="success"
                icon={UserCheck}
                loading={isLoading}
              />
              <StatsCard
                value={absentCount}
                label="Absent"
                variant="neutral"
                icon={UserX}
                loading={isLoading}
              />
              <StatsCard
                value={presenceList?.length ?? 0}
                label="Total Members"
                variant="neutral"
                icon={Users}
                loading={isLoading}
              />
            </div>

            {/* Attendance Trend Chart */}
            <AttendanceTrendChart days={7} />

            {/* Filters and Export */}
            {divisions && (
              <div className="flex items-center gap-4">
                <Select
                  label="Division"
                  selectedKeys={divisionFilter ? [divisionFilter] : []}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0];
                    if (typeof key === 'string') {
                      setDivisionFilter(key);
                    } else {
                      setDivisionFilter('');
                    }
                  }}
                  className="max-w-[200px]"
                  aria-label="Filter members by division"
                >
                  {[
                    <SelectItem key="">All Divisions</SelectItem>,
                    ...divisions.map((division) => (
                      <SelectItem key={division.id}>{division.name}</SelectItem>
                    ))
                  ]}
                </Select>
                <div className="flex-1" />
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      variant="flat"
                      startContent={<Download className="w-4 h-4" />}
                      aria-label="Export attendance data"
                    >
                      Export
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Export format options"
                    onAction={(key) => handleExport(key as 'csv' | 'pdf')}
                  >
                    <DropdownItem key="csv">Export as CSV</DropdownItem>
                    <DropdownItem key="pdf" className="text-gray-400">
                      Export as PDF (Coming Soon)
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            )}

            {/* Table */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : presenceError ? (
              <Card>
                <CardBody className="py-12 text-center text-danger">
                  Failed to load presence data. Please try refreshing the page.
                </CardBody>
              </Card>
            ) : (
              <Table aria-label="Member presence report">
                <TableHeader>
                  <TableColumn>SERVICE #</TableColumn>
                  <TableColumn>NAME</TableColumn>
                  <TableColumn>RANK</TableColumn>
                  <TableColumn>DIVISION</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>LAST CHECK-IN</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No members">
                  {(presenceList ? presenceList : []).map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.serviceNumber}</TableCell>
                      <TableCell>{member.firstName} {member.lastName}</TableCell>
                      <TableCell>{member.rank}</TableCell>
                      <TableCell>{member.division.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={member.currentStatus === 'present' ? 'present' : 'absent'}
                          size="sm"
                        >
                          {member.currentStatus === 'present' ? 'Present' : 'Absent'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.lastCheckIn
                          ? format(new Date(member.lastCheckIn), 'MMM d, HH:mm')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}

        {tab === 'history' && (
          <Card>
            <CardBody className="py-12 text-center text-gray-500">
              Attendance history reports coming in a future update.
            </CardBody>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
