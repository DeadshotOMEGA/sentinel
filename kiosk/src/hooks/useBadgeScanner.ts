import { useEffect, useRef, useCallback } from 'react';
import { useKioskStore } from '../state/kiosk-state';
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
  const { currentScreen, setScreen, setCheckinResult, setError } = useKioskStore();
  const bufferRef = useRef<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    setScreen('scanning');

    try {
      const result = await scanBadge(serialNumber, config.kioskId);

      // Handle queued (offline) result
      if ('queued' in result) {
        const queuedResult = result as QueuedCheckinResult;
        setError({
          message: queuedResult.message,
          howToFix: 'Your scan has been recorded and will sync when connection is restored.',
        });
        return;
      }

      // Success - show check-in/out result
      setCheckinResult(result);
    } catch (error) {
      if (error instanceof Error) {
        // Parse API error response
        const apiError = error as { response?: { data?: { error?: { userMessage?: string; code?: string } } } };
        const userMessage = apiError.response?.data?.error?.userMessage || error.message;
        const errorCode = apiError.response?.data?.error?.code;

        let howToFix: string | undefined;
        switch (errorCode) {
          case 'BADGE_NOT_FOUND':
            howToFix = 'This badge is not registered. Please see an administrator.';
            break;
          case 'BADGE_NOT_ASSIGNED':
            howToFix = 'This badge is not assigned to anyone. Please see an administrator.';
            break;
          case 'BADGE_INACTIVE':
            howToFix = 'This badge has been deactivated. Please see an administrator.';
            break;
          case 'DUPLICATE_SCAN':
            howToFix = 'Please wait a few seconds before scanning again.';
            break;
          default:
            howToFix = 'Please try again or contact an administrator if the problem persists.';
        }

        setError({ message: userMessage, howToFix });
      } else {
        setError({
          message: 'An unexpected error occurred',
          howToFix: 'Please try again or contact an administrator.',
        });
      }
    }
  }, [currentScreen, setScreen, setCheckinResult, setError, clearBuffer, config.kioskId]);

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
