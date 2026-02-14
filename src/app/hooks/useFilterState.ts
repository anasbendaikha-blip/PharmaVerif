/**
 * PharmaVerif - Hook useFilterState
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Hook de gestion d'etat des filtres avec synchronisation URL :
 *  - Parse les filtres depuis l'URL au mount
 *  - Sync les filtres vers l'URL a chaque changement
 *  - Browser back/forward navigue dans l'historique des filtres
 *  - Debounce de la recherche texte (300ms)
 *  - Genere les chips de filtres actifs
 *  - Helpers : setFilter, clearAll, removeChip
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  InvoiceFilters,
  FilterChipData,
  StatusFilter,
  SortField,
  SortOrder,
} from '../types/filters';
import { DEFAULT_FILTERS } from '../types/filters';
import {
  filtersToSearchParams,
  searchParamsToFilters,
  generateFilterChips,
  removeFilterChip,
  countActiveFilters,
  hasActiveFilters as checkHasActive,
} from '../utils/filterUtils';
import { useDebounce } from './useDebounce';

// ========================================
// TYPES
// ========================================

interface UseFilterStateReturn {
  /** Etat complet des filtres */
  filters: InvoiceFilters;
  /** Valeur de recherche debouncee */
  debouncedSearch: string;
  /** Mettre a jour un filtre specifique */
  setFilter: <K extends keyof InvoiceFilters>(key: K, value: InvoiceFilters[K]) => void;
  /** Mettre a jour plusieurs filtres d'un coup */
  setFilters: (partial: Partial<InvoiceFilters>) => void;
  /** Reset tous les filtres */
  clearAll: () => void;
  /** Chips de filtres actifs */
  filterChips: FilterChipData[];
  /** Supprimer un chip de filtre */
  removeChip: (chip: FilterChipData) => void;
  /** Nombre de filtres actifs (hors search/sort) */
  activeCount: number;
  /** Y a-t-il des filtres actifs ? */
  hasActiveFilters: boolean;
}

interface UseFilterStateOptions {
  /** Delay du debounce sur search (defaut: 300ms) */
  debounceDelay?: number;
  /** Synchroniser avec l'URL ? (defaut: true) */
  syncUrl?: boolean;
}

// ========================================
// HOOK
// ========================================

export function useFilterState(
  options: UseFilterStateOptions = {}
): UseFilterStateReturn {
  const { debounceDelay = 300, syncUrl = true } = options;

  // URL state (only if syncUrl = true)
  const [searchParams, setSearchParams] = syncUrl
    ? useSearchParams() // eslint-disable-line react-hooks/rules-of-hooks
    : [new URLSearchParams(), () => {}] as const;

  // Parse initial filters from URL
  const initialFilters = useMemo(() => {
    if (!syncUrl) return DEFAULT_FILTERS;
    return searchParamsToFilters(searchParams as URLSearchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  const [filters, setFiltersState] = useState<InvoiceFilters>(initialFilters);

  // Debounce search
  const debouncedSearch = useDebounce(filters.search, debounceDelay);

  // Skip first URL sync to avoid overwriting URL on mount
  const isFirstRender = useRef(true);

  // Sync filters → URL (skip first render)
  useEffect(() => {
    if (!syncUrl) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const params = filtersToSearchParams(filters);
    (setSearchParams as (params: URLSearchParams, opts?: { replace: boolean }) => void)(
      params,
      { replace: true }
    );
  }, [filters, syncUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for URL changes (browser back/forward)
  useEffect(() => {
    if (!syncUrl) return;
    const urlFilters = searchParamsToFilters(searchParams as URLSearchParams);
    // Only update if URL actually changed (avoid loop)
    const currentParams = filtersToSearchParams(filters).toString();
    const urlParams = (searchParams as URLSearchParams).toString();
    if (currentParams !== urlParams && !isFirstRender.current) {
      setFiltersState(urlFilters);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Setters ----

  const setFilter = useCallback(<K extends keyof InvoiceFilters>(
    key: K,
    value: InvoiceFilters[K]
  ) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((partial: Partial<InvoiceFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearAll = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // ---- Chips ----

  const filterChips = useMemo(() => generateFilterChips(filters), [filters]);

  const removeChip = useCallback((chip: FilterChipData) => {
    setFiltersState((prev) => removeFilterChip(prev, chip));
  }, []);

  // ---- Counts ----

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);
  const hasActiveFilters = useMemo(() => checkHasActive(filters), [filters]);

  return {
    filters,
    debouncedSearch,
    setFilter,
    setFilters,
    clearAll,
    filterChips,
    removeChip,
    activeCount,
    hasActiveFilters,
  };
}
