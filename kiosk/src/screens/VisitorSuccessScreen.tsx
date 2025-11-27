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
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-success-50 to-success-100 p-8">
      {/* Success Icon */}
      <div className="mb-8">
        <div className="w-32 h-32 bg-success rounded-full flex items-center justify-center">
          <svg
            className="w-20 h-20 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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
      <div className="text-center mb-12">
        <h2 className="text-6xl font-bold text-success-700 mb-6">
          Welcome
        </h2>

        {/* Visitor Details */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 max-w-2xl">
          <p className="text-4xl font-bold text-gray-800 mb-4">
            {visitorName}
          </p>
          <p className="text-3xl text-gray-600">
            Visitor Check-In Complete
          </p>
        </div>

        {/* Confirmation Text */}
        <p className="text-3xl text-gray-700">
          Please proceed to the Duty Watch
        </p>
      </div>

      {/* Auto-return notice */}
      <p className="text-xl text-gray-600">
        Returning to main screen...
      </p>
    </div>
  );
}
