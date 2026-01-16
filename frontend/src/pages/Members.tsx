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
  Link,
} from '@heroui/react';
import { SearchIcon } from '@heroui/shared-icons';
import { Icon } from '@iconify/react';
import { PageWrapper, TagChip, BadgeChip } from '@sentinel/ui';
import MemberModal from '../components/MemberModal';
import ImportModal from '../components/ImportModal';
import MemberDetail from './MemberDetail';
import MembersFilterPopover from '../components/members/MembersFilterPopover';
import BulkEditModal from '../components/members/BulkEditModal';
import MemberQuickView from '../components/members/MemberQuickView';
import { useMemberFilters } from '../hooks/useMemberFilters';
import { api } from '../lib/api';
import { getMemberStatusChipVariant } from '@sentinel/ui';
import type { MemberWithDivision, Division, Tag } from '@shared/types';

type ColumnKey =
  | 'name'
  | 'rank'
  | 'division'
  | 'status'
  | 'badge'
  | 'classDetails'
  | 'tags'
  | 'actions';

interface Column {
  uid: ColumnKey;
  name: string;
  sortable?: boolean;
}

const columns: Column[] = [
  { uid: 'name', name: 'NAME', sortable: true },
  { uid: 'rank', name: 'RANK', sortable: true },
  { uid: 'division', name: 'DIVISION', sortable: true },
  { uid: 'status', name: 'STATUS', sortable: true },
  { uid: 'badge', name: 'BADGE', sortable: false },
  { uid: 'classDetails', name: 'CONTRACT', sortable: true },
  { uid: 'tags', name: 'TAGS', sortable: false },
  { uid: 'actions', name: 'ACTIONS', sortable: false },
];

const ITEMS_PER_BATCH = 20;

function formatMemberType(memberType: string): string {
  const typeMap: Record<string, string> = {
    class_a: 'Class A',
    class_b: 'Class B',
    class_c: 'Class C',
    reg_force: 'Reg Force',
  };
  return typeMap[memberType] || memberType;
}

function MembersList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithDivision | null>(null);
  const [selectedQuickViewMember, setSelectedQuickViewMember] = useState<MemberWithDivision | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_BATCH);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'name',
    direction: 'ascending',
  });

  const loaderRef = useRef<HTMLDivElement>(null);

  // Use member filters hook for URL-synced filter state
  const {
    filters,
    setMessFilter,
    setMocFilter,
    setDivisionFilter,
    setContractFilter,
    setTagsFilter,
    setExcludeTagsFilter,
    clearFilters,
    buildApiParams,
  } = useMemberFilters();

  const { data: membersData, isLoading, refetch } = useQuery({
    queryKey: ['members', filters],
    queryFn: async () => {
      const params = buildApiParams();
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

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get<{ tags: Tag[] }>('/tags');
      return response.data;
    },
  });

  const members = membersData?.members ?? [];
  const divisions = divisionsData?.divisions ?? [];
  const tags = tagsData?.tags ?? [];

  // Client-side search filtering only (server-side handles other filters)
  const filteredItems = useMemo(() => {
    let filtered = [...members];

    if (search) {
      filtered = filtered.filter((member) =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        member.rank.toLowerCase().includes(search.toLowerCase()) ||
        member.division.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [members, search]);

  // Client-side sorting
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a: MemberWithDivision, b: MemberWithDivision) => {
      const column = sortDescriptor.column as ColumnKey;
      let first: string | number = '';
      let second: string | number = '';

      switch (column) {
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
        case 'status':
          first = a.status;
          second = b.status;
          break;
        case 'classDetails':
          first = a.classDetails ?? '';
          second = b.classDetails ?? '';
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
  }, [search, filters, sortDescriptor]);

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
      case 'name':
        return (
          <Link
            size="sm"
            color="primary"
            as="button"
            onPress={() => {
              setSelectedQuickViewMember(member);
              setIsQuickViewOpen(true);
            }}
          >
            {member.firstName} {member.lastName}
          </Link>
        );
      case 'rank':
        return <div className="text-small">{member.rank}</div>;
      case 'division':
        return <div className="text-small">{member.division.name}</div>;
      case 'status':
        const statusColorMap: Record<string, 'success' | 'default' | 'warning' | 'danger'> = {
          active: 'success',
          inactive: 'default',
          pending_review: 'warning',
          terminated: 'danger',
        };
        return (
          <Chip
            size="sm"
            variant={getMemberStatusChipVariant()}
            color={statusColorMap[member.status] ?? 'default'}
          >
            {member.status.replace('_', ' ')}
          </Chip>
        );
      case 'badge':
        return <BadgeChip badge={member.badge} />;
      case 'classDetails':
        return (
          <div className="text-small">
            {member.classDetails || formatMemberType(member.memberType)}
          </div>
        );
      case 'tags':
        return (
          <div className="flex flex-wrap gap-1">
            {member.tags && member.tags.length > 0 ? (
              member.tags.map((tag) => (
                <TagChip key={tag.id} tagName={tag.name} />
              ))
            ) : (
              <span className="text-small text-default-400">—</span>
            )}
          </div>
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
          <MembersFilterPopover
            filters={filters}
            divisions={divisions}
            tags={tags}
            onMessChange={setMessFilter}
            onMocChange={setMocFilter}
            onDivisionChange={setDivisionFilter}
            onContractChange={setContractFilter}
            onTagsChange={setTagsFilter}
            onExcludeTagsChange={setExcludeTagsFilter}
            onClearFilters={clearFilters}
          />
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
          <div className="flex items-center gap-3">
            {selectedKeys !== 'all' && selectedKeys.size >= 2 && (
              <Button
                color="primary"
                variant="flat"
                onPress={() => setIsBulkEditModalOpen(true)}
                startContent={<Icon icon="lucide:edit" />}
              >
                Edit Selected
              </Button>
            )}
            <span className="text-small text-default-400">
              {selectedKeys === 'all'
                ? 'All items selected'
                : `${selectedKeys.size} of ${filteredItems.length} selected`}
            </span>
          </div>
        </div>
      </div>
    );
  }, [
    search,
    filters,
    divisions,
    tags,
    filteredItems.length,
    visibleItems.length,
    selectedKeys,
    onSearchChange,
    setMessFilter,
    setMocFilter,
    setDivisionFilter,
    setContractFilter,
    setTagsFilter,
    setExcludeTagsFilter,
    clearFilters,
    handleAdd,
  ]);

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
                className={column.uid === 'tags' ? 'min-w-[240px]' : undefined}
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
        tags={tags}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => refetch()}
      />

      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        onSave={() => {
          setIsBulkEditModalOpen(false);
          setSelectedKeys(new Set([]));
          refetch();
        }}
        selectedMemberIds={selectedKeys === 'all' ? [] : Array.from(selectedKeys as Set<string>)}
        divisions={divisions}
        tags={tags}
      />

      {selectedQuickViewMember && (
        <MemberQuickView
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          initialMember={selectedQuickViewMember}
          divisions={divisions}
          tags={tags}
        />
      )}
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
