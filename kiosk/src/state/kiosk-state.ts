import { create } from 'zustand';

export type KioskScreen = 'idle' | 'scanning' | 'success' | 'error' | 'visitor' | 'visitor-success' | 'event-selection';

export interface CheckinResult {
  memberName: string;
  rank: string;
  division: string;
  direction: 'in' | 'out';
  timestamp: string;
}

export interface KioskError {
  message: string;
  howToFix?: string;
}

interface KioskState {
  currentScreen: KioskScreen;
  checkinResult: CheckinResult | null;
  error: KioskError | null;
  selectedEventId: string | null;
  visitorName: string | null;

  // Actions
  setScreen: (screen: KioskScreen) => void;
  setCheckinResult: (result: CheckinResult) => void;
  setError: (error: KioskError) => void;
  setVisitorSuccess: (name: string) => void;
  reset: () => void;
  enterVisitorMode: () => void;
  selectEvent: (eventId: string) => void;
  clearSelectedEvent: () => void;
}

export const useKioskStore = create<KioskState>((set) => ({
  currentScreen: 'idle',
  checkinResult: null,
  error: null,
  selectedEventId: null,
  visitorName: null,

  setScreen: (screen) => set({ currentScreen: screen }),

  setCheckinResult: (result) =>
    set({
      checkinResult: result,
      currentScreen: 'success',
      error: null,
    }),

  setError: (error) =>
    set({
      error,
      currentScreen: 'error',
      checkinResult: null,
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
      error: null,
      selectedEventId: null,
      visitorName: null,
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
}));
