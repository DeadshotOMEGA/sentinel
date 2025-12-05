import { useState, useEffect } from 'react';
import { useKioskStore } from '../state/kiosk-state';
import { getConfig } from '../lib/config';
import DevPanel from '../components/DevPanel';
import { Logo } from '@shared/ui';
import { Button } from '@heroui/react';

interface IdleScreenProps {
  onSimulateScan: (serialNumber: string) => void;
}

export default function IdleScreen({ onSimulateScan }: IdleScreenProps) {
  const { enterVisitorMode, setScreen } = useKioskStore();
  const config = getConfig();

  const handleEventSelection = (): void => {
    setScreen('event-selection');
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-100 p-6 relative overflow-hidden" role="main">
      {/* DEV Panel (hidden, activated by 5 corner taps) */}
      <DevPanel onSimulateScan={onSimulateScan} />

      {/* Logo/Header - Reduced spacing */}
      <div className="mb-6 text-center">
        <div className="flex justify-center mb-3">
          <Logo size="xl" />
        </div>
        <h1 className="text-3xl font-semibold text-gray-800">HMCS Chippawa</h1>
        <p className="mt-1 text-xl text-gray-600">Attendance System</p>
      </div>

      {/* Main prompt - Optimized for landscape */}
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-6 rounded-full bg-primary-50 p-10">
          <svg
            className="h-28 w-28 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
            />
          </svg>
        </div>
        <h2 className="text-5xl font-bold text-gray-900">Tap Your Badge</h2>
        <p className="mt-3 text-2xl text-gray-600">Hold your badge near the reader</p>
      </div>

      {/* Action buttons - gap-4 provides 16px spacing between 56px touch targets */}
      <div className="flex gap-4 mb-6">
        {config.visitorModeEnabled && (
          <Button
            size="lg"
            className="kiosk-button-secondary min-h-[56px]"
            onPress={enterVisitorMode}
            aria-label="Sign in as visitor"
          >
            Visitor Sign-In
          </Button>
        )}
        <Button
          size="lg"
          className="kiosk-button-secondary min-h-[56px]"
          onPress={handleEventSelection}
          aria-label="Check in to event"
        >
          Event Check-In
        </Button>
      </div>

      {/* Time display */}
      <div className="absolute bottom-6 text-center" role="timer" aria-live="off">
        <Clock />
      </div>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-gray-500">
      <p className="text-3xl font-mono">
        {time.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="text-lg">
        {time.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}
