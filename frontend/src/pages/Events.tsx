import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Spinner,
  Card,
  CardBody,
} from '../components/ui/heroui-polyfills';
import { format } from 'date-fns';
import PageWrapper from '../components/PageWrapper';
import EventModal from '../components/EventModal';
import { api } from '../lib/api';
import type { Event, EventStatus } from '@shared/types';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '../components/ui/SentinelTable';
import { Badge, type BadgeVariant, SearchBar, EmptyState } from '@sentinel/ui';

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
      <CardBody className="text-center" role="region" aria-label={`${label}: ${value}`}>
        <span className="sr-only">{label}: </span>
        <p className={`text-4xl font-bold ${color}`} aria-hidden="true">{value}</p>
        <p className="text-sm text-gray-600" aria-hidden="true">{label}</p>
      </CardBody>
    </Card>
  );
}

const TAB_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
] as const;

export default function Events() {
  const [tab, setTab] = useState<string>('all');
  const [search, setSearch] = useState('');
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

  // Filter events by search query
  const filteredEvents = events?.filter((event) =>
    event.name.toLowerCase().includes(search.toLowerCase()) ||
    event.code.toLowerCase().includes(search.toLowerCase())
  );

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

  const getStatusVariant = (status: EventStatus): BadgeVariant => {
    switch (status) {
      case 'draft':
        return 'draft';
      case 'active':
        return 'success';
      case 'completed':
        return 'neutral';
      case 'cancelled':
        return 'error';
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2" role="group" aria-label="Filter events by status">
              {TAB_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  color={tab === option.id ? 'primary' : 'default'}
                  variant={tab === option.id ? 'solid' : 'light'}
                  onPress={() => setTab(option.id)}
                  aria-pressed={tab === option.id}
                  aria-label={`Show ${option.label.toLowerCase()} events`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Button color="primary" onPress={handleAdd}>
              Create Event
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search events by name or code..."
              aria-label="Search events"
              className="flex-1 max-w-md"
            />
            {events && filteredEvents && (
              <p className="text-sm text-gray-600">
                Showing {filteredEvents.length} of {events.length} events
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredEvents && filteredEvents.length === 0 ? (
          <EmptyState
            variant={search ? 'no-results' : 'no-data'}
            heading={search ? 'No events found' : 'No events yet'}
            description={
              search
                ? 'Try adjusting your search or create a new event'
                : 'Create your first event to get started'
            }
            action={{ label: 'Create Event', onClick: handleAdd }}
          />
        ) : (
          <Table aria-label="Events list">
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
              {(filteredEvents ? filteredEvents : []).map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.name}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{event.code}</span>
                  </TableCell>
                  <TableCell>{format(new Date(event.startDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{format(new Date(event.endDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(event.status)} size="sm">
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">-</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => handleViewDetails(event.id)}
                        aria-label={`View details for ${event.name}`}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => handleEdit(event)}
                        aria-label={`Edit ${event.name}`}
                      >
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
