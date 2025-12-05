import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Selection, SortDescriptor } from '@heroui/react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Chip,
  Spinner,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Link,
} from '@heroui/react';
import { SearchIcon } from '@heroui/shared-icons';
import { Icon } from '@iconify/react';
import PageWrapper from '../components/PageWrapper';
import MemberModal from '../components/MemberModal';
import ImportModal from '../components/ImportModal';
import MemberDetail from './MemberDetail';
import { api } from '../lib/api';
import type { MemberWithDivision, Division } from '@shared/types';

type ColumnKey =
  | 'serviceNumber'
  | 'name'
  | 'rank'
  | 'division'
  | 'mess'
  | 'memberType'
  | 'status'
  | 'actions';

interface Column {
  uid: ColumnKey;
  name: string;
  sortable?: boolean;
}

const columns: Column[] = [
  { uid: 'serviceNumber', name: 'SERVICE #', sortable: true },
  { uid: 'name', name: 'NAME', sortable: true },
  { uid: 'rank', name: 'RANK', sortable: true },
  { uid: 'division', name: 'DIVISION', sortable: true },
  { uid: 'mess', name: 'MESS', sortable: true },
  { uid: 'memberType', name: 'TYPE', sortable: true },
  { uid: 'status', name: 'STATUS', sortable: true },
  { uid: 'actions', name: 'ACTIONS', sortable: false },
];

const ITEMS_PER_BATCH = 20;

function MembersList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithDivision | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_BATCH);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'name',
    direction: 'ascending',
  });

  const loaderRef = useRef<HTMLDivElement>(null);

  const { data: membersData, isLoading, refetch } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('all', 'true');
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

  // Client-side filtering
  const filteredItems = useMemo(() => {
    let filtered = [...members];

    if (search) {
      filtered = filtered.filter((member) =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        member.serviceNumber.toLowerCase().includes(search.toLowerCase()) ||
        member.rank.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((member) => member.status === statusFilter);
    }

    return filtered;
  }, [members, search, statusFilter]);

  // Client-side sorting
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a: MemberWithDivision, b: MemberWithDivision) => {
      const column = sortDescriptor.column as ColumnKey;
      let first: string | number = '';
      let second: string | number = '';

      switch (column) {
        case 'serviceNumber':
          first = a.serviceNumber;
          second = b.serviceNumber;
          break;
        case 'name':
          first = `${a.firstName} ${a.lastName}`;
          second = `${b.firstName} ${b.lastName}`;
          break;
        case 'rank':
          first = a.rank;
          second = b.rank;
          break;
        case 'division':
          first = a.division.name;
          second = b.division.name;
          break;
        case 'mess':
          first = a.mess ? a.mess : '';
          second = b.mess ? b.mess : '';
          break;
        case 'memberType':
          first = a.memberType;
          second = b.memberType;
          break;
        case 'status':
          first = a.status;
          second = b.status;
          break;
        default:
          first = '';
          second = '';
      }

      const cmp = first < second ? -1 : first > second ? 1 : 0;
      return sortDescriptor.direction === 'descending' ? -cmp : cmp;
    });
  }, [filteredItems, sortDescriptor]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_BATCH);
  }, [search, statusFilter, sortDescriptor]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < sortedItems.length) {
          setVisibleCount((prev) => Math.min(prev + ITEMS_PER_BATCH, sortedItems.length));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [visibleCount, sortedItems.length]);

  // Visible items for infinite scroll
  const visibleItems = useMemo(() => {
    return sortedItems.slice(0, visibleCount);
  }, [sortedItems, visibleCount]);

  const renderCell = useCallback((member: MemberWithDivision, columnKey: React.Key) => {
    const key = columnKey as ColumnKey;

    switch (key) {
      case 'serviceNumber':
        return <div className="text-small">{member.serviceNumber}</div>;
      case 'name':
        return (
          <Link
            size="sm"
            color="primary"
            as="button"
            onPress={() => navigate(`/members/${member.id}`)}
          >
            {member.firstName} {member.lastName}
          </Link>
        );
      case 'rank':
        return <div className="text-small">{member.rank}</div>;
      case 'division':
        return <div className="text-small">{member.division.name}</div>;
      case 'mess':
        return <div className="text-small text-default-500">{member.mess ? member.mess : '—'}</div>;
      case 'memberType':
        return (
          <Chip
            size="sm"
            variant="flat"
            color={
              member.memberType === 'class_a' ? 'default' :
              member.memberType === 'class_b' ? 'success' :
              member.memberType === 'class_c' ? 'warning' :
              'primary'
            }
          >
            {member.memberType === 'class_a' ? 'Class A' :
             member.memberType === 'class_b' ? 'Class B' :
             member.memberType === 'class_c' ? 'Class C' :
             'Reg Force'}
          </Chip>
        );
      case 'status':
        return (
          <Chip
            size="sm"
            color={member.status === 'active' ? 'success' : 'default'}
          >
            {member.status}
          </Chip>
        );
      case 'actions':
        return (
          <Button size="sm" variant="flat" onPress={() => handleEdit(member)}>
            <Icon icon="solar:pen-linear" width={16} />
            Edit
          </Button>
        );
      default:
        return null;
    }
  }, [navigate]);

  const handleEdit = useCallback((member: MemberWithDivision) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedMember(null);
    setIsModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMember(null);
  }, []);

  const handleSave = useCallback(() => {
    refetch();
    handleClose();
  }, [refetch, handleClose]);

  const onSearchChange = useCallback((value?: string) => {
    if (value) {
      setSearch(value);
    } else {
      setSearch('');
    }
  }, []);

  const topContent = useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Input
            className="max-w-xs"
            placeholder="Search members..."
            value={search}
            onValueChange={onSearchChange}
            isClearable
            startContent={<SearchIcon className="text-default-400" width={16} />}
          />
          <Dropdown>
            <DropdownTrigger>
              <Button
                className="bg-default-100 text-default-800"
                size="sm"
                startContent={
                  <Icon className="text-default-400" icon="solar:filter-linear" width={16} />
                }
              >
                Status: {statusFilter === 'active' ? 'Active' : statusFilter === 'inactive' ? 'Inactive' : 'All'}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Status filter"
              selectionMode="single"
              selectedKeys={new Set([statusFilter])}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                setStatusFilter(value);
              }}
            >
              <DropdownItem key="active">Active</DropdownItem>
              <DropdownItem key="inactive">Inactive</DropdownItem>
              <DropdownItem key="">All</DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <div className="flex-1" />
          <Button variant="bordered" onPress={() => setIsImportModalOpen(true)}>
            <Icon icon="solar:import-linear" width={18} />
            Import Nominal Roll
          </Button>
          <Button color="primary" onPress={handleAdd}>
            <Icon icon="solar:add-circle-bold" width={18} />
            Add Member
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-small text-default-400">
            Showing {visibleItems.length} of {filteredItems.length} members
          </span>
          <span className="text-small text-default-400">
            {selectedKeys === 'all'
              ? 'All items selected'
              : `${selectedKeys.size} of ${filteredItems.length} selected`}
          </span>
        </div>
      </div>
    );
  }, [search, statusFilter, filteredItems.length, visibleItems.length, selectedKeys, onSearchChange, handleAdd]);

  const bottomContent = useMemo(() => {
    if (visibleCount >= sortedItems.length) {
      return null;
    }
    return (
      <div ref={loaderRef} className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }, [visibleCount, sortedItems.length]);

  if (isLoading) {
    return (
      <PageWrapper title="Members">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Members">
      <div className="flex h-full flex-col">
        <Table
          isHeaderSticky
          aria-label="Members table with sorting and infinite scroll"
          bottomContent={bottomContent}
          bottomContentPlacement="inside"
          classNames={{
            base: '-mx-1 -my-1 flex-1 overflow-hidden px-1 py-1',
            wrapper: 'max-h-full overflow-auto',
            td: 'before:bg-transparent',
            tr: 'animate-fade-in-up',
          }}
          selectedKeys={selectedKeys}
          selectionMode="multiple"
          sortDescriptor={sortDescriptor}
          topContent={topContent}
          topContentPlacement="outside"
          onSelectionChange={setSelectedKeys}
          onSortChange={setSortDescriptor}
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn
                key={column.uid}
                align={column.uid === 'actions' ? 'end' : 'start'}
                allowsSorting={column.sortable}
              >
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody emptyContent="No members found" items={visibleItems}>
            {(item) => (
              <TableRow key={item.id}>
                {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
              </TableRow>
            )}
          </TableBody>
        </Table>
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
    </PageWrapper>
  );
}

export default function Members() {
  return (
    <Routes>
      <Route index element={<MembersList />} />
      <Route path=":memberId" element={<MemberDetail />} />
    </Routes>
  );
}
