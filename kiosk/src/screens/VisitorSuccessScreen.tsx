import { useEffect } from 'react';
import { useKioskStore } from '../state/kiosk-state';
import { playSound } from '../lib/audio';
import { getConfig } from '../lib/config';

export default function VisitorSuccessScreen() {
  const { visitorName, reset } = useKioskStore();
  const config = getConfig();

  useEffect(() => {
    // Play success sound
    playSound('success');

    // Auto-return to idle after timeout
    const timeout = setTimeout(() => {
      reset();
    }, config.successDisplayMs);

    return () => clearTimeout(timeout);
  }, [config.successDisplayMs, reset]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-success-50 to-success-100 p-6 overflow-hidden" role="main" aria-live="polite">
      {/* Success Icon - Reduced size */}
      <div className="mb-6">
        <div className="w-28 h-28 bg-success rounded-full flex items-center justify-center" aria-hidden="true">
          <svg
            className="w-18 h-18 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      {/* Success Message */}
      <div className="text-center mb-8">
        <h2 className="text-5xl font-bold text-success-700 mb-4">
          Welcome
        </h2>

        {/* Visitor Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4 max-w-2xl">
          <p className="text-3xl font-bold text-gray-800 mb-3">
            {visitorName}
          </p>
          <p className="text-2xl text-gray-600">
            Visitor Check-In Complete
          </p>
        </div>

        {/* Confirmation Text */}
        <p className="text-2xl text-gray-700">
          Please proceed to the Duty Watch
        </p>
      </div>

      {/* Auto-return notice */}
      <p className="text-lg text-gray-600">
        Returning to main screen...
      </p>
    </div>
  );
}
