import { Chip, Tooltip } from '@heroui/react';

interface BadgeChipProps {
  badge?: {
    serialNumber: string;
    status: 'active' | 'inactive' | 'lost' | 'damaged';
  };
}

const getBadgeColor = (status: 'active' | 'inactive' | 'lost' | 'damaged'): 'success' | 'default' | 'warning' | 'danger' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'default';
    case 'lost':
      return 'warning';
    case 'damaged':
      return 'danger';
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
      <Chip size="sm" variant="flat" color={color}>
        Badge
      </Chip>
    </Tooltip>
  );
}
