import { useEffect, useRef, useCallback } from 'react';
import { useKioskStore, type KioskErrorCode } from '../state/kiosk-state';
import { scanBadge, type QueuedCheckinResult } from '../lib/api';
import { getConfig } from '../lib/config';

// NFC readers send characters rapidly (~10-20ms between chars), but Playwright
// types slower (~50-100ms per char by default). Use 300ms to handle both cases.
const SCAN_TIMEOUT_MS = 300;
const MIN_SERIAL_LENGTH = 8;
const MAX_SERIAL_LENGTH = 32;

/**
 * Hook that listens for NFC badge scans via keyboard input.
 * NFC readers act as keyboard wedges - they type the badge serial number
 * followed by Enter. This hook captures that input and triggers check-in.
 */
export function useBadgeScanner() {
  const { currentScreen, setScreen, setCheckinResult, setWarningResult, setError } = useKioskStore();
  const bufferRef = useRef<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const config = getConfig();

  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const processBuffer = useCallback(async () => {
    const serialNumber = bufferRef.current.trim();
    clearBuffer();

    // Validate serial number length
    if (serialNumber.length < MIN_SERIAL_LENGTH || serialNumber.length > MAX_SERIAL_LENGTH) {
      return;
    }

    // Ignore if already processing or showing result
    if (currentScreen !== 'idle' && currentScreen !== 'event-selection') {
      return;
    }

    // Frontend debounce - prevent scanning during cooldown period
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTimeRef.current;
    if (timeSinceLastScan < config.scanCooldownMs) {
      const remainingMs = config.scanCooldownMs - timeSinceLastScan;
      setError({
        code: 'DUPLICATE_SCAN',
        message: 'Please wait',
        howToFix: `You can scan again in ${Math.ceil(remainingMs / 1000)} second${remainingMs > 1000 ? 's' : ''}.`,
      });
      return;
    }

    setScreen('scanning');

    try {
      const result = await scanBadge(serialNumber, config.kioskId);

      // Handle queued (offline) result
      if ('queued' in result) {
        const queuedResult = result as QueuedCheckinResult;
        setError({
          code: 'NETWORK_ERROR',
          message: queuedResult.message,
          howToFix: 'Your scan has been recorded and will sync when connection is restored.',
        });
        return;
      }

      // Success - check for warning flag (inactive member)
      lastScanTimeRef.current = Date.now();

      if ('warning' in result && result.warning) {
        setWarningResult({
          ...result,
          warning: result.warning,
        });
      } else {
        setCheckinResult(result);
      }
    } catch (error) {
      if (error instanceof Error) {
        // Parse API error response
        const apiError = error as { response?: { data?: { error?: { userMessage?: string; code?: string } } } };
        const errorCode = (apiError.response?.data?.error?.code || 'UNKNOWN') as KioskErrorCode;

        // User-friendly messages without status codes
        let message: string;
        let howToFix: string;

        switch (errorCode) {
          case 'BADGE_NOT_FOUND':
            message = 'Badge Not Recognized';
            howToFix = 'This badge is not registered in the system. Please visit Ship\'s Office to register.';
            break;
          case 'BADGE_NOT_ASSIGNED':
            message = 'Badge Not Assigned';
            howToFix = 'This badge is not assigned to anyone. Please visit Ship\'s Office for assistance.';
            break;
          case 'BADGE_INACTIVE':
            message = 'Badge Disabled';
            howToFix = 'This badge has been disabled. Please visit Ship\'s Office for assistance.';
            break;
          case 'DUPLICATE_SCAN':
            message = 'Please Wait';
            howToFix = 'Please wait a few seconds before scanning again.';
            break;
          default:
            message = 'Unable to Process';
            howToFix = 'Please try again or visit Ship\'s Office if the problem persists.';
        }

        setError({ code: errorCode, message, howToFix });
      } else {
        setError({
          code: 'UNKNOWN',
          message: 'An unexpected error occurred',
          howToFix: 'Please try again or visit Ship\'s Office for assistance.',
        });
      }
    }
  }, [currentScreen, setScreen, setCheckinResult, setWarningResult, setError, clearBuffer, config.kioskId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if focused on an input element (visitor form, etc.)
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // Enter key triggers processing
      if (event.key === 'Enter') {
        if (bufferRef.current.length >= MIN_SERIAL_LENGTH) {
          processBuffer();
        } else {
          clearBuffer();
        }
        return;
      }

      // Only capture alphanumeric and dash characters (typical NFC serial format)
      if (event.key.length === 1 && /[a-zA-Z0-9\-_]/.test(event.key)) {
        bufferRef.current += event.key;

        // Reset timeout - NFC readers send characters rapidly
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Auto-clear buffer if no more input after timeout
        timeoutRef.current = setTimeout(() => {
          clearBuffer();
        }, SCAN_TIMEOUT_MS);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [processBuffer, clearBuffer]);

  // Return a manual scan function for testing purposes
  return {
    simulateScan: (serialNumber: string) => {
      bufferRef.current = serialNumber;
      processBuffer();
    },
  };
}
