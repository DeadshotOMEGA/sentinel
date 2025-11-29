import { Component, ReactNode, ErrorInfo } from 'react';
import { ErrorFallback, ErrorFallbackVariant } from './ErrorFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
  variant: ErrorFallbackVariant;
  /**
   * Optional custom fallback component
   */
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  /**
   * Optional error handler for logging/reporting
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component for catching React errors and displaying fallback UI
 *
 * Class component required by React's error boundary API.
 * Catches errors in child component tree and prevents app crash.
 *
 * Features:
 * - Logs errors to console
 * - Optional custom error handler for reporting
 * - Reset functionality to retry
 * - Auto-refresh for TV display variant
 * - Variant-specific error messages
 *
 * @example
 * ```tsx
 * import { ErrorBoundary } from '@sentinel/ui';
 *
 * // Wrap your app
 * <ErrorBoundary variant="admin">
 *   <App />
 * </ErrorBoundary>
 *
 * // With custom error handler
 * <ErrorBoundary
 *   variant="kiosk"
 *   onError={(error, errorInfo) => {
 *     // Send to error tracking service
 *     errorTracker.log(error, errorInfo);
 *   }}
 * >
 *   <KioskApp />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private autoRefreshTimer: NodeJS.Timeout | null = null;

  // Legacy refs property required by React.Component type
  refs: Record<string, never> = {};

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details to console
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-refresh for TV display after 5 seconds
    if (this.props.variant === 'tv') {
      this.autoRefreshTimer = setTimeout(() => {
        window.location.reload();
      }, 5000);
    }
  }

  componentWillUnmount(): void {
    // Clean up timer if component unmounts
    if (this.autoRefreshTimer) {
      clearTimeout(this.autoRefreshTimer);
    }
  }

  resetError = (): void => {
    // Clear any auto-refresh timer
    if (this.autoRefreshTimer) {
      clearTimeout(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }

    // Reset error state to retry
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return (
        <ErrorFallback
          variant={this.props.variant}
          message={this.state.error.message}
          onRetry={this.resetError}
        />
      );
    }

    // No error - render children normally
    return this.props.children;
  }
}
