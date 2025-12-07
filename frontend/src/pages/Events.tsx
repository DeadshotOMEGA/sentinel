import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  Card,
  CardBody,
} from '@heroui/react';
import { format } from 'date-fns';
import PageWrapper from '../components/PageWrapper';
import EventModal from '../components/EventModal';
import { api } from '../lib/api';
import type { Event, EventStatus } from '@shared/types';

interface EventsResponse {
  events: Event[];
}

interface StatsResponse {
  activeCount: number;
  totalAttendeesToday: number;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="flex-1">
      <CardBody className="text-center">
        <p className={`text-4xl font-bold ${color}`}>{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </CardBody>
    </Card>
  );
}

export default function Events() {
  const [tab, setTab] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const navigate = useNavigate();

  const { data: eventsData, isLoading, refetch } = useQuery({
    queryKey: ['events', tab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab !== 'all') {
        params.set('status', tab);
      }
      const response = await api.get<EventsResponse>(`/events?${params}`);
      return response.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['events-stats'],
    queryFn: async () => {
      const response = await api.get<StatsResponse>('/events/stats');
      return response.data;
    },
  });

  const events = eventsData?.events;
  const stats = statsData;

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleSave = () => {
    refetch();
    handleClose();
  };

  const handleViewDetails = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  const getStatusColor = (status: EventStatus): 'default' | 'success' | 'primary' | 'danger' => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'active':
        return 'success';
      case 'completed':
        return 'primary';
      case 'cancelled':
        return 'danger';
    }
  };

  return (
    <PageWrapper title="Events">
      <div className="space-y-4">
        {stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
            <StatCard label="Active Events" value={stats.activeCount} color="text-success" />
            <StatCard label="Total Attendees Today" value={stats.totalAttendeesToday} color="text-primary" />
          </div>
        )}

        <div className="flex items-center justify-between">
          <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as string)}>
            <Tab key="all" title="All" />
            <Tab key="active" title="Active" />
            <Tab key="upcoming" title="Upcoming" />
            <Tab key="completed" title="Completed" />
          </Tabs>
          <Button color="primary" onPress={handleAdd}>
            Create Event
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <Table aria-label="Events table">
            <TableHeader>
              <TableColumn>NAME</TableColumn>
              <TableColumn>CODE</TableColumn>
              <TableColumn>START DATE</TableColumn>
              <TableColumn>END DATE</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>ATTENDEES</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No events found">
              {(events ? events : []).map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.name}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{event.code}</span>
                  </TableCell>
                  <TableCell>{format(new Date(event.startDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{format(new Date(event.endDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Chip size="sm" color={getStatusColor(event.status)}>
                      {event.status}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">-</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {event.status === 'active' && (
                        <Button
                          size="sm"
                          color="success"
                          variant="flat"
                          onPress={() => navigate(`/events/${event.id}/monitor`)}
                        >
                          Monitor
                        </Button>
                      )}
                      <Button size="sm" variant="light" onPress={() => handleViewDetails(event.id)}>
                        View
                      </Button>
                      <Button size="sm" variant="light" onPress={() => handleEdit(event)}>
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <EventModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSave={handleSave}
        event={selectedEvent}
      />
    </PageWrapper>
  );
}
