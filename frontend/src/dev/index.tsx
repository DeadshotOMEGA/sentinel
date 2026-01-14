import type { ReactNode } from 'react';
import { DevModeProvider as RealDevModeProvider } from './DevModeProvider';

/**
 * Dev Mode Module Entry Point
 *
 * Exports dev mode components and hooks with proper tree-shaking support.
 * When dev mode is disabled, exports are replaced with no-op implementations
 * to ensure zero bundle impact in production.
 */

// Type-only exports (always available)
export type { DevStore } from './store/dev-store';
export type { UseDevModeReturn } from './hooks/useDevMode';

// Passthrough component type for production
type PassthroughProps = { children: ReactNode };

// Passthrough component that just renders children
const PassthroughProvider = ({ children }: PassthroughProps) => <>{children}</>;

/**
 * DevModeProvider - Conditionally exports the real provider or a passthrough
 * The __DEV_MODE__ check allows tree-shaking in production builds
 */
export const DevModeProvider: React.FC<PassthroughProps> = __DEV_MODE__
  ? RealDevModeProvider
  : PassthroughProvider;

/**
 * useDevMode hook - Safe to use in any environment
 * Returns no-ops when dev mode is disabled
 */
export { useDevMode, useDevFeature } from './hooks/useDevMode';

/**
 * Store exports - Only use these directly if you need fine-grained control
 * Prefer useDevMode hook for most use cases
 */
export {
  useDevStore,
  useFeatureEnabled,
  useFeatureTogglesByCategory,
} from './store/dev-store';
