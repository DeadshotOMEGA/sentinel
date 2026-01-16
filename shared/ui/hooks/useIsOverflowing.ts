import { useState, useEffect, type RefObject } from 'react';

/**
 * Hook to detect if an element's content is overflowing (truncated).
 * Uses ResizeObserver to update when the element or its container changes size.
 *
 * @param ref - Reference to the HTML element to check for overflow
 * @returns true if the element's content is overflowing, false otherwise
 *
 * @example
 * ```tsx
 * const textRef = useRef<HTMLSpanElement>(null);
 * const isOverflowing = useIsOverflowing(textRef);
 *
 * return (
 *   <span ref={textRef} className="truncate">
 *     {longText}
 *   </span>
 *   {isOverflowing && <Tooltip content={longText} />}
 * );
 * ```
 */
export function useIsOverflowing(ref: RefObject<HTMLElement | null>): boolean {
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const checkOverflow = () => {
      const hasOverflow = element.scrollWidth > element.clientWidth;
      setIsOverflowing(hasOverflow);
    };

    // Check immediately
    checkOverflow();

    // Watch for size changes
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(element);

    // Also watch parent in case container resizes
    if (element.parentElement) {
      resizeObserver.observe(element.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return isOverflowing;
}
