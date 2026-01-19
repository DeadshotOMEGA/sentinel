import { useEffect } from 'react';
import { useKioskStore } from '../state/kiosk-state';
import { playSound } from '../lib/audio';
import { getConfig } from '../lib/config';

export default function WarningScreen() {
  const { warningResult, reset } = useKioskStore();
  const config = getConfig();

  useEffect(() => {
    // Play success sound - the check-in succeeded, this is just a warning
    playSound('success');

    // Auto-return to idle after timeout
    const timeout = setTimeout(() => {
      reset();
    }, config.successDisplayMs);

    return () => clearTimeout(timeout);
  }, [config.successDisplayMs, reset]);

  if (!warningResult) {
    return null;
  }

  const isCheckingIn = warningResult.direction === 'in';

  return (
    <div
      className="flex flex-col items-center justify-center h-screen p-6 overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #fef3c7, #fde68a)' }}
      role="main"
      aria-live="polite"
    >
      {/* Warning Icon */}
      <div className="mb-6">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#f59e0b' }}
          aria-hidden="true"
        >
          {/* Exclamation triangle icon */}
          <svg
            className="w-16 h-16 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      </div>

      {/* Warning Message */}
      <div className="text-center mb-8">
        <h2 className="text-5xl font-bold mb-4" style={{ color: '#b45309' }}>
          {isCheckingIn ? 'Signed In' : 'Signed Out'}
        </h2>

        {/* Member Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4 max-w-2xl">
          <p className="text-3xl font-bold text-gray-800 mb-3">
            {warningResult.rank} {warningResult.memberName}
          </p>
          <p className="text-2xl text-gray-600 mb-3">
            {warningResult.division}
          </p>
          <p className="text-xl text-gray-500">
            {new Date(warningResult.timestamp).toLocaleTimeString('en-CA', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Warning Notice */}
        <div className="bg-amber-100 border-2 border-amber-400 rounded-2xl p-4 max-w-2xl">
          <p className="text-xl text-amber-800 font-medium">
            Account Inactive - Please visit Ship's Office
          </p>
        </div>
      </div>

      {/* Auto-return notice */}
      <p className="text-lg text-gray-600">
        Returning to main screen...
      </p>
    </div>
  );
}
