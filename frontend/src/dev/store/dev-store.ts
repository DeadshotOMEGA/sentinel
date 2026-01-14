import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DevModeState,
  ErrorInjectionConfig,
  FeatureToggle,
  NetworkLogEntry,
} from '@shared/types/dev-mode';

const MAX_NETWORK_LOG_ENTRIES = 50;

/**
 * Default feature toggles for dev mode
 */
const defaultFeatureToggles: FeatureToggle[] = [
  {
    key: 'simulateSlowNetwork',
    label: 'Simulate Slow Network',
    description: 'Add 500ms delay to all API requests',
    enabled: false,
    category: 'network',
  },
  {
    key: 'simulateOffline',
    label: 'Simulate Offline',
    description: 'Block all API requests to test offline behavior',
    enabled: false,
    category: 'network',
  },
  {
    key: 'showComponentBoundaries',
    label: 'Show Component Boundaries',
    description: 'Display visual borders around React components for debugging',
    enabled: false,
    category: 'ui',
  },
  {
    key: 'logRenderCounts',
    label: 'Log Render Counts',
    description: 'Console log component render counts for performance analysis',
    enabled: false,
    category: 'debug',
  },
  {
    key: 'disableAnimations',
    label: 'Disable Animations',
    description: 'Disable all framer-motion animations for testing',
    enabled: false,
    category: 'ui',
  },
];

/**
 * Default error injection configuration
 */
const defaultErrorInjection: ErrorInjectionConfig = {
  enabled: false,
  failureRate: 0.2,
  delayMs: 0,
  statusCode: 500,
  endpoints: [],
};

/**
 * Default dev mode state
 */
const defaultDevModeState: DevModeState = {
  enabled: true,
  panelOpen: false,
  panelPosition: { x: 16, y: 16 },
  activeTab: 'network',
  errorInjection: defaultErrorInjection,
  networkLog: [],
  featureToggles: defaultFeatureToggles,
};

/**
 * Dev store interface extending DevModeState with actions
 */
export interface DevStore extends DevModeState {
  // Panel actions
  togglePanel: () => void;
  setActiveTab: (tab: string) => void;
  setPanelPosition: (pos: { x: number; y: number }) => void;

  // Network log actions
  addNetworkLog: (entry: NetworkLogEntry) => void;
  clearNetworkLog: () => void;

  // Error injection actions
  setErrorInjection: (config: Partial<ErrorInjectionConfig>) => void;

  // Feature toggle actions
  toggleFeature: (key: string) => void;
  setFeatureEnabled: (key: string, enabled: boolean) => void;

  // Reset action
  resetToDefaults: () => void;
}

/**
 * Zustand store for dev mode state management
 * Persists panel state and feature toggles to localStorage
 */
export const useDevStore = create<DevStore>()(
  persist(
    (set, get) => ({
      ...defaultDevModeState,

      togglePanel: () => {
        set((state) => ({ panelOpen: !state.panelOpen }));
      },

      setActiveTab: (tab: string) => {
        set({ activeTab: tab });
      },

      setPanelPosition: (pos: { x: number; y: number }) => {
        set({ panelPosition: pos });
      },

      addNetworkLog: (entry: NetworkLogEntry) => {
        set((state) => {
          const newLog = [entry, ...state.networkLog];
          // FIFO: Keep only the most recent entries
          if (newLog.length > MAX_NETWORK_LOG_ENTRIES) {
            newLog.pop();
          }
          return { networkLog: newLog };
        });
      },

      clearNetworkLog: () => {
        set({ networkLog: [] });
      },

      setErrorInjection: (config: Partial<ErrorInjectionConfig>) => {
        set((state) => ({
          errorInjection: { ...state.errorInjection, ...config },
        }));
      },

      toggleFeature: (key: string) => {
        set((state) => ({
          featureToggles: state.featureToggles.map((toggle) =>
            toggle.key === key ? { ...toggle, enabled: !toggle.enabled } : toggle
          ),
        }));
      },

      setFeatureEnabled: (key: string, enabled: boolean) => {
        set((state) => ({
          featureToggles: state.featureToggles.map((toggle) =>
            toggle.key === key ? { ...toggle, enabled } : toggle
          ),
        }));
      },

      resetToDefaults: () => {
        set({
          ...defaultDevModeState,
          // Keep panel position and open state
          panelPosition: get().panelPosition,
        });
      },
    }),
    {
      name: 'sentinel-dev-mode',
      partialize: (state) => ({
        // Only persist panel state and feature toggles, not network log
        panelOpen: state.panelOpen,
        panelPosition: state.panelPosition,
        activeTab: state.activeTab,
        errorInjection: state.errorInjection,
        featureToggles: state.featureToggles,
      }),
    }
  )
);

/**
 * Selector for checking if a specific feature is enabled
 */
export function useFeatureEnabled(key: string): boolean {
  return useDevStore((state) =>
    state.featureToggles.find((t) => t.key === key)?.enabled ?? false
  );
}

/**
 * Selector for getting feature toggles by category
 */
export function useFeatureTogglesByCategory(
  category: FeatureToggle['category']
): FeatureToggle[] {
  return useDevStore((state) =>
    state.featureToggles.filter((t) => t.category === category)
  );
}
