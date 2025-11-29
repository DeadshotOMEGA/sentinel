import { Anchor } from 'lucide-react';
import { clsx } from 'clsx';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';
export type LogoVariant = 'light' | 'dark';

export interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  showIcon?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: {
    icon: 'h-5 w-5',
    text: 'text-lg',
    gap: 'gap-2',
  },
  md: {
    icon: 'h-6 w-6',
    text: 'text-xl',
    gap: 'gap-2',
  },
  lg: {
    icon: 'h-8 w-8',
    text: 'text-3xl',
    gap: 'gap-3',
  },
  xl: {
    icon: 'h-12 w-12',
    text: 'text-5xl',
    gap: 'gap-4',
  },
} as const;

const variantConfig = {
  light: 'text-primary',
  dark: 'text-white',
} as const;

/**
 * Sentinel Logo Component
 *
 * Text-based logo with optional ship anchor icon for HMCS Chippawa branding.
 *
 * @param size - Size variant: sm (sidebar), md (default), lg (headers), xl (kiosk)
 * @param variant - Color variant: light (primary blue), dark (white)
 * @param showIcon - Display anchor icon alongside text (default: true)
 * @param className - Additional CSS classes
 */
export function Logo({
  size = 'md',
  variant = 'light',
  showIcon = true,
  className,
}: LogoProps) {
  const sizeStyles = sizeConfig[size];
  const colorStyles = variantConfig[variant];

  return (
    <div className={clsx('flex items-center', sizeStyles.gap, className)}>
      {showIcon && (
        <Anchor
          className={clsx(sizeStyles.icon, colorStyles)}
          aria-hidden="true"
          strokeWidth={2.5}
        />
      )}
      <span
        className={clsx(
          'font-bold tracking-wide',
          sizeStyles.text,
          colorStyles
        )}
      >
        SENTINEL
      </span>
    </div>
  );
}
