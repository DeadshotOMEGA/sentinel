import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Spinner,
  Tabs,
  Tab,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
} from '@heroui/react';
import { format } from 'date-fns';
import { PageWrapper } from '@sentinel/ui';
import { api } from '../lib/api';
import { getVisitTypeChipVariant } from '@sentinel/ui';
import type { Visitor, CreateVisitorInput, VisitType } from '@shared/types';

const visitTypes: { key: VisitType; label: string }[] = [
  { key: 'contractor', label: 'Contractor' },
  { key: 'recruitment', label: 'Recruitment' },
  { key: 'event', label: 'Event' },
  { key: 'official', label: 'Official' },
  { key: 'museum', label: 'Museum' },
  { key: 'other', label: 'Other' },
];

export default function Visitors() {
  const [tab, setTab] = useState('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: activeVisitors, isLoading: activeLoading } = useQuery({
    queryKey: ['visitors', 'active'],
    queryFn: async () => {
      const response = await api.get<{ visitors: Visitor[] }>('/visitors/active');
      return response.data.visitors;
    },
    enabled: tab === 'active',
  });

  const { data: allVisitors, isLoading: allLoading } = useQuery({
    queryKey: ['visitors', 'all'],
    queryFn: async () => {
      const response = await api.get<{ visitors: Visitor[] }>('/visitors');
      return response.data.visitors;
    },
    enabled: tab === 'history',
  });

  const checkoutMutation = useMutation({
    mutationFn: (id: string) => api.put(`/visitors/${id}/checkout`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
  });

  const visitors = tab === 'active' ? activeVisitors : allVisitors;
  const isLoading = tab === 'active' ? activeLoading : allLoading;

  return (
    <PageWrapper title="Visitors">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as string)}>
            <Tab key="active" title="Currently In Building" />
            <Tab key="history" title="History" />
          </Tabs>
          <Button color="primary" onPress={() => setIsModalOpen(true)}>
            Sign In Visitor
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <Table aria-label="Visitors table">
            <TableHeader>
              <TableColumn>NAME</TableColumn>
              <TableColumn>ORGANIZATION</TableColumn>
              <TableColumn>TYPE</TableColumn>
              <TableColumn>CHECK IN</TableColumn>
              <TableColumn>CHECK OUT</TableColumn>
              <TableColumn>{tab === 'active' ? 'ACTIONS' : ''}</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No visitors">
              {(visitors ? visitors : []).map((visitor) => (
                <TableRow key={visitor.id}>
                  <TableCell>{visitor.name}</TableCell>
                  <TableCell>{visitor.organization}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant={getVisitTypeChipVariant()}>{visitor.visitType}</Chip>
                  </TableCell>
                  <TableCell>{format(new Date(visitor.checkInTime), 'MMM d, HH:mm')}</TableCell>
                  <TableCell>
                    {visitor.checkOutTime
                      ? format(new Date(visitor.checkOutTime), 'HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {tab === 'active' ? (
                      <Button
                        size="sm"
                        color="warning"
                        variant="flat"
                        isLoading={checkoutMutation.isPending}
                        onPress={() => checkoutMutation.mutate(visitor.id)}
                      >
                        Sign Out
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <VisitorSignInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['visitors'] });
        }}
      />
    </PageWrapper>
  );
}

function VisitorSignInModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<Partial<CreateVisitorInput>>({
    visitType: 'other',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      await api.post('/visitors', formData);
      onSuccess();
      setFormData({ visitType: 'other' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message = error.response?.data?.error?.message;
      if (!message) {
        throw new Error('Failed to sign in visitor - no error message received');
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Sign In Visitor</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">{error}</div>
          )}
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name ? formData.name : ''}
              onValueChange={(v) => setFormData({ ...formData, name: v })}
              isRequired
            />
            <Input
              label="Organization"
              value={formData.organization ? formData.organization : ''}
              onValueChange={(v) => setFormData({ ...formData, organization: v })}
              isRequired
            />
            <Select
              label="Visit Type"
              selectedKeys={formData.visitType ? [formData.visitType] : []}
              onSelectionChange={(keys) =>
                setFormData({ ...formData, visitType: Array.from(keys)[0] as VisitType })
              }
              isRequired
            >
              {visitTypes.map((t) => (
                <SelectItem key={t.key}>{t.label}</SelectItem>
              ))}
            </Select>
            <Input
              label="Purpose (optional)"
              value={formData.purpose ? formData.purpose : ''}
              onValueChange={(v) => setFormData({ ...formData, purpose: v })}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>Cancel</Button>
          <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
            Sign In
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
