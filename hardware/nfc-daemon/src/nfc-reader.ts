type CardCallback = (uid: string) => Promise<void>;

export class NfcReader {
  private isRunning = false;
  private callback: CardCallback | null = null;
  private lastCardUid: string | null = null;
  private lastCardTime = 0;
  private debounceTime = 2000; // 2 seconds - reduced for faster throughput with large groups
  private pollInterval = 100; // 100ms
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  onCardDetected(callback: CardCallback): void {
    this.callback = callback;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Check if running on actual hardware
    if (this.isHardwareAvailable()) {
      this.startHardwareReader();
    } else {
      console.log('[NFC] Hardware not available, starting mock reader');
      this.startMockReader();
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private isHardwareAvailable(): boolean {
    // Check for PN532 device
    // In real implementation, check /dev/i2c-* or /dev/spi*
    return process.platform === 'linux' && process.arch === 'arm64';
  }

  private startHardwareReader(): void {
    console.log('[NFC] Starting hardware reader (PN532)');

    // Real PN532 implementation would go here
    // Using nfc-pcsc or direct SPI/I2C communication
    // For now, fall back to mock
    this.startMockReader();
  }

  private startMockReader(): void {
    // Mock reader for development/testing
    // Simulates random card scans
    console.log('[NFC] Mock reader active - type card UIDs in stdin');

    // Listen for stdin input (for testing)
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      let buffer = '';
      process.stdin.on('data', async (key: string) => {
        if (key === '\u0003') { // Ctrl+C
          process.exit();
        } else if (key === '\r' || key === '\n') {
          if (buffer.length > 0) {
            await this.handleCard(buffer.trim());
            buffer = '';
          }
        } else {
          buffer += key;
          process.stdout.write(key);
        }
      });

      console.log('[NFC] Enter card UID and press Enter to simulate scan');
    }
  }

  private async handleCard(uid: string): Promise<void> {
    const now = Date.now();

    // Debounce: ignore same card within debounce time
    if (uid === this.lastCardUid && now - this.lastCardTime < this.debounceTime) {
      console.log(`[NFC] Ignoring duplicate scan of ${uid}`);
      return;
    }

    this.lastCardUid = uid;
    this.lastCardTime = now;

    if (this.callback) {
      await this.callback(uid);
    }
  }
}
