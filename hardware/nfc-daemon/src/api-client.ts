import axios, { AxiosInstance } from 'axios';

interface CheckinResponse {
  checkin: {
    id: string;
    direction: 'in' | 'out';
    timestamp: string;
  };
  member: {
    id: string;
    firstName: string;
    lastName: string;
    rank: string;
    division: {
      name: string;
    };
  };
}

export class ApiClient {
  private client: AxiosInstance;
  private kioskId: string;
  private kioskNotifyUrl: string;

  constructor(apiUrl: string, kioskId: string, kioskNotifyUrl?: string) {
    this.client = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.kioskId = kioskId;
    this.kioskNotifyUrl = kioskNotifyUrl || 'http://localhost:5174';
  }

  async recordCheckin(badgeSerialNumber: string): Promise<CheckinResponse> {
    const response = await this.client.post<CheckinResponse>('/api/checkins', {
      badgeSerialNumber,
      kioskId: this.kioskId,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  }

  async notifyKiosk(type: 'success' | 'error', data: Record<string, unknown>): Promise<void> {
    try {
      await axios.post(`${this.kioskNotifyUrl}/api/notify`, {
        type,
        data,
      }, { timeout: 2000 });
    } catch (err) {
      // Non-fatal - kiosk might not be running
      console.log('[API] Could not notify kiosk:', (err as Error).message);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
