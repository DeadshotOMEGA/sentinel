import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { extendVariants, Card } from '@heroui/react';

type ClockSize = 'default' | 'large' | 'tv';

const ClockCard = extendVariants(Card, {
  variants: {
    size: {
      default: {
        base: 'p-4',
      },
      large: {
        base: 'p-6',
      },
      tv: {
        base: 'p-8',
      },
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const sizeClasses: Record<ClockSize, { time: string; date: string }> = {
  default: {
    time: 'text-4xl',
    date: 'text-base',
  },
  large: {
    time: 'text-6xl',
    date: 'text-lg',
  },
  tv: {
    time: 'text-8xl',
    date: 'text-xl',
  },
};

interface ClockProps {
  /** Size variant for the clock display */
  size?: ClockSize;
  /** Whether to show in a card container (default: false for backward compatibility) */
  showCard?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Real-time clock display with configurable size variants.
 * Updates every second showing time and date.
 *
 * @example
 * // Simple inline clock (tv-display style)
 * <Clock size="tv" />
 *
 * // Clock in a card container
 * <Clock size="large" showCard />
 */
export function Clock({ size = 'tv', showCard = false, className }: ClockProps) {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeString = format(time, 'HH:mm:ss');
  const dateString = format(time, 'EEEE, MMMM dd, yyyy');
  const classes = sizeClasses[size];

  const content = (
    <div
      className={`flex flex-col items-end gap-2 ${className ?? ''}`}
      role="timer"
      aria-label="Current time and date"
      aria-live="off"
    >
      <time
        className={`font-mono ${classes.time} font-bold text-foreground leading-none`}
        dateTime={time.toISOString()}
      >
        {timeString}
      </time>
      <time
        className={`${classes.date} text-foreground-500 font-medium`}
        dateTime={time.toISOString().split('T')[0]}
      >
        {dateString}
      </time>
    </div>
  );

  if (showCard) {
    return <ClockCard size={size}>{content}</ClockCard>;
  }

  return content;
}
