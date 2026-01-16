import type { ReactNode, ComponentProps } from 'react';
import { Tooltip } from '@heroui/react';

type TooltipColor = ComponentProps<typeof Tooltip>['color'];
type TooltipPlacement = ComponentProps<typeof Tooltip>['placement'];

type StatusSeverity = 'danger' | 'warning' | 'default';

interface StatusTooltipProps {
  /** Semantic severity that determines tooltip color */
  severity: StatusSeverity;
  /** Bold title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** The status indicator element to wrap */
  children: ReactNode;
  /** Tooltip placement (default: top) */
  placement?: TooltipPlacement;
}

const severityToColor: Record<StatusSeverity, TooltipColor> = {
  danger: 'danger',
  warning: 'warning',
  default: 'default',
};

/**
 * Tooltip for status indicators with semantic colors and rich content.
 * Uses danger/warning colors only for actual alerts, default otherwise.
 *
 * @example
 * <StatusTooltip
 *   severity="warning"
 *   title="Security Alert"
 *   description="Badge reported lost on 2024-01-15"
 * >
 *   <Icon icon="mdi:alert" className="text-warning" />
 * </StatusTooltip>
 */
export function StatusTooltip({
  severity,
  title,
  description,
  children,
  placement = 'top',
}: StatusTooltipProps) {
  return (
    <Tooltip
      color={severityToColor[severity]}
      placement={placement}
      content={
        <div className="px-1 py-2">
          <div className="text-small font-bold">{title}</div>
          {description && <div className="text-tiny">{description}</div>}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
