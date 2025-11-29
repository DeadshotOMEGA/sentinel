import { AlertTriangle, RefreshCw } from '../icons';

export type ErrorFallbackVariant = 'admin' | 'kiosk' | 'tv';

interface ErrorFallbackProps {
  variant: ErrorFallbackVariant;
  message: string;
  onRetry: () => void;
}

/**
 * Error messages tailored per app context
 */
const DEFAULT_MESSAGES: Record<ErrorFallbackVariant, string> = {
  admin: 'Something went wrong. Please try again or contact support.',
  kiosk: 'Oops! Something went wrong. Tap below to try again.',
  tv: 'Display error. Refreshing automatically...',
} as const;

/**
 * ErrorFallback component for displaying error states with retry functionality
 *
 * Follows WCAG AA accessibility guidelines:
 * - High contrast error colors
 * - Clear error messaging
 * - Focusable retry button with keyboard support
 * - Large touch targets for kiosk (56px)
 * - Wall display optimized for TV
 *
 * @example
 * ```tsx
 * import { ErrorFallback } from '@sentinel/ui';
 *
 * <ErrorFallback
 *   variant="admin"
 *   message="Something went wrong"
 *   onRetry={() => window.location.reload()}
 * />
 * ```
 */
export function ErrorFallback({
  variant,
  message,
  onRetry,
}: ErrorFallbackProps) {
  const displayMessage = message || DEFAULT_MESSAGES[variant];

  // Variant-specific styling
  const containerClasses = {
    admin: 'min-h-screen bg-gray-50',
    kiosk: 'kiosk-mode min-h-screen bg-gray-100',
    tv: 'tv-mode min-h-screen bg-red-50',
  };

  const iconSizes = {
    admin: 64,
    kiosk: 96,
    tv: 128,
  };

  const textSizes = {
    admin: 'text-2xl',
    kiosk: 'text-4xl',
    tv: 'text-5xl',
  };

  const buttonClasses = {
    admin: 'px-6 py-3 text-base',
    kiosk: 'px-12 py-6 text-2xl min-h-[56px] min-w-[200px]',
    tv: 'px-16 py-8 text-3xl',
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`${containerClasses[variant]} flex flex-col items-center justify-center px-4`}
    >
      {/* Error icon */}
      <AlertTriangle
        size={iconSizes[variant]}
        className="text-red-600 mb-6"
        aria-hidden="true"
        focusable={false}
      />

      {/* Error heading */}
      <h1 className={`${textSizes[variant]} font-bold text-gray-900 mb-4 text-center max-w-2xl`}>
        {variant === 'tv' ? 'Display Error' : 'Error'}
      </h1>

      {/* Error message */}
      <p className="text-lg text-gray-700 text-center max-w-xl mb-8">
        {displayMessage}
      </p>

      {/* Retry button - hidden for TV as it auto-refreshes */}
      {variant !== 'tv' && (
        <button
          onClick={onRetry}
          className={`${buttonClasses[variant]} bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors flex items-center gap-3`}
          type="button"
        >
          <RefreshCw size={variant === 'kiosk' ? 32 : 20} aria-hidden="true" />
          {variant === 'kiosk' ? 'Try Again' : 'Retry'}
        </button>
      )}

      {/* TV auto-refresh indicator */}
      {variant === 'tv' && (
        <div className="text-xl text-gray-600 mt-4 animate-pulse">
          Refreshing in a moment...
        </div>
      )}
    </div>
  );
}
