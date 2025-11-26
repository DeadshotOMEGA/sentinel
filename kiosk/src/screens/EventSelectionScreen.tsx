import { useState, useEffect } from 'react';
import { useKioskStore } from '../state/kiosk-state';
import { fetchActiveEvents } from '../services/event-service';
import type { ActiveEvent } from '../services/event-service';

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
      <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-8">
        <div className="text-center">
          <div className="text-4xl font-bold mb-4 text-gray-900">
            Loading Events
          </div>
          <div className="text-2xl text-gray-600">
            Please wait...
          </div>
        </div>
      </div>
    );
  }

  if (error || events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="text-4xl font-bold mb-4 text-gray-900">
            No Events Available
          </div>
          <div className="text-2xl text-gray-600">
            {error || 'There are no active events at this time.'}
          </div>
        </div>
        <button
          className="kiosk-button-secondary"
          onClick={reset}
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-primary-700 mb-2">
          Select an Event
        </h1>
        <p className="text-2xl text-gray-600">
          Choose which event you are attending
        </p>
      </div>

      {/* Events Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => handleEventSelect(event.id)}
              className="kiosk-button-primary text-left p-8 h-auto min-h-32"
            >
              <div className="text-3xl font-bold mb-2">
                {event.name}
              </div>
              {event.description && (
                <div className="text-xl text-gray-600 mb-3">
                  {event.description}
                </div>
              )}
              <div className="text-lg text-gray-500">
                {new Date(event.startTime).toLocaleTimeString('en-CA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })} - {new Date(event.endTime).toLocaleTimeString('en-CA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cancel Button */}
      <div className="mt-8 flex justify-center">
        <button
          className="kiosk-button-secondary"
          onClick={reset}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
