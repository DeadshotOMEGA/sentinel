import { useEventPresenceData } from '../hooks/useEventPresenceData';
import { EventPresenceCards } from '../components/EventPresenceCards';
import { Clock } from '../components/Clock';
import { ActivityFeed } from '../components/ActivityFeed';
import { ConnectionStatus } from '../components/ConnectionStatus';
import type { TVConfig } from '../lib/config';
import { Logo } from '@shared/ui';

interface EventViewProps {
  config: TVConfig;
  eventName: string;
}

export function EventView({ config, eventName }: EventViewProps) {
  const { data, isConnected } = useEventPresenceData({ config });

  const connectionStatus = isConnected ? 'bg-emerald-500' : 'bg-red-500';
  const connectionText = isConnected ? 'Connected' : 'Disconnected';

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 tv-mode">
      <div className="flex h-screen">
        {/* Main content - 70% */}
        <div className="flex-1 p-8 overflow-hidden flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="mb-4">
                <Logo size="lg" />
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mb-2">
                {eventName}
              </h1>
              <p className="text-xl text-gray-600">
                Event Attendance Overview
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${connectionStatus}`} />
                <span className="text-lg text-gray-700">
                  {connectionText}
                </span>
              </div>
            </div>

            <Clock />
          </div>

          <div className="mb-8">
            <EventPresenceCards
              present={data.present}
              away={data.away}
              pending={data.pending}
            />
          </div>

          <div className="flex-1 overflow-hidden">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Attendees
            </h2>
            <div className="overflow-y-auto space-y-3 pr-4">
              {data.attendees.length === 0 ? (
                <p className="text-2xl text-gray-400">
                  No attendees yet...
                </p>
              ) : (
                data.attendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      attendee.checkedIn
                        ? 'bg-emerald-50 border-emerald-500'
                        : 'bg-gray-50 border-gray-400'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {attendee.rank ? `${attendee.rank} ` : ''}
                          {attendee.name}
                        </div>
                        {attendee.division && (
                          <div className="text-lg text-gray-600 mt-1">
                            {attendee.division}
                          </div>
                        )}
                      </div>
                      {attendee.checkedIn && attendee.checkInTime && (
                        <div className="text-lg text-gray-600 font-mono">
                          {new Date(attendee.checkInTime).toLocaleTimeString(
                            'en-CA',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Activity Feed - 30% */}
        {config.activityFeedEnabled && (
          <div className="w-[30%] border-l border-gray-200 bg-gray-50">
            <ActivityFeed config={config} />
          </div>
        )}
      </div>

      <ConnectionStatus isConnected={isConnected} />
    </div>
  );
}
