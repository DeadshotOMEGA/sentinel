import { useRef, type ReactNode, type ComponentProps } from 'react';
import { Tooltip } from '@heroui/react';
import { useIsOverflowing } from '../../hooks/useIsOverflowing';

type TooltipProps = ComponentProps<typeof Tooltip>;

interface TruncatedTextProps {
  /** The full text content to display and show in tooltip when truncated */
  content: string;
  /** Additional class names for the text element */
  className?: string;
  /** HTML element to render (default: span) */
  as?: 'span' | 'p' | 'div';
  /** Override tooltip props when needed */
  tooltipProps?: Partial<Omit<TooltipProps, 'content' | 'children'>>;
  /** Custom tooltip content (defaults to the content string) */
  tooltipContent?: ReactNode;
}

/**
 * Renders text that shows a tooltip only when the text is actually truncated.
 * Uses ResizeObserver to detect overflow dynamically.
 *
 * @example
 * <TruncatedText content={person.name} className="truncate w-32" />
 */
export function TruncatedText({
  content,
  className = '',
  as: Element = 'span',
  tooltipProps,
  tooltipContent,
}: TruncatedTextProps) {
  const textRef = useRef<HTMLElement>(null);
  const isOverflowing = useIsOverflowing(textRef);

  const textElement = (
    <Element
      ref={textRef as React.RefObject<HTMLSpanElement & HTMLParagraphElement & HTMLDivElement>}
      className={className}
    >
      {content}
    </Element>
  );

  if (!isOverflowing) {
    return textElement;
  }

  return (
    <Tooltip content={tooltipContent ?? content} {...tooltipProps}>
      {textElement}
    </Tooltip>
  );
}
