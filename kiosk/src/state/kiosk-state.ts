import { create } from 'zustand';

export type KioskScreen = 'idle' | 'scanning' | 'success' | 'error' | 'warning' | 'visitor' | 'visitor-success' | 'event-selection' | 'lockup-confirm';

export interface CheckinResult {
  memberId: string;
  memberName: string;
  rank: string;
  division: string;
  direction: 'in' | 'out';
  timestamp: string;
}

export interface WarningResult extends CheckinResult {
  warning: {
    type: string;
    message: string;
  };
}

export type KioskErrorCode =
  | 'BADGE_NOT_FOUND'
  | 'BADGE_NOT_ASSIGNED'
  | 'BADGE_INACTIVE'
  | 'DUPLICATE_SCAN'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface KioskError {
  code: KioskErrorCode;
  message: string;
  howToFix?: string;
}

interface KioskState {
  currentScreen: KioskScreen;
  checkinResult: CheckinResult | null;
  warningResult: WarningResult | null;
  error: KioskError | null;
  selectedEventId: string | null;
  visitorName: string | null;
  lockupMemberId: string | null;

  // Actions
  setScreen: (screen: KioskScreen) => void;
  setCheckinResult: (result: CheckinResult) => void;
  setWarningResult: (result: WarningResult) => void;
  setError: (error: KioskError) => void;
  setVisitorSuccess: (name: string) => void;
  reset: () => void;
  enterVisitorMode: () => void;
  selectEvent: (eventId: string) => void;
  clearSelectedEvent: () => void;
  enterLockupConfirm: (memberId: string) => void;
}

export const useKioskStore = create<KioskState>((set) => ({
  currentScreen: 'idle',
  checkinResult: null,
  warningResult: null,
  error: null,
  selectedEventId: null,
  visitorName: null,
  lockupMemberId: null,

  setScreen: (screen) => set({ currentScreen: screen }),

  setCheckinResult: (result) =>
    set({
      checkinResult: result,
      currentScreen: 'success',
      error: null,
      warningResult: null,
    }),

  setWarningResult: (result) =>
    set({
      warningResult: result,
      currentScreen: 'warning',
      error: null,
      checkinResult: null,
    }),

  setError: (error) =>
    set({
      error,
      currentScreen: 'error',
      checkinResult: null,
      warningResult: null,
    }),

  setVisitorSuccess: (name) =>
    set({
      visitorName: name,
      currentScreen: 'visitor-success',
      error: null,
    }),

  reset: () =>
    set({
      currentScreen: 'idle',
      checkinResult: null,
      warningResult: null,
      error: null,
      selectedEventId: null,
      visitorName: null,
      lockupMemberId: null,
    }),

  enterVisitorMode: () =>
    set({
      currentScreen: 'visitor',
      checkinResult: null,
      error: null,
    }),

  selectEvent: (eventId) =>
    set({
      selectedEventId: eventId,
      currentScreen: 'scanning',
      error: null,
    }),

  clearSelectedEvent: () =>
    set({
      selectedEventId: null,
    }),

  enterLockupConfirm: (memberId) =>
    set({
      lockupMemberId: memberId,
      currentScreen: 'lockup-confirm',
      checkinResult: null,
      error: null,
    }),
}));
