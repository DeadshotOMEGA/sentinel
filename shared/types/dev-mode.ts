/**
 * Dev Mode System Types
 * Shared types for development utilities including mock scanning, data seeding, error injection, and feature toggles
 */

// ============================================================================
// Mock Scan Types
// ============================================================================

/**
 * Request body for mock RFID scan
 * Used in development to simulate badge scans without physical hardware
 */
export interface MockScanRequest {
  /** Badge serial number being scanned */
  serialNumber: string;
  /** Optional override for scan timestamp (defaults to now) */
  timestamp?: Date;
  /** Optional kiosk identifier for location tracking */
  kioskId?: string;
}

/**
 * Response from mock scan endpoint
 * Contains check-in/out result and member information
 */
export interface MockScanResponse {
  /** Whether the scan was processed successfully */
  success: boolean;
  /** Direction of the check-in (in or out) */
  direction: 'in' | 'out';
  /** Member information if badge was found and valid */
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    rank: string;
    division: string;
  };
  /** Error message if scan failed */
  error?: string;
}

// ============================================================================
// Data Seeding Types
// ============================================================================

/**
 * Available seed scenarios for populating test data
 */
export type SeedScenario = 'empty' | 'busy-day' | 'edge-cases' | 'realistic-week';

/**
 * Metadata for a seed scenario
 * Defines available scenarios and how to execute them
 */
export interface SeedScenarioConfig {
  /** Unique identifier for this scenario */
  id: SeedScenario;
  /** Display name for the scenario */
  name: string;
  /** Detailed description of what data is seeded */
  description: string;
  /** Function to execute the seeding operation */
  seed: () => Promise<SeedResult>;
}

/**
 * Result of a seeding operation
 * Summarizes what data was created
 */
export interface SeedResult {
  /** Which scenario was executed */
  scenario: SeedScenario;
  /** Counts of entities created by type */
  created: {
    members: number;
    checkins: number;
    visitors: number;
    events: number;
  };
  /** Total time taken in milliseconds */
  duration: number;
}

// ============================================================================
// Error Injection Types
// ============================================================================

/**
 * Configuration for API error injection
 * Enables testing error handling and resilience
 */
export interface ErrorInjectionConfig {
  /** Whether error injection is currently enabled */
  enabled: boolean;
  /** Probability of injection (0.0 = never, 1.0 = always) */
  failureRate: number;
  /** Additional delay to apply to requests (milliseconds) */
  delayMs: number;
  /** HTTP status code to return for injected errors */
  statusCode: number;
  /** Specific endpoints to target (empty array = all endpoints) */
  endpoints?: string[];
}

// ============================================================================
// Feature Toggle Types
// ============================================================================

/**
 * Individual feature toggle definition
 * Controls enabling/disabling experimental or debug features
 */
export interface FeatureToggle {
  /** Unique identifier for the toggle (e.g., 'new-dashboard-ui') */
  key: string;
  /** Display label for admin UI */
  label: string;
  /** Detailed description of what the feature does */
  description: string;
  /** Whether the feature is currently enabled */
  enabled: boolean;
  /** Category for grouping toggles in UI */
  category: 'network' | 'ui' | 'debug';
}

// ============================================================================
// Network Logging Types
// ============================================================================

/**
 * Captured API request/response for debugging
 * Part of network activity log
 */
export interface NetworkLogEntry {
  /** Unique identifier for this request */
  id: string;
  /** When the request was made */
  timestamp: Date;
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request URL/path */
  url: string;
  /** HTTP response status code */
  status: number;
  /** Total request duration in milliseconds */
  duration: number;
  /** Request body content (if applicable) */
  requestBody?: unknown;
  /** Response body content (if applicable) */
  responseBody?: unknown;
  /** Error message if request failed */
  error?: string;
}

// ============================================================================
// Dev Mode State Types
// ============================================================================

/**
 * Complete dev mode system state
 * Encompasses all dev tools, toggles, and configurations
 */
export interface DevModeState {
  /** Whether dev mode is currently enabled */
  enabled: boolean;
  /** Whether the dev panel is open in UI */
  panelOpen: boolean;
  /** Position of dev panel on screen */
  panelPosition: {
    x: number;
    y: number;
  };
  /** Currently active tab in dev panel */
  activeTab: string;
  /** Error injection configuration */
  errorInjection: ErrorInjectionConfig;
  /** Captured network requests */
  networkLog: NetworkLogEntry[];
  /** All available feature toggles */
  featureToggles: FeatureToggle[];
}
