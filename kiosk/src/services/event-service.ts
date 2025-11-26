import { api } from '../lib/api';

export interface ActiveEvent {
  id: string;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
}

interface ActiveEventsResponse {
  success: boolean;
  data: ActiveEvent[];
}

interface EventCheckinResponse {
  success: boolean;
  data: {
    id: string;
    attendeeId: string;
    eventId: string;
    checkInTime: string;
    attendeeName: string;
  };
}

export async function fetchActiveEvents(): Promise<ActiveEvent[]> {
  const response = await api.get<ActiveEventsResponse>('/events/active');
  return response.data.data;
}

export async function checkInEventAttendee(
  eventId: string,
  serialNumber: string
): Promise<EventCheckinResponse['data']> {
  const response = await api.post<EventCheckinResponse>('/events/checkins', {
    eventId,
    serialNumber,
    timestamp: new Date().toISOString(),
  });
  return response.data.data;
}
