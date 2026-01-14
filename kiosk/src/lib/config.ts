interface KioskConfig {
  kioskId: string;
  visitorModeEnabled: boolean;
  idleTimeoutMs: number;
  successDisplayMs: number;
  errorDisplayMs: number;
  scanCooldownMs: number;
}

const DEFAULT_CONFIG: KioskConfig = {
  kioskId: import.meta.env.VITE_KIOSK_ID || 'kiosk-1',
  visitorModeEnabled: import.meta.env.VITE_VISITOR_MODE_ENABLED === 'true' || true,
  idleTimeoutMs: 3000, // Auto-return to idle after success/error
  successDisplayMs: 2000, // Reduced for faster throughput with large groups
  errorDisplayMs: 5000,
  scanCooldownMs: 2000, // Must match backend duplicate scan interval
};

let config: KioskConfig = { ...DEFAULT_CONFIG };

export function getConfig(): KioskConfig {
  return config;
}

export function updateConfig(updates: Partial<KioskConfig>): void {
  config = { ...config, ...updates };
}
