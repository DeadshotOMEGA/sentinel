import { useState, useEffect } from 'react';
import { useKioskStore } from '../state/kiosk-state';
import { fetchActiveEvents } from '../services/event-service';
import type { ActiveEvent } from '../services/event-service';
import { Button } from '@heroui/react';

export default function EventSelectionScreen() {
  const { reset, selectEvent, setError } = useKioskStore();
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async (): Promise<void> => {
      try {
        setLoading(true);
        const activeEvents = await fetchActiveEvents();
        setEvents(activeEvents);
        if (activeEvents.length === 0) {
          setLocalError('No active events available');
        }
      } catch (err) {
        if (err instanceof Error) {
          setLocalError(err.message);
        } else {
          setLocalError('Failed to load events');
        }
        setError({
          message: 'Failed to load events',
          howToFix: 'Please ensure the system is online and try again.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [setError]);

  const handleEventSelect = (eventId: string): void => {
    selectEvent(eventId);
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-6 overflow-hidden" role="main" aria-live="polite" aria-busy="true">
        <div className="text-center">
          <div className="text-3xl font-bold mb-3 text-gray-900">
            Loading Events
          </div>
          <div className="text-xl text-gray-600">
            Please wait...
          </div>
        </div>
      </div>
    );
  }

  if (error || events.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-6 overflow-hidden" role="main">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold mb-3 text-gray-900">
            No Events Available
          </div>
          <div className="text-xl text-gray-600">
            {error || 'There are no active events at this time.'}
          </div>
        </div>
        <Button
          size="lg"
          className="kiosk-button-secondary min-h-[56px]"
          onPress={reset}
          aria-label="Return to home screen"
        >
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-gray-50 to-gray-100 p-6 overflow-hidden" role="main">
      {/* Header - Reduced size */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-primary-700 mb-1">
          Select an Event
        </h1>
        <p className="text-xl text-gray-600">
          Choose which event you are attending
        </p>
      </div>

      {/* Events Grid - Scrollable area with max height */}
      <div className="flex-1 overflow-y-auto min-h-0" role="region" aria-label="Available events">
        <div className="grid grid-cols-1 gap-3 max-w-4xl mx-auto pb-4">
          {events.map((event) => (
            <Button
              key={event.id}
              size="lg"
              onPress={() => handleEventSelect(event.id)}
              className="kiosk-button-primary text-left p-6 h-auto min-h-[56px]"
              aria-label={`Check in to ${event.name}, ${new Date(event.startTime).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })} to ${new Date(event.endTime).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}`}
            >
              <div className="text-2xl font-bold mb-1">
                {event.name}
              </div>
              {event.description && (
                <div className="text-lg text-white/90 mb-2">
                  {event.description}
                </div>
              )}
              <div className="text-base text-white/80">
                {new Date(event.startTime).toLocaleTimeString('en-CA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })} - {new Date(event.endTime).toLocaleTimeString('en-CA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Cancel Button */}
      <div className="mt-4 flex justify-center">
        <Button
          size="lg"
          className="kiosk-button-secondary min-h-[56px]"
          onPress={reset}
          aria-label="Cancel event selection and return to home"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
