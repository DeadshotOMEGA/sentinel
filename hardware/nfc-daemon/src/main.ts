import { NfcReader } from './nfc-reader';
import { ApiClient } from './api-client';
import { loadConfig } from './config';

const config = loadConfig();
const apiClient = new ApiClient(config.apiUrl, config.kioskId, config.kioskNotifyUrl);
const nfcReader = new NfcReader();

console.log(`[NFC Daemon] Starting with kiosk ID: ${config.kioskId}`);
console.log(`[NFC Daemon] API URL: ${config.apiUrl}`);

async function handleCardDetected(uid: string): Promise<void> {
  console.log(`[NFC] Card detected: ${uid}`);

  try {
    const result = await apiClient.recordCheckin(uid);
    console.log(`[NFC] Check-in recorded: ${result.member.firstName} ${result.member.lastName} - ${result.checkin.direction}`);

    // Send success signal to kiosk (via HTTP or IPC)
    await apiClient.notifyKiosk('success', {
      memberId: result.member.id,
      memberName: `${result.member.firstName} ${result.member.lastName}`,
      rank: result.member.rank,
      division: result.member.division.name,
      direction: result.checkin.direction,
      timestamp: result.checkin.timestamp,
    });
  } catch (err: unknown) {
    const error = err as { response?: { data?: { error?: { code?: string; message?: string; howToFix?: string } } } };
    const errorData = error.response?.data?.error;

    console.error(`[NFC] Check-in failed:`, errorData?.message || 'Unknown error');

    // Send error signal to kiosk
    await apiClient.notifyKiosk('error', {
      code: errorData?.code || 'UNKNOWN_ERROR',
      message: errorData?.message || 'An error occurred. Please try again.',
      howToFix: errorData?.howToFix,
    });
  }
}

// Start the NFC reader
nfcReader.onCardDetected(handleCardDetected);
nfcReader.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[NFC Daemon] Shutting down...');
  nfcReader.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[NFC Daemon] Interrupted, shutting down...');
  nfcReader.stop();
  process.exit(0);
});

console.log('[NFC Daemon] Ready and listening for cards...');
