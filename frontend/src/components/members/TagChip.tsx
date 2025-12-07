import { Chip } from '@heroui/react';
import { getTagColor } from '../../lib/tagColors';

interface TagChipProps {
  tagName: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'flat' | 'bordered' | 'light' | 'faded' | 'shadow' | 'dot';
}

export default function TagChip({ tagName, size = 'sm', variant = 'flat' }: TagChipProps) {
  const color = getTagColor(tagName);

  return (
    <Chip size={size} variant={variant} color={color}>
      {tagName}
    </Chip>
  );
}
