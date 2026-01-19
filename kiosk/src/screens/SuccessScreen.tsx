import { useEffect, useState, useCallback } from 'react';
import { useKioskStore } from '../state/kiosk-state';
import { playSound } from '../lib/audio';
import { getConfig } from '../lib/config';
import { checkDdsStatus, acceptDds, checkMemberHasLockupTag } from '../lib/api';

type DdsButtonState = 'hidden' | 'loading' | 'visible' | 'accepting' | 'success';
type LockupButtonState = 'hidden' | 'loading' | 'visible';

export default function SuccessScreen() {
  const { checkinResult, reset, enterLockupConfirm } = useKioskStore();
  const config = getConfig();
  const [ddsButtonState, setDdsButtonState] = useState<DdsButtonState>('hidden');
  const [lockupButtonState, setLockupButtonState] = useState<LockupButtonState>('hidden');

  const isCheckingIn = checkinResult?.direction === 'in';
  const isCheckingOut = checkinResult?.direction === 'out';

  // Check DDS status on mount for check-ins
  useEffect(() => {
    if (!isCheckingIn || !checkinResult) {
      return;
    }

    setDdsButtonState('loading');

    checkDdsStatus()
      .then((status) => {
        if (!status.hasDds) {
          setDdsButtonState('visible');
        } else {
          setDdsButtonState('hidden');
        }
      })
      .catch(() => {
        // On error, don't show the button - fail silently
        setDdsButtonState('hidden');
      });
  }, [isCheckingIn, checkinResult]);

  // Check Lockup tag on mount for check-outs
  useEffect(() => {
    if (!isCheckingOut || !checkinResult) {
      return;
    }

    setLockupButtonState('loading');

    checkMemberHasLockupTag(checkinResult.memberId)
      .then((hasTag) => {
        if (hasTag) {
          setLockupButtonState('visible');
        } else {
          setLockupButtonState('hidden');
        }
      })
      .catch(() => {
        // On error, don't show the button - fail silently
        setLockupButtonState('hidden');
      });
  }, [isCheckingOut, checkinResult]);

  // Calculate timeout based on DDS or Lockup button state
  const timeoutMs =
    ddsButtonState === 'visible' || ddsButtonState === 'accepting' || lockupButtonState === 'visible'
      ? 5000
      : config.successDisplayMs;

  useEffect(() => {
    // Play success sound
    playSound('success');

    // Auto-return to idle after timeout
    const timeout = setTimeout(() => {
      reset();
    }, timeoutMs);

    return () => clearTimeout(timeout);
  }, [timeoutMs, reset]);

  const handleAcceptDds = useCallback(async () => {
    if (!checkinResult?.memberId) return;

    setDdsButtonState('accepting');

    try {
      await acceptDds(checkinResult.memberId);
      setDdsButtonState('success');
      // Brief delay to show success state before reset
      setTimeout(() => {
        reset();
      }, 1500);
    } catch {
      // On error, just hide the button and let normal timeout proceed
      setDdsButtonState('hidden');
    }
  }, [checkinResult?.memberId, reset]);

  const handleLockupClick = useCallback(() => {
    if (!checkinResult?.memberId) return;
    enterLockupConfirm(checkinResult.memberId);
  }, [checkinResult?.memberId, enterLockupConfirm]);

  if (!checkinResult) {
    return null;
  }

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

      {/* DDS Button - Only show for check-ins when no DDS assigned */}
      {isCheckingIn && ddsButtonState !== 'hidden' && (
        <div className="mb-4">
          <button
            onClick={handleAcceptDds}
            disabled={ddsButtonState === 'loading' || ddsButtonState === 'accepting' || ddsButtonState === 'success'}
            className={`
              flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-xl
              transition-all duration-200 min-h-[56px] min-w-[280px]
              ${ddsButtonState === 'success'
                ? 'bg-green-500 text-white cursor-default'
                : ddsButtonState === 'loading' || ddsButtonState === 'accepting'
                  ? 'bg-amber-300 text-amber-800 cursor-wait'
                  : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-lg'
              }
            `}
            aria-busy={ddsButtonState === 'loading' || ddsButtonState === 'accepting'}
          >
            {ddsButtonState === 'loading' && (
              <>
                <LoadingSpinner />
                <span>Checking...</span>
              </>
            )}
            {ddsButtonState === 'visible' && (
              <>
                <ClipboardIcon />
                <span>I am DDS today</span>
              </>
            )}
            {ddsButtonState === 'accepting' && (
              <>
                <LoadingSpinner />
                <span>Accepting...</span>
              </>
            )}
            {ddsButtonState === 'success' && (
              <>
                <CheckIcon />
                <span>DDS Accepted!</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Lockup Button - Only show for check-outs when member has Lockup tag */}
      {isCheckingOut && lockupButtonState !== 'hidden' && (
        <div className="mb-4">
          <button
            onClick={handleLockupClick}
            disabled={lockupButtonState === 'loading'}
            className={`
              flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-xl
              transition-all duration-200 min-h-[56px] min-w-[280px]
              ${lockupButtonState === 'loading'
                ? 'bg-red-300 text-red-800 cursor-wait'
                : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-lg'
              }
            `}
            aria-busy={lockupButtonState === 'loading'}
          >
            {lockupButtonState === 'loading' && (
              <>
                <LoadingSpinner />
                <span>Checking...</span>
              </>
            )}
            {lockupButtonState === 'visible' && (
              <>
                <LockIcon />
                <span>Lock Building</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Auto-return notice */}
      <p className="text-lg text-gray-600">
        Returning to main screen...
      </p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="w-6 h-6 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-6 h-6"
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
  );
}

function LockIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}
