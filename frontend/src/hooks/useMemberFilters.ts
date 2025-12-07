import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

export interface MemberFilters {
  mess: string[];
  moc: string[];
  division: string[];
  contract: string[];
  tags: string[];
  excludeTags: string[];
}

interface UseMemberFiltersReturn {
  filters: MemberFilters;
  setMessFilter: (values: string[]) => void;
  setMocFilter: (values: string[]) => void;
  setDivisionFilter: (values: string[]) => void;
  setContractFilter: (values: string[]) => void;
  setTagsFilter: (values: string[]) => void;
  setExcludeTagsFilter: (values: string[]) => void;
  clearFilters: () => void;
  buildApiParams: () => URLSearchParams;
}

/**
 * Hook for managing member filter state with URL persistence
 * Supports multi-select filters for mess, moc, division, contract, tags
 * Supports negative filtering (excludeTags)
 */
export function useMemberFilters(): UseMemberFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL query params
  const filters = useMemo<MemberFilters>(() => {
    return {
      mess: searchParams.getAll('mess'),
      moc: searchParams.getAll('moc'),
      division: searchParams.getAll('division'),
      contract: searchParams.getAll('contract'),
      tags: searchParams.getAll('tags'),
      excludeTags: searchParams.getAll('excludeTags'),
    };
  }, [searchParams]);

  // Generic setter for any filter type
  const setFilter = useCallback(
    (key: keyof MemberFilters, values: string[]) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        // Remove all existing values for this key
        newParams.delete(key);
        // Add new values
        values.forEach((value) => {
          if (value) {
            newParams.append(key, value);
          }
        });
        return newParams;
      });
    },
    [setSearchParams]
  );

  const setMessFilter = useCallback(
    (values: string[]) => setFilter('mess', values),
    [setFilter]
  );

  const setMocFilter = useCallback(
    (values: string[]) => setFilter('moc', values),
    [setFilter]
  );

  const setDivisionFilter = useCallback(
    (values: string[]) => setFilter('division', values),
    [setFilter]
  );

  const setContractFilter = useCallback(
    (values: string[]) => setFilter('contract', values),
    [setFilter]
  );

  const setTagsFilter = useCallback(
    (values: string[]) => setFilter('tags', values),
    [setFilter]
  );

  const setExcludeTagsFilter = useCallback(
    (values: string[]) => setFilter('excludeTags', values),
    [setFilter]
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Build API query params from filter state
  const buildApiParams = useCallback(() => {
    const params = new URLSearchParams();

    filters.mess.forEach((value) => params.append('mess', value));
    filters.moc.forEach((value) => params.append('moc', value));
    filters.division.forEach((value) => params.append('division', value));
    filters.contract.forEach((value) => params.append('contract', value));
    filters.tags.forEach((value) => params.append('tags', value));
    filters.excludeTags.forEach((value) => params.append('excludeTags', value));

    return params;
  }, [filters]);

  return {
    filters,
    setMessFilter,
    setMocFilter,
    setDivisionFilter,
    setContractFilter,
    setTagsFilter,
    setExcludeTagsFilter,
    clearFilters,
    buildApiParams,
  };
}
