import { useState, useEffect, type RefObject } from 'react';

/**
 * Hook to detect if an element's content is overflowing (truncated).
 * Uses ResizeObserver to update when the element or its container changes size.
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
