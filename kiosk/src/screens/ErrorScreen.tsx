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
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-danger-50 to-danger-100 p-8">
      {/* Error Icon */}
      <div className="mb-8">
        <div className="w-32 h-32 bg-danger rounded-full flex items-center justify-center">
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      </div>

      {/* Error Message */}
      <div className="text-center mb-12 max-w-3xl">
        <h2 className="text-5xl font-bold text-danger-700 mb-6">
          Unable to Process
        </h2>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <p className="text-3xl text-gray-800 mb-6">
            {error.message}
          </p>

          {error.howToFix && (
            <div className="border-t border-gray-200 pt-6">
              <p className="text-2xl font-semibold text-gray-700 mb-3">
                What to do:
              </p>
              <p className="text-2xl text-gray-600">
                {error.howToFix}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xl">
        <button
          onClick={reset}
          className="kiosk-button-primary w-full"
        >
          Try Again
        </button>

        <button
          onClick={() => {
            // Could implement help request functionality
            reset();
          }}
          className="kiosk-button-secondary w-full"
        >
          Contact Duty Watch
        </button>
      </div>

      {/* Auto-return notice */}
      <p className="absolute bottom-8 text-xl text-gray-600">
        Returning to main screen in a few seconds...
      </p>
    </div>
  );
}
