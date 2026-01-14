import { useEffect, type ReactNode } from 'react';
import { useDevStore } from './store/dev-store';
import { DebugPanel } from './components/DebugPanel';

interface DevModeProviderProps {
  children: ReactNode;
}

/**
 * Internal provider component that sets up dev mode functionality
 * Only rendered when VITE_DEV_MODE is enabled
 */
function DevModeProviderInternal({ children }: DevModeProviderProps) {
  const togglePanel = useDevStore((state) => state.togglePanel);

  // Set up keyboard shortcut listener (Ctrl+Shift+D)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        togglePanel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePanel]);

  return (
    <>
      {children}
      <DebugPanel />
    </>
  );
}

/**
 * DevModeProvider component
 * Wraps children with dev mode functionality when VITE_DEV_MODE is enabled
 * In production, simply renders children without any dev mode overhead
 */
export function DevModeProvider({ children }: DevModeProviderProps) {
  // Check if dev mode is enabled via Vite define
  const isDevMode = typeof __DEV_MODE__ !== 'undefined' && __DEV_MODE__;

  if (!isDevMode) {
    return <>{children}</>;
  }

  return <DevModeProviderInternal>{children}</DevModeProviderInternal>;
}
