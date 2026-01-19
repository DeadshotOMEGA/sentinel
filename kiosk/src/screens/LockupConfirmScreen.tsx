import { useEffect, useState, useCallback } from 'react';
import { useKioskStore } from '../state/kiosk-state';
import { playSound } from '../lib/audio';
import {
  getPresentForLockup,
  executeLockup,
  type LockupMember,
  type LockupVisitor,
} from '../lib/api';

type ScreenState = 'loading' | 'ready' | 'confirming' | 'success' | 'error';

export default function LockupConfirmScreen() {
  const { lockupMemberId, reset } = useKioskStore();
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [members, setMembers] = useState<LockupMember[]>([]);
  const [visitors, setVisitors] = useState<LockupVisitor[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch present members/visitors on mount
  useEffect(() => {
    getPresentForLockup()
      .then((data) => {
        setMembers(data.members);
        setVisitors(data.visitors);
        setScreenState('ready');
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load presence data');
        setScreenState('error');
      });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!lockupMemberId) return;

    setScreenState('confirming');

    try {
      await executeLockup(lockupMemberId);
      playSound('success');
      setScreenState('success');
      // Auto-reset after showing success
      setTimeout(() => {
        reset();
      }, 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to execute lockup');
      setScreenState('error');
    }
  }, [lockupMemberId, reset]);

  const handleCancel = useCallback(() => {
    reset();
  }, [reset]);

  // Auto-timeout for error state
  useEffect(() => {
    if (screenState === 'error') {
      const timeout = setTimeout(() => {
        reset();
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [screenState, reset]);

  const totalPresent = members.length + visitors.length;
  const presentSummary = buildPresentSummary(members.length, visitors.length);

  if (screenState === 'loading') {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen p-6 overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, #fecaca, #fca5a5)' }}
        role="main"
        aria-live="polite"
      >
        <div className="mb-6">
          <LoadingSpinner size="large" />
        </div>
        <h2 className="text-3xl font-bold text-red-800">Loading presence data...</h2>
      </div>
    );
  }

  if (screenState === 'error') {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen p-6 overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, #fecaca, #fca5a5)' }}
        role="main"
        aria-live="polite"
      >
        <div className="mb-6">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#dc2626' }}
            aria-hidden="true"
          >
            <ErrorIcon />
          </div>
        </div>
        <h2 className="text-4xl font-bold text-red-800 mb-4">Lockup Error</h2>
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 max-w-2xl">
          <p className="text-xl text-gray-700">{errorMessage}</p>
        </div>
        <button
          onClick={handleCancel}
          className="px-8 py-4 rounded-xl font-bold text-xl bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white shadow-lg transition-all duration-200 min-h-[56px]"
        >
          Return to Main Screen
        </button>
      </div>
    );
  }

  if (screenState === 'success') {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen p-6 overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, #91e5b5, #68dc9a)' }}
        role="main"
        aria-live="polite"
      >
        <div className="mb-6">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#17c964' }}
            aria-hidden="true"
          >
            <CheckIcon />
          </div>
        </div>
        <h2 className="text-5xl font-bold text-green-800 mb-4">Building Locked</h2>
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 max-w-2xl">
          <p className="text-2xl text-gray-700">
            All personnel have been signed out.
          </p>
        </div>
        <p className="text-lg text-gray-600">Returning to main screen...</p>
      </div>
    );
  }

  // Ready or confirming state
  return (
    <div
      className="flex flex-col items-center justify-center h-screen p-6 overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #fecaca, #fca5a5)' }}
      role="main"
      aria-live="polite"
    >
      {/* Warning Icon */}
      <div className="mb-6">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#dc2626' }}
          aria-hidden="true"
        >
          <LockIcon />
        </div>
      </div>

      {/* Header */}
      <h2 className="text-4xl font-bold text-red-800 mb-2">Building Lockup</h2>

      {/* Present Count Summary */}
      {totalPresent > 0 && (
        <p className="text-2xl text-red-700 mb-4">{presentSummary}</p>
      )}

      {/* Present People List */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 max-w-2xl w-full max-h-[40vh] overflow-auto">
        {totalPresent === 0 ? (
          <p className="text-xl text-gray-600 text-center">
            No one is currently signed in.
          </p>
        ) : (
          <>
            <p className="text-lg text-gray-600 mb-4">
              The following people are still showing as present:
            </p>
            <ul className="space-y-3">
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-3">
                  <MemberAvatar name={`${member.firstName} ${member.lastName}`} />
                  <div>
                    <p className="text-lg font-semibold text-gray-800">
                      {member.rank} {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{member.division}</p>
                  </div>
                </li>
              ))}
              {visitors.map((visitor) => (
                <li key={visitor.id} className="flex items-center gap-3">
                  <VisitorAvatar />
                  <div>
                    <p className="text-lg font-semibold text-gray-800">
                      {visitor.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Visitor - {visitor.organization}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleCancel}
          disabled={screenState === 'confirming'}
          className="px-8 py-4 rounded-xl font-bold text-xl bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white shadow-lg transition-all duration-200 min-h-[56px] min-w-[180px]"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={screenState === 'confirming'}
          className={`
            flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-xl
            transition-all duration-200 min-h-[56px] min-w-[280px]
            ${screenState === 'confirming'
              ? 'bg-green-400 text-green-900 cursor-wait'
              : 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-lg'
            }
          `}
          aria-busy={screenState === 'confirming'}
        >
          {screenState === 'confirming' ? (
            <>
              <LoadingSpinner size="small" />
              <span>Locking...</span>
            </>
          ) : (
            <>
              <LockIcon />
              <span>Confirm Building Empty</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function buildPresentSummary(memberCount: number, visitorCount: number): string {
  const parts: string[] = [];
  if (memberCount > 0) {
    parts.push(`${memberCount} member${memberCount === 1 ? '' : 's'}`);
  }
  if (visitorCount > 0) {
    parts.push(`${visitorCount} visitor${visitorCount === 1 ? '' : 's'}`);
  }
  if (parts.length === 0) return '';
  return `${parts.join(' and ')} still present`;
}

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 text-blue-700 font-bold text-lg flex-shrink-0"
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function VisitorAvatar() {
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100 text-purple-700 flex-shrink-0"
      aria-hidden="true"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    </div>
  );
}

function LoadingSpinner({ size = 'small' }: { size?: 'small' | 'large' }) {
  const sizeClass = size === 'large' ? 'w-16 h-16' : 'w-6 h-6';
  return (
    <svg
      className={`${sizeClass} animate-spin`}
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

function LockIcon() {
  return (
    <svg
      className="w-12 h-12 text-white"
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

function CheckIcon() {
  return (
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
        strokeWidth={3}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
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
  );
}
