import { useEffect } from 'react';
import { useKioskStore } from '../state/kiosk-state';
import { playSound } from '../lib/audio';
import { getConfig } from '../lib/config';

export default function ErrorScreen() {
  const { error, reset } = useKioskStore();
  const config = getConfig();

  useEffect(() => {
    // Play error sound
    playSound('error');

    // Auto-return to idle after timeout
    const timeout = setTimeout(() => {
      reset();
    }, config.errorDisplayMs);

    return () => clearTimeout(timeout);
  }, [config.errorDisplayMs, reset]);

  if (!error) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-danger-50 to-danger-100 p-6 overflow-hidden relative">
      {/* Error Icon - Reduced size */}
      <div className="mb-5">
        <div className="w-24 h-24 bg-danger rounded-full flex items-center justify-center">
          <svg
            className="w-16 h-16 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      </div>

      {/* Error Message */}
      <div className="text-center mb-6 max-w-3xl">
        <h2 className="text-4xl font-bold text-danger-700 mb-4">
          Unable to Process
        </h2>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-5">
          <p className="text-2xl text-gray-800 mb-4">
            {error.message}
          </p>

          {error.howToFix && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xl font-semibold text-gray-700 mb-2">
                What to do:
              </p>
              <p className="text-xl text-gray-600">
                {error.howToFix}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 w-full max-w-2xl mb-4">
        <button
          onClick={reset}
          className="kiosk-button-primary flex-1"
        >
          Try Again
        </button>

        <button
          onClick={() => {
            // Could implement help request functionality
            reset();
          }}
          className="kiosk-button-secondary flex-1"
        >
          Contact Duty Watch
        </button>
      </div>

      {/* Auto-return notice */}
      <p className="text-lg text-gray-600">
        Returning to main screen in a few seconds...
      </p>
    </div>
  );
}
