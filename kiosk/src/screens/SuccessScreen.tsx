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

  // Distinct visual styling for check-in vs check-out
  // Green (#91e5b5 -> #68dc9a) for check-in, amber (#fde68a -> #fcd34d) for check-out
  const bgStyle = isCheckingIn
    ? { background: 'linear-gradient(to bottom, #91e5b5, #68dc9a)' }
    : { background: 'linear-gradient(to bottom, #fde68a, #fcd34d)' };
  const iconBgColor = isCheckingIn ? '#17c964' : '#f59e0b';
  const headingColor = isCheckingIn ? '#0f8341' : '#b45309';

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 overflow-hidden" style={bgStyle} role="main" aria-live="polite">
      {/* Direction Icon */}
      <div className="mb-6">
        <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ backgroundColor: iconBgColor }} aria-hidden="true">
          {isCheckingIn ? (
            // Arrow pointing right/in (login icon)
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
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
          ) : (
            // Arrow pointing left/out (logout icon)
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Success Message */}
      <div className="text-center mb-8">
        <h2 className="text-5xl font-bold mb-4" style={{ color: headingColor }}>
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
