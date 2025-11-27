import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Chip,
  Spinner,
  Input,
  Select,
  SelectItem,
} from '../components/ui/heroui-polyfills';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '../components/ui/SentinelTable';
import PageWrapper from '../components/PageWrapper';
import MemberModal from '../components/MemberModal';
import ImportModal from '../components/ImportModal';
import { api } from '../lib/api';
import type { MemberWithDivision, Division } from '@shared/types';

function MembersList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithDivision | null>(null);

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
          />
          <Select
            selectedKeys={statusFilter ? [statusFilter] : []}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              setStatusFilter(key as string);
            }}
            className="max-w-[150px]"
            label="Status"
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <Table aria-label="Members table">
            <TableHeader>
              <TableColumn>SERVICE #</TableColumn>
              <TableColumn>NAME</TableColumn>
              <TableColumn>RANK</TableColumn>
              <TableColumn>DIVISION</TableColumn>
              <TableColumn>MESS</TableColumn>
              <TableColumn>TYPE</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No members found">
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.serviceNumber}</TableCell>
                  <TableCell>{member.firstName} {member.lastName}</TableCell>
                  <TableCell>{member.rank}</TableCell>
                  <TableCell>{member.division.name}</TableCell>
                  <TableCell>{member.mess ?? '—'}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      color={member.status === 'active' ? 'success' : 'default'}
                    >
                      {member.status}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="light" onPress={() => handleEdit(member)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    </PageWrapper>
  );
}

export default function Members() {
  return <MembersList />;
}
