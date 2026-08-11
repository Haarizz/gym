import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages Community feed search and type-filter state.
 *
 * - `searchInput`     – the live value bound to the SearchBar TextInput.
 * - `debouncedQuery`  – the value passed to useCommunityFeed({ q: ... }).
 *   Debounced 300 ms so the app doesn't issue a request on every keystroke.
 * - `selectedType`    – the active post-type filter (undefined = all).
 */
export function useCommunityFilters() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchInput(text);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim() || '');
    }, 300);
  }, []);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    searchInput,
    setSearchInput: handleSearchChange,
    debouncedQuery,
    selectedType,
    setSelectedType,
  };
}
