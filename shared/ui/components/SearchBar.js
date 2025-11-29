import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { Input } from '@heroui/react';
import { Search, X } from '../icons';
import { useDebounce } from '../hooks/useDebounce';
/**
 * SearchBar component with debounced input and clear button
 *
 * Features:
 * - Debounced search (default 300ms) to reduce API calls
 * - Clear button when input has value
 * - Search icon visual indicator
 * - Optional Cmd/Ctrl+K keyboard shortcut
 * - Full keyboard accessibility
 * - ARIA live region support (for screen readers)
 *
 * Follows WCAG AA accessibility guidelines:
 * - Clear button has descriptive aria-label
 * - Input has proper aria-label
 * - Focus states visible
 * - Keyboard navigable
 *
 * @example
 * ```tsx
 * import { SearchBar } from '@sentinel/ui';
 *
 * function MembersList() {
 *   const [search, setSearch] = useState('');
 *
 *   return (
 *     <SearchBar
 *       value={search}
 *       onChange={setSearch}
 *       placeholder="Search members..."
 *       aria-label="Search members"
 *     />
 *   );
 * }
 * ```
 */
export function SearchBar({ value, onChange, placeholder = 'Search...', debounceMs = 300, className = '', 'aria-label': ariaLabel = 'Search', enableShortcut = false, }) {
    const [localValue, setLocalValue] = useState(value);
    const debouncedValue = useDebounce(localValue, debounceMs);
    const inputRef = useRef(null);
    // Sync debounced value to parent
    useEffect(() => {
        onChange(debouncedValue);
    }, [debouncedValue, onChange]);
    // Sync external value changes to local state
    useEffect(() => {
        setLocalValue(value);
    }, [value]);
    // Keyboard shortcut: Cmd/Ctrl+K to focus
    useEffect(() => {
        if (!enableShortcut)
            return;
        function handleKeyDown(event) {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                inputRef.current?.focus();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enableShortcut]);
    function handleClear() {
        setLocalValue('');
        onChange('');
        inputRef.current?.focus();
    }
    return (_jsx(Input, { ref: inputRef, type: "text", value: localValue, onChange: (e) => setLocalValue(e.target.value), placeholder: placeholder, "aria-label": ariaLabel, className: className, startContent: _jsx(Search, { size: 18, className: "text-default-400 pointer-events-none flex-shrink-0", "aria-hidden": "true", focusable: false }), endContent: localValue && (_jsx("button", { type: "button", onClick: handleClear, "aria-label": "Clear search", className: "text-default-400 hover:text-default-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full p-0.5", children: _jsx(X, { size: 16, "aria-hidden": "true", focusable: false }) })), isClearable: false, classNames: {
            input: 'text-base',
            inputWrapper: 'h-12 pr-1',
        } }));
}
