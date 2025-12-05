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
  RadioGroup,
  Radio,
} from '@heroui/react';
import { today, getLocalTimeZone } from '@internationalized/date';
import type { CalendarDate } from '@internationalized/date';
import type { RangeValue } from '@heroui/react';
import { format } from 'date-fns';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import PageWrapper from '../components/PageWrapper';
import { api } from '../lib/api';
import type { MemberWithDivision, Division, VisitType } from '@shared/types';
import { Letterhead } from '../components/reports/pdf/Letterhead';
import { PDFTable } from '../components/reports/pdf/PDFTable';
import { toast } from '../lib/toast';

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
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Visitor history state
  const [visitorPage, setVisitorPage] = useState(1);
  const [dateRange, setDateRange] = useState<RangeValue<CalendarDate>>({
    start: today(getLocalTimeZone()).subtract({ days: 30 }),
    end: today(getLocalTimeZone()),
  });
  const [visitorTypeFilter, setVisitorTypeFilter] = useState<string>('');
  const [visitorOrgSearch, setVisitorOrgSearch] = useState<string>('');

  // Training Night Attendance state
  const [trainingPeriod, setTrainingPeriod] = useState<string>('current_year');
  const [trainingDivision, setTrainingDivision] = useState<string>('');
  const [organizationOption, setOrganizationOption] = useState<string>('full_unit');
  const [trainingDateRange, setTrainingDateRange] = useState<RangeValue<CalendarDate>>({
    start: today(getLocalTimeZone()).subtract({ months: 3 }),
    end: today(getLocalTimeZone()),
  });

  // BMQ Attendance state
  const [bmqCourseId, setBmqCourseId] = useState<string>('');
  const [bmqDivision, setBmqDivision] = useState<string>('');

  // Personnel Roster state
  const [rosterDivision, setRosterDivision] = useState<string>('');
  const [rosterSortOrder, setRosterSortOrder] = useState<string>('division_rank');

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

  // PDF Generation Handlers
  const handlePresencePdfDownload = async () => {
    if (!presenceList) {
      toast.error('No presence data available');
      return;
    }

    setGeneratingPdf(true);
    try {
      const pdfDoc = (
        <Letterhead reportTitle="Current Presence Report">
          <PDFTable
            columns={[
              { key: 'serviceNumber', header: 'Service #', width: '15%', align: 'left' },
              { key: 'name', header: 'Name', width: '25%', align: 'left' },
              { key: 'rank', header: 'Rank', width: '15%', align: 'left' },
              { key: 'division', header: 'Division', width: '15%', align: 'left' },
              { key: 'status', header: 'Status', width: '15%', align: 'center' },
              { key: 'lastCheckin', header: 'Last Check-In', width: '15%', align: 'left' },
            ]}
            data={presenceList.map((item) => ({
              serviceNumber: item.member.serviceNumber,
              name: `${item.member.firstName} ${item.member.lastName}`,
              rank: item.member.rank,
              division: item.member.division.name,
              status: item.status === 'present' ? 'Present' : 'Absent',
              lastCheckin: item.lastCheckin
                ? format(new Date(item.lastCheckin.timestamp), 'MMM d, HH:mm')
                : '-',
            }))}
          />
        </Letterhead>
      );

      const blob = await pdf(pdfDoc).toBlob();
      saveAs(blob, `presence-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
      throw error;
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleVisitorPdfDownload = async () => {
    if (!visitorHistory || !visitorHistory.visitors) {
      toast.error('No visitor data available');
      return;
    }

    setGeneratingPdf(true);
    try {
      const pdfDoc = (
        <Letterhead reportTitle="Visitor History Report">
          <PDFTable
            columns={[
              { key: 'name', header: 'Name', width: '15%', align: 'left' },
              { key: 'organization', header: 'Organization', width: '15%', align: 'left' },
              { key: 'type', header: 'Type', width: '10%', align: 'left' },
              { key: 'purpose', header: 'Purpose', width: '15%', align: 'left' },
              { key: 'host', header: 'Host', width: '12%', align: 'left' },
              { key: 'checkIn', header: 'Check-In', width: '12%', align: 'left' },
              { key: 'checkOut', header: 'Check-Out', width: '12%', align: 'left' },
              { key: 'duration', header: 'Duration', width: '9%', align: 'right' },
            ]}
            data={visitorHistory.visitors.map((v) => ({
              name: v.name,
              organization: v.organization,
              type: v.visitType,
              purpose: v.purpose ? v.purpose : '-',
              host: v.hostName ? v.hostName : '-',
              checkIn: format(new Date(v.checkInTime), 'MMM d, HH:mm'),
              checkOut: v.checkOutTime ? format(new Date(v.checkOutTime), 'MMM d, HH:mm') : 'Active',
              duration: v.duration ? `${v.duration} min` : '-',
            }))}
          />
        </Letterhead>
      );

      const blob = await pdf(pdfDoc).toBlob();
      saveAs(blob, `visitor-history-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
      throw error;
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleTrainingNightPdfDownload = async () => {
    setGeneratingPdf(true);
    try {
      const config = {
        periodStart: trainingPeriod === 'custom'
          ? trainingDateRange.start.toDate(getLocalTimeZone()).toISOString()
          : undefined,
        periodEnd: trainingPeriod === 'custom'
          ? trainingDateRange.end.toDate(getLocalTimeZone()).toISOString()
          : undefined,
        period: trainingPeriod,
        organizationOption,
        divisionId: trainingDivision ? trainingDivision : undefined,
      };

      const response = await api.post('/reports/training-night-attendance', config);
      const data = response.data;

      // Build PDF from returned data
      const pdfDoc = (
        <Letterhead reportTitle="Training Night Attendance Report">
          <PDFTable
            columns={[
              { key: 'serviceNumber', header: 'Service #', width: '15%', align: 'left' },
              { key: 'name', header: 'Name', width: '25%', align: 'left' },
              { key: 'rank', header: 'Rank', width: '15%', align: 'left' },
              { key: 'division', header: 'Division', width: '15%', align: 'left' },
              { key: 'attendance', header: 'Attendance', width: '15%', align: 'center' },
              { key: 'trend', header: 'Trend', width: '15%', align: 'center' },
            ]}
            data={data.records.map((record: { member: { serviceNumber: string; firstName: string; lastName: string; rank: string; division: { name: string } }; attendance: { percentage?: number; display?: string }; trend: { trend: string; delta?: number } }) => ({
              serviceNumber: record.member.serviceNumber,
              name: `${record.member.firstName} ${record.member.lastName}`,
              rank: record.member.rank,
              division: record.member.division.name,
              attendance: record.attendance.percentage
                ? `${record.attendance.percentage.toFixed(1)}%`
                : record.attendance.display ? record.attendance.display : '-',
              trend: record.trend.trend === 'up'
                ? '↑'
                : record.trend.trend === 'down'
                ? '↓'
                : '→',
            }))}
          />
        </Letterhead>
      );

      const blob = await pdf(pdfDoc).toBlob();
      saveAs(blob, `training-night-attendance-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
      throw error;
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleBmqPdfDownload = async () => {
    if (!bmqCourseId) {
      toast.error('Please select a BMQ course');
      return;
    }

    setGeneratingPdf(true);
    try {
      const config = {
        courseId: bmqCourseId,
        divisionId: bmqDivision ? bmqDivision : undefined,
      };

      const response = await api.post('/reports/bmq-attendance', config);
      const data = response.data;

      const pdfDoc = (
        <Letterhead reportTitle="BMQ Attendance Report">
          <PDFTable
            columns={[
              { key: 'serviceNumber', header: 'Service #', width: '15%', align: 'left' },
              { key: 'name', header: 'Name', width: '30%', align: 'left' },
              { key: 'rank', header: 'Rank', width: '15%', align: 'left' },
              { key: 'division', header: 'Division', width: '20%', align: 'left' },
              { key: 'attendance', header: 'Attendance', width: '20%', align: 'center' },
            ]}
            data={data.records.map((record: { member: { serviceNumber: string; firstName: string; lastName: string; rank: string; division: { name: string } }; attendance: { percentage?: number; display?: string } }) => ({
              serviceNumber: record.member.serviceNumber,
              name: `${record.member.firstName} ${record.member.lastName}`,
              rank: record.member.rank,
              division: record.member.division.name,
              attendance: record.attendance.percentage
                ? `${record.attendance.percentage.toFixed(1)}%`
                : record.attendance.display ? record.attendance.display : '-',
            }))}
          />
        </Letterhead>
      );

      const blob = await pdf(pdfDoc).toBlob();
      saveAs(blob, `bmq-attendance-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
      throw error;
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePersonnelRosterPdfDownload = async () => {
    setGeneratingPdf(true);
    try {
      const config = {
        divisionId: rosterDivision ? rosterDivision : undefined,
        sortOrder: rosterSortOrder,
      };

      const response = await api.post('/reports/personnel-roster', config);
      const data = response.data;

      const pdfDoc = (
        <Letterhead reportTitle="Personnel Roster">
          <PDFTable
            columns={[
              { key: 'serviceNumber', header: 'Service #', width: '15%', align: 'left' },
              { key: 'name', header: 'Name', width: '30%', align: 'left' },
              { key: 'rank', header: 'Rank', width: '15%', align: 'left' },
              { key: 'division', header: 'Division', width: '20%', align: 'left' },
              { key: 'classification', header: 'Classification', width: '20%', align: 'left' },
            ]}
            data={data.members.map((member: { serviceNumber: string; firstName: string; lastName: string; rank: string; division: { name: string }; classification: string }) => ({
              serviceNumber: member.serviceNumber,
              name: `${member.firstName} ${member.lastName}`,
              rank: member.rank,
              division: member.division.name,
              classification: member.classification,
            }))}
          />
        </Letterhead>
      );

      const blob = await pdf(pdfDoc).toBlob();
      saveAs(blob, `personnel-roster-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
      throw error;
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <PageWrapper title="Reports">
      <div className="min-h-0 flex-1 space-y-6 overflow-auto px-1 pb-6 -mx-1">
        <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as string)}>
          <Tab key="presence" title="Current Presence" />
          <Tab key="training-night" title="Training Night Attendance" />
          <Tab key="bmq" title="BMQ Attendance" />
          <Tab key="personnel-roster" title="Personnel Roster" />
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
              <div className="flex gap-2">
                <Button variant="flat" onPress={handleExport}>
                  Export CSV
                </Button>
                <Button
                  variant="solid"
                  color="primary"
                  onPress={handlePresencePdfDownload}
                  isLoading={generatingPdf}
                >
                  Download PDF
                </Button>
              </div>
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

        {tab === 'training-night' && (
          <>
            {/* Filters */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Select
                label="Period"
                selectedKeys={trainingPeriod ? [trainingPeriod] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string | undefined;
                  setTrainingPeriod(selected ? selected : 'current_year');
                }}
                items={[
                  { id: 'current_year', name: 'Current Training Year' },
                  { id: 'last_year', name: 'Last Training Year' },
                  { id: 'custom', name: 'Custom Date Range' },
                ]}
              >
                {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
              </Select>

              <Select
                label="Division"
                selectedKeys={trainingDivision ? [trainingDivision] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string | undefined;
                  setTrainingDivision(selected ? selected : '');
                }}
                items={[{ id: '', name: 'All Divisions' }, ...(divisions ? divisions : [])]}
              >
                {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
              </Select>
            </div>

            {trainingPeriod === 'custom' && (
              <DateRangePicker
                label="Custom Date Range"
                visibleMonths={2}
                value={trainingDateRange}
                onChange={(value) => {
                  if (value) {
                    setTrainingDateRange(value);
                  }
                }}
              />
            )}

            <div className="space-y-4">
              <RadioGroup
                label="Organization"
                value={organizationOption}
                onValueChange={setOrganizationOption}
                orientation="horizontal"
              >
                <Radio value="full_unit">Full Unit</Radio>
                <Radio value="grouped_by_division">Grouped by Division</Radio>
                <Radio value="separated_by_division">Separated by Division</Radio>
              </RadioGroup>

              <div className="flex justify-end">
                <Button
                  variant="solid"
                  color="primary"
                  onPress={handleTrainingNightPdfDownload}
                  isLoading={generatingPdf}
                >
                  Download PDF
                </Button>
              </div>
            </div>

            <Card>
              <CardBody className="py-8 text-center text-gray-600">
                Configure filters above and click Download PDF to generate the report.
              </CardBody>
            </Card>
          </>
        )}

        {tab === 'bmq' && (
          <>
            {/* Filters */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="BMQ Course"
                selectedKeys={bmqCourseId ? [bmqCourseId] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string | undefined;
                  setBmqCourseId(selected ? selected : '');
                }}
                items={[
                  { id: '', name: 'Select a course...' },
                  // TODO: Load BMQ courses from API
                ]}
              >
                {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
              </Select>

              <Select
                label="Division"
                selectedKeys={bmqDivision ? [bmqDivision] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string | undefined;
                  setBmqDivision(selected ? selected : '');
                }}
                items={[{ id: '', name: 'All Divisions' }, ...(divisions ? divisions : [])]}
              >
                {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
              </Select>
            </div>

            <div className="flex justify-end">
              <Button
                variant="solid"
                color="primary"
                onPress={handleBmqPdfDownload}
                isLoading={generatingPdf}
                isDisabled={!bmqCourseId}
              >
                Download PDF
              </Button>
            </div>

            <Card>
              <CardBody className="py-8 text-center text-gray-600">
                Select a BMQ course and click Download PDF to generate the report.
              </CardBody>
            </Card>
          </>
        )}

        {tab === 'personnel-roster' && (
          <>
            {/* Filters */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Division"
                selectedKeys={rosterDivision ? [rosterDivision] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string | undefined;
                  setRosterDivision(selected ? selected : '');
                }}
                items={[{ id: '', name: 'All Divisions' }, ...(divisions ? divisions : [])]}
              >
                {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
              </Select>

              <Select
                label="Sort Order"
                selectedKeys={rosterSortOrder ? [rosterSortOrder] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string | undefined;
                  setRosterSortOrder(selected ? selected : 'division_rank');
                }}
                items={[
                  { id: 'division_rank', name: 'Division, then Rank' },
                  { id: 'rank', name: 'Rank' },
                  { id: 'alphabetical', name: 'Alphabetical' },
                ]}
              >
                {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
              </Select>
            </div>

            <div className="flex justify-end">
              <Button
                variant="solid"
                color="primary"
                onPress={handlePersonnelRosterPdfDownload}
                isLoading={generatingPdf}
              >
                Download PDF
              </Button>
            </div>

            <Card>
              <CardBody className="py-8 text-center text-gray-600">
                Configure filters above and click Download PDF to generate the roster.
              </CardBody>
            </Card>
          </>
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
              <div className="flex gap-2">
                <Button variant="flat" onPress={handleVisitorExport}>
                  Export CSV
                </Button>
                <Button
                  variant="solid"
                  color="primary"
                  onPress={handleVisitorPdfDownload}
                  isLoading={generatingPdf}
                >
                  Download PDF
                </Button>
              </div>
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
