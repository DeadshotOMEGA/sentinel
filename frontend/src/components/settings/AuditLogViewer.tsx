import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Select,
  SelectItem,
  Input,
  Spinner,
} from '@heroui/react';
import { format } from 'date-fns';
import { api } from '../../lib/api';

// Actual API response format (generic audit log)
interface AuditLog {
  id: string;
  adminUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Actions' },
  { value: 'user_created', label: 'User Created' },
  { value: 'user_updated', label: 'User Updated' },
  { value: 'user_deleted', label: 'User Deleted' },
  { value: 'user_disabled', label: 'User Disabled' },
  { value: 'user_enabled', label: 'User Enabled' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'role_changed', label: 'Role Changed' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatAction(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDetails(details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) {
    return '-';
  }

  const entries = Object.entries(details);
  if (entries.length <= 2) {
    return entries
      .map(([key, value]) => {
        const formattedKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        return `${formattedKey}: ${String(value)}`;
      })
      .join(', ');
  }

  return JSON.stringify(details);
}

export default function AuditLogViewer() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, limit, actionFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (actionFilter && actionFilter !== 'all') {
        params.set('action', actionFilter);
      }
      if (startDate) {
        params.set('startDate', new Date(startDate).toISOString());
      }
      if (endDate) {
        params.set('endDate', new Date(endDate).toISOString());
      }
      const response = await api.get<AuditLogsResponse>(`/audit-logs?${params.toString()}`);
      return response.data;
    },
  });

  const handleClearFilters = () => {
    setActionFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasFilters = actionFilter !== 'all' || startDate || endDate;

  const totalCount = data?.pagination.totalItems ?? 0;
  const startItem = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalCount);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">User Management Audit Log</h3>
            <p className="text-sm text-gray-600 mt-1">
              Track all user management activities and changes
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Action"
            selectedKeys={[actionFilter]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              if (selected) {
                setActionFilter(selected);
                setPage(1);
              }
            }}
            className="w-48"
          >
            {ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
          <Input
            type="date"
            label="Start Date"
            value={startDate}
            onValueChange={(v) => {
              setStartDate(v);
              setPage(1);
            }}
            className="w-44"
          />
          <Input
            type="date"
            label="End Date"
            value={endDate}
            onValueChange={(v) => {
              setEndDate(v);
              setPage(1);
            }}
            className="w-44"
          />
          {hasFilters && (
            <Button variant="light" onPress={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <Table aria-label="Audit logs table">
              <TableHeader>
                <TableColumn>Timestamp</TableColumn>
                <TableColumn>Action</TableColumn>
                <TableColumn>Entity Type</TableColumn>
                <TableColumn>Entity ID</TableColumn>
                <TableColumn>IP Address</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No audit logs found">
                {(data?.logs ?? []).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>{formatAction(log.action)}</TableCell>
                    <TableCell className="capitalize">{log.entityType}</TableCell>
                    <TableCell>
                      <span className="text-xs text-default-500 font-mono truncate block max-w-[120px]">
                        {log.entityId || '-'}
                      </span>
                    </TableCell>
                    <TableCell>{log.ipAddress}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-default-500">Rows per page:</span>
                <Select
                  selectedKeys={[limit.toString()]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    if (selected) {
                      setLimit(parseInt(selected, 10));
                      setPage(1);
                    }
                  }}
                  className="w-20"
                  size="sm"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size.toString()}>
                      {size.toString()}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-default-500">
                  Showing {startItem}-{endItem} of {totalCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    isDisabled={!data?.pagination.hasPrevPage}
                    onPress={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    isDisabled={!data?.pagination.hasNextPage}
                    onPress={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
