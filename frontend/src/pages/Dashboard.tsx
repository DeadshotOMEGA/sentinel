import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@heroui/react';
import FilterBar from '../components/dashboard/FilterBar';
import PersonCardGrid from '../components/dashboard/PersonCardGrid';
import CollapsibleActivityPanel from '../components/dashboard/CollapsibleActivityPanel';
import PersonDetailModal from '../components/dashboard/PersonDetailModal';
import BulkActionBar from '../components/dashboard/BulkActionBar';
import ManualMemberCheckinModal from '../components/dashboard/ManualMemberCheckinModal';
import ManualVisitorCheckinModal from '../components/dashboard/ManualVisitorCheckinModal';
import AlertBanner from '../components/dashboard/AlertBanner';
import DdsPanel from '../components/dashboard/DdsPanel';
import StaleCheckinsWidget from '../components/dashboard/StaleCheckinsWidget';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { useSecurityAlerts } from '../hooks/useSecurityAlerts';
import type { ActivityItem, PresentPerson, DashboardFilters, CreateAlertInput } from '../../../shared/types';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { onPresenceUpdate, onCheckin, onActivityBackfill, onVisitorSignin } = useSocket();
  const { alerts: securityAlerts, acknowledgeAlert } = useSecurityAlerts();
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  // State management
  const [filters, setFilters] = useState<DashboardFilters>({
    typeFilter: 'all',
    directionFilter: 'all',
    searchQuery: ''
  });
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activityCollapsed, setActivityCollapsed] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PresentPerson | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [memberCheckinModalOpen, setMemberCheckinModalOpen] = useState(false);
  const [visitorCheckinModalOpen, setVisitorCheckinModalOpen] = useState(false);

  // Fetch present people
  const { data: presentPeople, isLoading } = useQuery({
    queryKey: ['present-people'],
    queryFn: async () => {
      const response = await api.get<{ presentPeople: PresentPerson[] }>(
        '/checkins/presence/all'
      );
      // Convert checkInTime strings to Date objects
      return response.data.presentPeople.map(person => ({
        ...person,
        checkInTime: new Date(person.checkInTime)
      }));
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate member and visitor counts
  const { memberCount, visitorCount } = useMemo(() => {
    if (!presentPeople) return { memberCount: 0, visitorCount: 0 };
    return {
      memberCount: presentPeople.filter(p => p.type === 'member').length,
      visitorCount: presentPeople.filter(p => p.type === 'visitor').length
    };
  }, [presentPeople]);

  // Filter people based on current filters (for select all)
  const filteredPeople = useMemo(() => {
    if (!presentPeople) return [];
    return presentPeople.filter(person => {
      if (filters.typeFilter === 'members' && person.type !== 'member') return false;
      if (filters.typeFilter === 'visitors' && person.type !== 'visitor') return false;
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const nameMatch = person.name.toLowerCase().includes(query);
        const divMatch = person.division?.toLowerCase().includes(query);
        const orgMatch = person.organization?.toLowerCase().includes(query);
        if (!nameMatch && !divMatch && !orgMatch) return false;
      }
      return true;
    });
  }, [presentPeople, filters]);

  // Get selected people objects
  const selectedPeople = useMemo(() => {
    if (!presentPeople) return [];
    return presentPeople.filter(p => selectedIds.has(p.id));
  }, [presentPeople, selectedIds]);

  // WebSocket subscriptions
  useEffect(() => {
    const unsubPresence = onPresenceUpdate(() => {
      // Invalidate present-people query when presence updates
      queryClient.invalidateQueries({ queryKey: ['present-people'] });
    });

    const unsubActivityBackfill = onActivityBackfill((data) => {
      setActivity(data.activity);
    });

    const unsubCheckin = onCheckin((data) => {
      // Add to activity feed
      setActivity((prev) => {
        const newItem: ActivityItem = {
          type: 'checkin',
          id: crypto.randomUUID(),
          timestamp: data.timestamp,
          direction: data.direction,
          name: data.memberName,
          rank: data.rank,
          division: data.division,
          kioskId: data.kioskId,
          kioskName: data.kioskName,
        };
        return [newItem, ...prev.slice(0, 99)];
      });
      // Invalidate present-people query
      queryClient.invalidateQueries({ queryKey: ['present-people'] });
    });

    const unsubVisitorSignin = onVisitorSignin((data) => {
      // Add to activity feed
      setActivity((prev) => {
        const newItem: ActivityItem = {
          type: 'visitor',
          id: crypto.randomUUID(),
          timestamp: data.checkInTime,
          direction: 'in',
          name: data.name,
          organization: data.organization,
          visitType: data.visitType,
          visitReason: data.visitReason ?? undefined,
          hostName: data.hostName ?? undefined,
          eventId: data.eventId ?? undefined,
          eventName: data.eventName ?? undefined,
          kioskId: data.kioskId,
          kioskName: data.kioskName,
        };
        return [newItem, ...prev.slice(0, 99)];
      });
      // Invalidate present-people query
      queryClient.invalidateQueries({ queryKey: ['present-people'] });
    });

    return () => {
      unsubPresence();
      unsubActivityBackfill();
      unsubCheckin();
      unsubVisitorSignin();
    };
  }, [onPresenceUpdate, onCheckin, onActivityBackfill, onVisitorSignin, queryClient]);

  // Person press handler - opens modal
  const handlePersonPress = (person: PresentPerson) => {
    setSelectedPerson(person);
    setModalOpen(true);
  };

  // Close modal handler
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedPerson(null);
  };

  // Checkout handler
  const handleCheckout = async (personId: string, type: 'member' | 'visitor') => {
    if (type === 'member') {
      await api.put(`/checkins/members/${personId}/checkout`);
    } else {
      await api.put(`/visitors/${personId}/checkout`);
    }
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['present-people'] });
    handleCloseModal();
  };

  // Update visitor handler
  const handleUpdateVisitor = async (
    personId: string,
    data: { eventId?: string; hostMemberId?: string; purpose?: string }
  ) => {
    await api.put(`/visitors/${personId}`, data);
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['present-people'] });
  };

  // Create alert handler
  const handleCreateAlert = async (data: CreateAlertInput) => {
    await api.post('/alerts', data);
    queryClient.invalidateQueries({ queryKey: ['present-people'] });
  };

  // Dismiss alert handler
  const handleDismissAlert = async (alertId: string) => {
    await api.put(`/alerts/${alertId}/dismiss`);
    queryClient.invalidateQueries({ queryKey: ['present-people'] });
  };

  // Select all filtered people
  const handleSelectAll = () => {
    const allIds = new Set(filteredPeople.map(p => p.id));
    setSelectedIds(allIds);
  };

  // Select all members
  const handleSelectAllMembers = () => {
    const memberIds = new Set(filteredPeople.filter(p => p.type === 'member').map(p => p.id));
    setSelectedIds(memberIds);
  };

  // Select all visitors
  const handleSelectAllVisitors = () => {
    const visitorIds = new Set(filteredPeople.filter(p => p.type === 'visitor').map(p => p.id));
    setSelectedIds(visitorIds);
  };

  // Clear selection
  const handleSelectNone = () => {
    setSelectedIds(new Set());
  };

  // Count members and visitors in filtered list
  const filteredMemberCount = filteredPeople.filter(p => p.type === 'member').length;
  const filteredVisitorCount = filteredPeople.filter(p => p.type === 'visitor').length;

  // Bulk checkout handler
  const handleBulkCheckout = async () => {
    setBulkLoading(true);
    try {
      const memberIds = selectedPeople.filter(p => p.type === 'member').map(p => p.id);
      const visitorIds = selectedPeople.filter(p => p.type === 'visitor').map(p => p.id);

      await api.post('/checkins/bulk-checkout', { memberIds, visitorIds });

      // Clear selection and refresh data
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['present-people'] });
    } finally {
      setBulkLoading(false);
    }
  };

  // Export selected to CSV
  const handleExportCSV = () => {
    if (selectedPeople.length === 0) return;

    const headers = ['Name', 'Type', 'Division/Organization', 'Check-In Time', 'Kiosk'];
    const rows = selectedPeople.map(person => [
      person.name,
      person.type,
      person.type === 'member' ? (person.division ?? '') : (person.organization ?? ''),
      person.checkInTime.toISOString(),
      person.kioskName ?? ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `present-people-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!presentPeople) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-default-500">Failed to load presence data. Is the backend running?</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen p-6">
      {/* Security Alert Banner - always at the top */}
      {securityAlerts.length > 0 && (
        <div className="mb-4">
          <AlertBanner alerts={securityAlerts} onAcknowledge={acknowledgeAlert} />
        </div>
      )}

      {/* DDS Panel - prominent position below security alerts */}
      <DdsPanel presentPeople={presentPeople} />

      {/* Stale Check-ins Widget - shows members checked in too long */}
      <StaleCheckinsWidget />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        selectMode={selectMode}
        onSelectModeChange={setSelectMode}
        selectedCount={selectedIds.size}
        memberCount={memberCount}
        visitorCount={visitorCount}
        onOpenMemberCheckin={() => setMemberCheckinModalOpen(true)}
        onOpenVisitorCheckin={() => setVisitorCheckinModalOpen(true)}
      />

      {/* Bulk Action Bar - shows when select mode enabled */}
      {selectMode && (
        <BulkActionBar
          selectedPeople={selectedPeople}
          onSelectAll={handleSelectAll}
          onSelectNone={handleSelectNone}
          onSelectAllMembers={handleSelectAllMembers}
          onSelectAllVisitors={handleSelectAllVisitors}
          onBulkCheckout={handleBulkCheckout}
          onExportCSV={handleExportCSV}
          totalCount={filteredPeople.length}
          memberCount={filteredMemberCount}
          visitorCount={filteredVisitorCount}
          isLoading={bulkLoading}
        />
      )}

      {/* Main Content: Person Grid + Activity Panel */}
      <div className="-mx-1 -my-1 flex gap-4 mt-4 flex-1 overflow-hidden px-1 py-1">
        {/* Person Card Grid - scrollable */}
        <div className="-mx-1 -my-1 flex-1 overflow-y-auto px-8 py-8">
          <PersonCardGrid
            people={presentPeople}
            filters={filters}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onPersonPress={handlePersonPress}
          />
        </div>

        {/* Collapsible Activity Panel - fixed width */}
        <CollapsibleActivityPanel
          activity={activity}
          filters={filters}
          isCollapsed={activityCollapsed}
          onCollapseChange={setActivityCollapsed}
          onDirectionFilterChange={(directionFilter) => setFilters({ ...filters, directionFilter })}
        />
      </div>

      {/* Person Detail Modal */}
      <PersonDetailModal
        person={selectedPerson}
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onCheckout={handleCheckout}
        onUpdate={handleUpdateVisitor}
        onCreateAlert={handleCreateAlert}
        onDismissAlert={handleDismissAlert}
      />

      {/* Manual Member Check-in Modal */}
      <ManualMemberCheckinModal
        isOpen={memberCheckinModalOpen}
        onClose={() => setMemberCheckinModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['present-people'] });
        }}
      />

      {/* Manual Visitor Check-in Modal */}
      <ManualVisitorCheckinModal
        isOpen={visitorCheckinModalOpen}
        onClose={() => setVisitorCheckinModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['present-people'] });
        }}
      />
    </div>
  );
}
