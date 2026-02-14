/**
 * PharmaVerif - Hook useDebounce
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Retarde la mise a jour d'une valeur jusqu'a ce que l'utilisateur
 * arrete de la modifier pendant `delay` ms.
 *
 * Usage principal : debounce des champs de recherche pour eviter
 * de recalculer les filtres a chaque frappe.
 *
 * @example
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebounce(query, 300);
 * // debouncedQuery se met a jour 300ms apres la derniere frappe
 */

import { useState, useEffect } from 'react';

/**
 * Debounce une valeur reactive.
 * @param value - Valeur source (change a chaque frappe)
 * @param delay - Delai en ms avant propagation (defaut: 300)
 * @returns La valeur debouncee
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
