import type { ReactNode, ComponentProps } from 'react';
import { Tooltip } from '@heroui/react';

type TooltipPlacement = ComponentProps<typeof Tooltip>['placement'];

interface IconTooltipProps {
  /** Simple text label for the icon */
  content: string;
  /** The icon element to wrap */
  children: ReactNode;
  /** Tooltip placement (default: bottom) */
  placement?: TooltipPlacement;
  /** Additional class names for the wrapper */
  className?: string;
}

/**
 * Simple tooltip wrapper for icon buttons.
 * Provides a consistent label tooltip for icons.
 *
 * @example
 * <IconTooltip content="Settings">
 *   <Button isIconOnly variant="light">
 *     <Icon icon="solar:settings-linear" />
 *   </Button>
 * </IconTooltip>
 */
export function IconTooltip({
  content,
  children,
  placement = 'bottom',
  className,
}: IconTooltipProps) {
  return (
    <Tooltip content={content} placement={placement} className={className}>
      {children}
    </Tooltip>
  );
}
