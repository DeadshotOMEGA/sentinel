import { useCallback } from 'react';
import type { ErrorInjectionConfig, NetworkLogEntry } from '@shared/types/dev-mode';
import { useDevStore, useFeatureEnabled } from '../store/dev-store';

/**
 * No-op function for production mode
 */
const noop = () => {};

/**
 * Return type for useDevMode hook
 */
export interface UseDevModeReturn {
  /** Whether dev mode is currently enabled */
  isDevMode: boolean;
  /** Whether the dev panel is open */
  panelOpen: boolean;
  /** Toggle the dev panel visibility */
  togglePanel: () => void;
  /** Set the active tab in the dev panel */
  setActiveTab: (tab: string) => void;
  /** Set the panel position */
  setPanelPosition: (pos: { x: number; y: number }) => void;
  /** Add an entry to the network log */
  addNetworkLog: (entry: NetworkLogEntry) => void;
  /** Clear the network log */
  clearNetworkLog: () => void;
  /** Update error injection configuration */
  setErrorInjection: (config: Partial<ErrorInjectionConfig>) => void;
  /** Toggle a feature by key */
  toggleFeature: (key: string) => void;
  /** Check if a specific feature is enabled */
  isFeatureEnabled: (key: string) => boolean;
}

/**
 * Production mode return value with no-ops
 */
const productionModeReturn: UseDevModeReturn = {
  isDevMode: false,
  panelOpen: false,
  togglePanel: noop,
  setActiveTab: noop,
  setPanelPosition: noop,
  addNetworkLog: noop,
  clearNetworkLog: noop,
  setErrorInjection: noop,
  toggleFeature: noop,
  isFeatureEnabled: () => false,
};

/**
 * Convenience hook for dev mode state and actions
 * Returns no-op functions when not in dev mode to prevent
 * any dev code from affecting production behavior
 */
export function useDevMode(): UseDevModeReturn {
  // Check global dev mode flag (set by Vite)
  const isDevMode = typeof __DEV_MODE__ !== 'undefined' && __DEV_MODE__;

  // Get store actions - these will be ignored if not in dev mode
  const store = useDevStore();

  // Create a stable isFeatureEnabled function
  const isFeatureEnabled = useCallback(
    (key: string) => {
      if (!isDevMode) return false;
      return store.featureToggles.find((t) => t.key === key)?.enabled ?? false;
    },
    [isDevMode, store.featureToggles]
  );

  // Return no-ops if not in dev mode
  if (!isDevMode) {
    return productionModeReturn;
  }

  return {
    isDevMode: true,
    panelOpen: store.panelOpen,
    togglePanel: store.togglePanel,
    setActiveTab: store.setActiveTab,
    setPanelPosition: store.setPanelPosition,
    addNetworkLog: store.addNetworkLog,
    clearNetworkLog: store.clearNetworkLog,
    setErrorInjection: store.setErrorInjection,
    toggleFeature: store.toggleFeature,
    isFeatureEnabled,
  };
}

/**
 * Hook to check if a specific dev feature is enabled
 * Safe to use in production - returns false when dev mode is disabled
 */
export function useDevFeature(key: string): boolean {
  const isDevMode = typeof __DEV_MODE__ !== 'undefined' && __DEV_MODE__;

  // Always call the hook to maintain React rules
  const featureEnabled = useFeatureEnabled(key);

  // Only return true if both dev mode and the feature are enabled
  return isDevMode && featureEnabled;
}
