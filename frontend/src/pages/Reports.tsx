import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  Tabs,
  Tab,
  Select,
  SelectItem,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Button,
  Input,
  Pagination,
  DateRangePicker,
} from '@heroui/react';
import { today, getLocalTimeZone } from '@internationalized/date';
import type { CalendarDate } from '@internationalized/date';
import type { RangeValue } from '@heroui/react';
import { format } from 'date-fns';
import PageWrapper from '../components/PageWrapper';
import { api } from '../lib/api';
import type { MemberWithDivision, Division, VisitType } from '@shared/types';

interface MemberPresenceItem {
  member: MemberWithDivision;
  status: 'present' | 'absent';
  lastCheckin?: {
    id: string;
    timestamp: Date | string;
  };
}

interface VisitorHistoryItem {
  id: string;
  name: string;
  organization: string;
  visitType: VisitType;
  purpose?: string;
  hostName?: string;
  eventName?: string;
  checkInTime: string;
  checkOutTime?: string;
  duration?: number;
}

interface VisitorHistoryResponse {
  visitors: VisitorHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function Reports() {
  const [tab, setTab] = useState('presence');
  const [divisionFilter, setDivisionFilter] = useState<string>('');

  // Visitor history state
  const [visitorPage, setVisitorPage] = useState(1);
  const [dateRange, setDateRange] = useState<RangeValue<CalendarDate>>({
    start: today(getLocalTimeZone()).subtract({ days: 30 }),
    end: today(getLocalTimeZone()),
  });
  const [visitorTypeFilter, setVisitorTypeFilter] = useState<string>('');
  const [visitorOrgSearch, setVisitorOrgSearch] = useState<string>('');

  const { data: divisionsData } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const response = await api.get<{ divisions: Division[] }>('/divisions');
      return response.data;
    },
  });
  const divisions = divisionsData?.divisions;

  const { data: presenceData, isLoading } = useQuery({
    queryKey: ['presence-list', divisionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (divisionFilter) params.set('divisionId', divisionFilter);
      const response = await api.get<{ presenceList: MemberPresenceItem[] }>(`/checkins/presence/list?${params}`);
      return response.data;
    },
    enabled: tab === 'presence',
  });
  const presenceList = presenceData?.presenceList;

  const { data: visitorHistory, isLoading: isLoadingVisitors } = useQuery({
    queryKey: [
      'visitor-history',
      visitorPage,
      dateRange.start.toString(),
      dateRange.end.toString(),
      visitorTypeFilter,
      visitorOrgSearch,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', visitorPage.toString());
      params.set('limit', '20');
      params.set('startDate', dateRange.start.toDate(getLocalTimeZone()).toISOString());
      params.set('endDate', dateRange.end.toDate(getLocalTimeZone()).toISOString());
      if (visitorTypeFilter) params.set('visitType', visitorTypeFilter);
      if (visitorOrgSearch) params.set('organization', visitorOrgSearch);
      const response = await api.get<VisitorHistoryResponse>(`/visitors/history?${params}`);
      return response.data;
    },
    enabled: tab === 'visitor-history',
  });

  const presentCount = presenceList?.filter((m) => m.status === 'present').length ?? 0;
  const absentCount = presenceList?.filter((m) => m.status === 'absent').length ?? 0;

  const handleExport = () => {
    if (!presenceList) {
      throw new Error('Cannot export - no presence data available');
    }
    const headers = ['Service #', 'Name', 'Rank', 'Division', 'Status', 'Last Check-In'];
    const rows = presenceList.map((item) => [
      item.member.serviceNumber,
      `${item.member.firstName} ${item.member.lastName}`,
      item.member.rank,
      item.member.division.name,
      item.status,
      item.lastCheckin ? format(new Date(item.lastCheckin.timestamp), 'yyyy-MM-dd HH:mm') : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handleVisitorExport = () => {
    if (!visitorHistory || !visitorHistory.visitors) {
      throw new Error('Cannot export - no visitor data available');
    }
    const headers = [
      'Name',
      'Organization',
      'Visit Type',
      'Purpose',
      'Host',
      'Event',
      'Check-In',
      'Check-Out',
      'Duration (min)',
    ];
    const rows = visitorHistory.visitors.map((v) => [
      v.name,
      v.organization,
      v.visitType,
      v.purpose ? v.purpose : '',
      v.hostName ? v.hostName : '',
      v.eventName ? v.eventName : '',
      format(new Date(v.checkInTime), 'yyyy-MM-dd HH:mm'),
      v.checkOutTime ? format(new Date(v.checkOutTime), 'yyyy-MM-dd HH:mm') : '',
      v.duration ? v.duration.toString() : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <PageWrapper title="Reports">
      <div className="flex-1 space-y-6 overflow-auto px-1 pb-1 -mx-1">
        <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as string)}>
          <Tab key="presence" title="Current Presence" />
          <Tab key="history" title="Attendance History" />
          <Tab key="visitor-history" title="Visitor History" />
        </Tabs>

        {tab === 'presence' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card>
                <CardBody className="text-center">
                  <p className="text-3xl font-bold text-success">{presentCount}</p>
                  <p className="text-sm text-gray-600">Present</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-3xl font-bold text-gray-500">{absentCount}</p>
                  <p className="text-sm text-gray-600">Absent</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {presenceList?.length ? presenceList.length : 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Members</p>
                </CardBody>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <Select
                label="Division"
                selectedKeys={divisionFilter ? [divisionFilter] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string | undefined;
                  setDivisionFilter(selected ? selected : '');
                }}
                className="max-w-[200px]"
                items={[{ id: '', name: 'All Divisions' }, ...(divisions ? divisions : [])]}
              >
                {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
              </Select>
              <div className="flex-1" />
              <Button variant="flat" onPress={handleExport}>
                Export CSV
              </Button>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <Table aria-label="Presence report">
                <TableHeader>
                  <TableColumn>SERVICE #</TableColumn>
                  <TableColumn>NAME</TableColumn>
                  <TableColumn>RANK</TableColumn>
                  <TableColumn>DIVISION</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>LAST CHECK-IN</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No members">
                  {(presenceList ?? []).map((item) => (
                    <TableRow key={item.member.id}>
                      <TableCell>{item.member.serviceNumber}</TableCell>
                      <TableCell>{item.member.firstName} {item.member.lastName}</TableCell>
                      <TableCell>{item.member.rank}</TableCell>
                      <TableCell>{item.member.division.name}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                            item.status === 'present'
                              ? 'bg-success-100 text-success-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {item.status === 'present' ? 'Present' : 'Absent'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.lastCheckin
                          ? format(new Date(item.lastCheckin.timestamp), 'MMM d, HH:mm')
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

        {tab === 'visitor-history' && (
          <>
            {/* Filters */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <DateRangePicker
                label="Date Range"
                visibleMonths={2}
                value={dateRange}
                onChange={(value) => {
                  if (value) {
                    setDateRange(value);
                    setVisitorPage(1);
                  }
                }}
              />
              <Select
                label="Visit Type"
                selectedKeys={visitorTypeFilter ? [visitorTypeFilter] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string | undefined;
                  setVisitorTypeFilter(selected ? selected : '');
                  setVisitorPage(1);
                }}
                items={[
                  { id: '', name: 'All Types' },
                  { id: 'contractor', name: 'Contractor' },
                  { id: 'recruitment', name: 'Recruitment' },
                  { id: 'event', name: 'Event' },
                  { id: 'official', name: 'Official' },
                  { id: 'museum', name: 'Museum' },
                  { id: 'other', name: 'Other' },
                ]}
              >
                {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
              </Select>
              <Input
                label="Organization"
                placeholder="Search organization..."
                value={visitorOrgSearch}
                onChange={(e) => {
                  setVisitorOrgSearch(e.target.value);
                  setVisitorPage(1);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {visitorHistory ? `${visitorHistory.total} total visitors` : ''}
              </div>
              <Button variant="flat" onPress={handleVisitorExport}>
                Export CSV
              </Button>
            </div>

            {/* Table */}
            {isLoadingVisitors ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <Table aria-label="Visitor history">
                  <TableHeader>
                    <TableColumn>NAME</TableColumn>
                    <TableColumn>ORGANIZATION</TableColumn>
                    <TableColumn>TYPE</TableColumn>
                    <TableColumn>PURPOSE</TableColumn>
                    <TableColumn>HOST</TableColumn>
                    <TableColumn>EVENT</TableColumn>
                    <TableColumn>CHECK-IN</TableColumn>
                    <TableColumn>CHECK-OUT</TableColumn>
                    <TableColumn>DURATION</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="No visitors found">
                    {(visitorHistory?.visitors ? visitorHistory.visitors : []).map((visitor) => (
                      <TableRow key={visitor.id}>
                        <TableCell>{visitor.name}</TableCell>
                        <TableCell>{visitor.organization}</TableCell>
                        <TableCell>
                          <span className="capitalize">{visitor.visitType}</span>
                        </TableCell>
                        <TableCell>{visitor.purpose ? visitor.purpose : '-'}</TableCell>
                        <TableCell>{visitor.hostName ? visitor.hostName : '-'}</TableCell>
                        <TableCell>{visitor.eventName ? visitor.eventName : '-'}</TableCell>
                        <TableCell>
                          {format(new Date(visitor.checkInTime), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          {visitor.checkOutTime
                            ? format(new Date(visitor.checkOutTime), 'MMM d, HH:mm')
                            : 'Still here'}
                        </TableCell>
                        <TableCell>
                          {visitor.duration ? `${visitor.duration} min` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {visitorHistory && visitorHistory.totalPages > 1 && (
                  <div className="flex justify-center">
                    <Pagination
                      total={visitorHistory.totalPages}
                      page={visitorPage}
                      onChange={setVisitorPage}
                      showControls
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
