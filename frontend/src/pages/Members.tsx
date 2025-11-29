import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
} from '../components/ui/heroui-polyfills';
import PageWrapper from '../components/PageWrapper';
import MemberModal from '../components/MemberModal';
import ImportModal from '../components/ImportModal';
import { api } from '../lib/api';
import type { MemberWithDivision, Division } from '@shared/types';
import {
  Badge,
  ConfirmDialog,
  DataTable,
  EmptyState,
  icons,
  type Column,
  type SortDirection,
} from '@sentinel/ui';

const { Trash2 } = icons;

function MembersList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithDivision | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<MemberWithDivision | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('serviceNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: membersData, isLoading, refetch } = useQuery({
    queryKey: ['members', { search, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const response = await api.get<{ members: MemberWithDivision[] }>(`/members?${params}`);
      return response.data;
    },
  });

  const { data: divisionsData } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const response = await api.get<{ divisions: Division[] }>('/divisions');
      return response.data;
    },
  });

  const members = membersData?.members ?? [];
  const divisions = divisionsData?.divisions ?? [];

  const handleEdit = (member: MemberWithDivision) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedMember(null);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
  };

  const handleSave = () => {
    refetch();
    handleClose();
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/members/${memberToDelete.id}`);
      await refetch();
      setMemberToDelete(null);
    } catch (error) {
      console.error('Failed to delete member:', error);
      // Error will be shown via toast/notification in future enhancement
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle sort changes
  const handleSort = (column: string, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  // Sort members client-side
  const sortedMembers = useMemo(() => {
    if (!sortDirection || !sortColumn) {
      return members;
    }

    return [...members].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      // Get values based on column key
      switch (sortColumn) {
        case 'name':
          aValue = `${a.lastName}, ${a.firstName}`.toLowerCase();
          bValue = `${b.lastName}, ${b.firstName}`.toLowerCase();
          break;
        case 'serviceNumber':
          aValue = a.serviceNumber;
          bValue = b.serviceNumber;
          break;
        case 'rank':
          // Rank is required per schema
          if (!a.rank || !b.rank) {
            throw new Error('Member missing required rank field');
          }
          aValue = a.rank.toLowerCase();
          bValue = b.rank.toLowerCase();
          break;
        case 'division':
          aValue = a.division.name.toLowerCase();
          bValue = b.division.name.toLowerCase();
          break;
        case 'mess':
          // Mess is optional - sort empty values last using high Unicode character
          aValue = a.mess ? a.mess.toLowerCase() : '\uffff';
          bValue = b.mess ? b.mess.toLowerCase() : '\uffff';
          break;
        default:
          throw new Error(`Unknown sort column: ${sortColumn}`);
      }

      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [members, sortColumn, sortDirection]);

  // Get member type display helper
  const getMemberTypeDisplay = (memberType: MemberWithDivision['memberType']) => {
    switch (memberType) {
      case 'class_a':
        return 'Class A';
      case 'class_b':
        return 'Class B';
      case 'class_c':
        return 'Class C';
      case 'reg_force':
        return 'Reg Force';
      default:
        throw new Error(`Unknown member type: ${memberType}`);
    }
  };

  // Get member type chip color
  const getMemberTypeColor = (memberType: MemberWithDivision['memberType']) => {
    switch (memberType) {
      case 'class_a':
        return 'default' as const;
      case 'class_b':
        return 'success' as const;
      case 'class_c':
        return 'warning' as const;
      case 'reg_force':
        return 'primary' as const;
      default:
        throw new Error(`Unknown member type: ${memberType}`);
    }
  };

  // Define columns for DataTable
  const columns: Column<MemberWithDivision>[] = [
    {
      key: 'serviceNumber',
      header: 'Service #',
      sortable: true,
      width: '120px',
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (member) => `${member.lastName}, ${member.firstName}`,
    },
    {
      key: 'rank',
      header: 'Rank',
      sortable: true,
      width: '100px',
    },
    {
      key: 'division',
      header: 'Division',
      sortable: true,
      render: (member) => member.division.name,
    },
    {
      key: 'mess',
      header: 'Mess',
      sortable: true,
      width: '100px',
      render: (member) => {
        if (!member.mess) {
          return '—';
        }
        return member.mess;
      },
    },
    {
      key: 'memberType',
      header: 'Type',
      width: '120px',
      render: (member) => (
        <Chip
          size="sm"
          variant="flat"
          color={getMemberTypeColor(member.memberType)}
        >
          {getMemberTypeDisplay(member.memberType)}
        </Chip>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (member) => (
        <Badge
          variant={member.status === 'active' ? 'active' : 'inactive'}
          size="sm"
        >
          {member.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '150px',
      render: (member) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="light"
            onPress={() => handleEdit(member)}
            aria-label={`Edit ${member.rank ? member.rank + ' ' : ''}${member.firstName} ${member.lastName}`}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="light"
            color="danger"
            isIconOnly
            onPress={() => setMemberToDelete(member)}
            aria-label={`Delete ${member.firstName} ${member.lastName}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageWrapper title="Members">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
            isClearable
            aria-label="Search members"
          />
          <Select
            selectedKeys={statusFilter ? [statusFilter] : []}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              setStatusFilter(key as string);
            }}
            className="max-w-[150px]"
            label="Status"
            aria-label="Filter members by status"
          >
            <SelectItem key="active">Active</SelectItem>
            <SelectItem key="inactive">Inactive</SelectItem>
            <SelectItem key="">All</SelectItem>
          </Select>
          <div className="flex-1" />
          <Button variant="bordered" onPress={() => setIsImportModalOpen(true)}>
            Import Nominal Roll
          </Button>
          <Button color="primary" onPress={handleAdd}>
            Add Member
          </Button>
        </div>

        {sortedMembers.length === 0 && !isLoading ? (
          <EmptyState
            variant={search || statusFilter ? 'no-results' : 'no-data'}
            heading="No members found"
            description={
              search || statusFilter
                ? 'Try adjusting your search or filters'
                : 'Add your first member to get started'
            }
            action={
              !search && !statusFilter
                ? {
                    label: 'Add Member',
                    onClick: handleAdd,
                  }
                : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={sortedMembers}
            keyExtractor={(member) => member.id}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            emptyMessage="No members found"
            aria-label="Members list"
          />
        )}
      </div>

      <MemberModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSave={handleSave}
        member={selectedMember}
        divisions={divisions}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => refetch()}
      />

      <ConfirmDialog
        isOpen={memberToDelete !== null}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleDeleteMember}
        title="Delete Member"
        message={
          memberToDelete
            ? `Are you sure you want to delete ${memberToDelete.firstName} ${memberToDelete.lastName}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </PageWrapper>
  );
}

export default function Members() {
  return <MembersList />;
}
