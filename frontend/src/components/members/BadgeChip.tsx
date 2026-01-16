import { Chip, Tooltip } from '@heroui/react';
import { getBadgeStatusChipVariant } from '../../lib/chipVariants';

interface BadgeChipProps {
  badge?: {
    serialNumber: string;
    status: 'active' | 'disabled' | 'lost' | 'returned';
  };
}

const getBadgeColor = (status: 'active' | 'disabled' | 'lost' | 'returned'): 'success' | 'secondary' | 'warning' | 'danger' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'disabled':
      return 'danger';
    case 'lost':
      return 'warning';
    case 'returned':
      return 'secondary';
  }
};

export default function BadgeChip({ badge }: BadgeChipProps) {
  if (!badge) {
    return null;
  }

  const color = getBadgeColor(badge.status);
  const tooltipContent = `${badge.serialNumber} (${badge.status})`;

  return (
    <Tooltip content={tooltipContent}>
      <Chip size="sm" variant={getBadgeStatusChipVariant()} color={color}>
        Badge
      </Chip>
    </Tooltip>
  );
}
