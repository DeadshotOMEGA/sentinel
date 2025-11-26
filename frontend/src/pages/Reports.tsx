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
} from '@heroui/react';
import { format } from 'date-fns';
import PageWrapper from '../components/PageWrapper';
import { api } from '../lib/api';
import type { MemberWithDivision, Division } from '@shared/types';

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

export default function Reports() {
  const [tab, setTab] = useState('presence');
  const [divisionFilter, setDivisionFilter] = useState<string>('');

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

  const handleExport = () => {
    if (!presenceList) {
      throw new Error('Cannot export - no presence data available');
    }
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
    a.download = `attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <PageWrapper title="Reports">
      <div className="space-y-6">
        <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as string)}>
          <Tab key="presence" title="Current Presence" />
          <Tab key="history" title="Attendance History" />
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
            ) : presenceError ? (
              <Card>
                <CardBody className="py-12 text-center text-danger">
                  Failed to load presence data. Please try refreshing the page.
                </CardBody>
              </Card>
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
                  {(presenceList ? presenceList : []).map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.serviceNumber}</TableCell>
                      <TableCell>{member.firstName} {member.lastName}</TableCell>
                      <TableCell>{member.rank}</TableCell>
                      <TableCell>{member.division.name}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                            member.currentStatus === 'present'
                              ? 'bg-success-100 text-success-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {member.currentStatus === 'present' ? 'Present' : 'Absent'}
                        </span>
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
