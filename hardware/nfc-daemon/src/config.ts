import * as fs from 'fs';

export interface DaemonConfig {
  kioskId: string;
  apiUrl: string;
  kioskNotifyUrl: string;
  pollInterval: number;
  debounceTime: number;
}

const defaultConfig: DaemonConfig = {
  kioskId: 'primary-entrance',
  apiUrl: 'http://localhost:3000',
  kioskNotifyUrl: 'http://localhost:5174',
  pollInterval: 100, // ms between NFC polls
  debounceTime: 5000, // ms to ignore same card
};

export function loadConfig(): DaemonConfig {
  const configPath = process.env.CONFIG_PATH || '/etc/sentinel/nfc-daemon.json';

  let config = { ...defaultConfig };

  // Try to load from config file
  if (fs.existsSync(configPath)) {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const fileConfig = JSON.parse(fileContent) as Partial<DaemonConfig>;
      config = { ...config, ...fileConfig };
      console.log(`[Config] Loaded from ${configPath}`);
    } catch (err) {
      console.error(`[Config] Failed to load ${configPath}:`, err);
    }
  }

  // Override with environment variables
  if (process.env.KIOSK_ID) config.kioskId = process.env.KIOSK_ID;
  if (process.env.API_URL) config.apiUrl = process.env.API_URL;
  if (process.env.KIOSK_NOTIFY_URL) config.kioskNotifyUrl = process.env.KIOSK_NOTIFY_URL;

  return config;
}
