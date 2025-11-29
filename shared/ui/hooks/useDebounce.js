import { useState, useEffect } from 'react';
/**
 * Debounce hook for delaying value updates
 *
 * Useful for search inputs, filters, and other frequent value changes
 * that trigger expensive operations (API calls, re-renders, etc.)
 *
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 500);
 *
 * useEffect(() => {
 *   // API call only fires 500ms after user stops typing
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}
