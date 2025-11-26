import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  Select,
  SelectItem,
} from '@heroui/react';
import PageWrapper from '../components/PageWrapper';
import MemberModal from '../components/MemberModal';
import { api } from '../lib/api';
import type { MemberWithDivision, Division } from '@shared/types';

function MembersList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const members = membersData?.members;
  const divisions = divisionsData?.divisions;

  if (!members || !divisions) {
    throw new Error('Failed to load data');
  }

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
            onValueChange={setSearch}
            className="max-w-xs"
            isClearable
          />
          <Select
            label="Status"
            selectedKeys={[statusFilter]}
            onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string)}
            className="max-w-[150px]"
          >
            <SelectItem key="active">Active</SelectItem>
            <SelectItem key="inactive">Inactive</SelectItem>
            <SelectItem key="">All</SelectItem>
          </Select>
          <div className="flex-1" />
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
                  <TableCell>
                    <Chip size="sm" variant="flat">
                      {member.memberType === 'full-time' ? 'Full-Time' : 'Reserve'}
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
    </PageWrapper>
  );
}

export default function Members() {
  return (
    <Routes>
      <Route index element={<MembersList />} />
    </Routes>
  );
}
