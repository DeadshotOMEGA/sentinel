import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
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
} from '../components/ui/heroui-polyfills';
import { format } from 'date-fns';
import PageWrapper from '../components/PageWrapper';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '../components/ui/SentinelTable';
import { api } from '../lib/api';
import type { Visitor, CreateVisitorInput, VisitType } from '@shared/types';
import { Badge, SearchBar, ConfirmDialog, EmptyState } from '@sentinel/ui';

const visitTypes: { key: VisitType; label: string }[] = [
  { key: 'contractor', label: 'Contractor/SSC' },
  { key: 'recruitment', label: 'Recruitment' },
  { key: 'event', label: 'Event' },
  { key: 'official', label: 'Official' },
  { key: 'museum', label: 'Museum' },
  { key: 'other', label: 'Other' },
];

export default function Visitors() {
  const [tab, setTab] = useState('current');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [visitorToSignOut, setVisitorToSignOut] = useState<Visitor | null>(null);
  const queryClient = useQueryClient();

  const { data: activeVisitors, isLoading: activeLoading } = useQuery({
    queryKey: ['visitors', 'active'],
    queryFn: async () => {
      const response = await api.get<{ visitors: Visitor[] }>('/visitors/active');
      return response.data.visitors;
    },
    enabled: tab === 'current',
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
      setVisitorToSignOut(null);
    },
  });

  const currentVisitors = activeVisitors ?? [];
  const historyVisitors = allVisitors ?? [];

  const visitors = tab === 'current' ? currentVisitors : historyVisitors;
  const isLoading = tab === 'current' ? activeLoading : allLoading;

  // Filter visitors based on search query
  const filteredVisitors = useMemo(() => {
    if (!search.trim()) return visitors;

    const searchLower = search.toLowerCase();
    return visitors.filter((visitor) =>
      visitor.name.toLowerCase().includes(searchLower) ||
      visitor.organization.toLowerCase().includes(searchLower) ||
      visitor.visitType.toLowerCase().includes(searchLower)
    );
  }, [visitors, search]);

  function handleSignOut() {
    if (visitorToSignOut) {
      checkoutMutation.mutate(visitorToSignOut.id);
    }
  }

  return (
    <PageWrapper title="Visitors">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Tabs
            selectedKey={tab}
            onSelectionChange={(k) => setTab(k as string)}
            aria-label="Visitor view tabs"
          >
            <Tab
              key="current"
              title={
                <div className="flex items-center gap-2">
                  Currently Signed In
                  <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                    {currentVisitors.length}
                  </span>
                </div>
              }
            />
            <Tab
              key="history"
              title={
                <div className="flex items-center gap-2">
                  History
                  <span className="bg-default-300 text-default-700 text-xs px-2 py-0.5 rounded-full">
                    {historyVisitors.length}
                  </span>
                </div>
              }
            />
          </Tabs>
          <Button color="primary" onPress={() => setIsModalOpen(true)}>
            Sign In Visitor
          </Button>
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search visitors..."
          aria-label="Search visitors"
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredVisitors.length === 0 ? (
          search.trim() ? (
            <EmptyState
              variant="no-results"
              heading="No visitors found"
              description="Try adjusting your search"
            />
          ) : tab === 'current' ? (
            <EmptyState
              variant="no-data"
              heading="No visitors currently signed in"
              description="Visitors will appear here when they check in"
            />
          ) : (
            <EmptyState
              variant="no-data"
              heading="No visitor history"
              description="Visitor check-ins and check-outs will appear here"
            />
          )
        ) : (
          <Table aria-label={tab === 'current' ? 'Currently present visitors' : 'Visitor history'}>
            <TableHeader>
              <TableColumn>NAME</TableColumn>
              <TableColumn>ORGANIZATION</TableColumn>
              <TableColumn>TYPE</TableColumn>
              <TableColumn>CHECK IN</TableColumn>
              <TableColumn>CHECK OUT</TableColumn>
              <TableColumn>{tab === 'current' ? 'ACTIONS' : ''}</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No visitors">
              {filteredVisitors.map((visitor) => (
                <TableRow key={visitor.id}>
                  <TableCell>{visitor.name}</TableCell>
                  <TableCell>{visitor.organization}</TableCell>
                  <TableCell>
                    <Badge variant="visitor" size="sm">{visitor.visitType}</Badge>
                  </TableCell>
                  <TableCell>{format(new Date(visitor.checkInTime), 'MMM d, HH:mm')}</TableCell>
                  <TableCell>
                    {visitor.checkOutTime
                      ? format(new Date(visitor.checkOutTime), 'HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {tab === 'current' ? (
                      <Button
                        size="sm"
                        color="default"
                        variant="flat"
                        isDisabled={checkoutMutation.isPending}
                        onPress={() => setVisitorToSignOut(visitor)}
                        aria-label={`Sign out ${visitor.name}`}
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

      <ConfirmDialog
        isOpen={visitorToSignOut !== null}
        onClose={() => setVisitorToSignOut(null)}
        onConfirm={handleSignOut}
        title="Sign Out Visitor"
        message={
          visitorToSignOut
            ? `Sign out ${visitorToSignOut.name} from ${visitorToSignOut.organization}?`
            : ''
        }
        confirmLabel="Sign Out"
        variant="warning"
        isLoading={checkoutMutation.isPending}
      />

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
    visitType: 'contractor',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      await api.post('/visitors', formData);
      onSuccess();
      setFormData({ visitType: 'contractor' });
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
      <ModalContent role="dialog" aria-modal="true" aria-labelledby="visitor-modal-title">
        <ModalHeader id="visitor-modal-title">Sign In Visitor</ModalHeader>
        <ModalBody>
          {error && (
            <div id="visitor-modal-error" className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger" role="alert" aria-live="assertive">{error}</div>
          )}
          <div className="space-y-4" aria-describedby={error ? 'visitor-modal-error' : undefined}>
            <Input
              label="Name"
              value={formData.name ? formData.name : ''}
              onValueChange={(v) => setFormData({ ...formData, name: v })}
              isRequired
              aria-invalid={error ? 'true' : 'false'}
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
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as string;
                if (key) {
                  setFormData({ ...formData, visitType: key as VisitType });
                }
              }}
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
