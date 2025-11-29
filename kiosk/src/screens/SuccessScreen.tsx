import { useEffect } from 'react';
import { useKioskStore } from '../state/kiosk-state';
import { playSound } from '../lib/audio';
import { getConfig } from '../lib/config';

export default function SuccessScreen() {
  const { checkinResult, reset } = useKioskStore();
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

  if (!checkinResult) {
    return null;
  }

  const isCheckingIn = checkinResult.direction === 'in';

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-success-50 to-success-100 p-6 overflow-hidden">
      {/* Success Icon - Reduced size */}
      <div className="mb-6">
        <div className="w-28 h-28 bg-success rounded-full flex items-center justify-center">
          <svg
            className="w-18 h-18 text-white"
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
      <div className="text-center mb-8">
        <h2 className="text-5xl font-bold text-success-700 mb-4">
          {isCheckingIn ? 'Signed In' : 'Signed Out'}
        </h2>

        {/* Member Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4 max-w-2xl">
          <p className="text-3xl font-bold text-gray-800 mb-3">
            {checkinResult.rank} {checkinResult.memberName}
          </p>
          <p className="text-2xl text-gray-600 mb-3">
            {checkinResult.division}
          </p>
          <p className="text-xl text-gray-500">
            {new Date(checkinResult.timestamp).toLocaleTimeString('en-CA', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Confirmation Text */}
        <p className="text-2xl text-gray-700">
          {isCheckingIn
            ? 'Welcome aboard!'
            : 'Fair winds and following seas!'}
        </p>
      </div>

      {/* Auto-return notice */}
      <p className="text-lg text-gray-600">
        Returning to main screen...
      </p>
    </div>
  );
}
