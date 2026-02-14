/**
 * PharmaVerif - Utilitaires de filtrage
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Fonctions pures pour :
 *  - Serialiser/deserialiser les filtres vers/depuis URL params
 *  - Generer les chips de filtres actifs
 *  - Compter les filtres actifs
 *  - Extraire les fournisseurs uniques
 */

import type {
  InvoiceFilters,
  FilterChipData,
  StatusFilter,
  SortField,
  SortOrder,
} from '../types/filters';
import { DEFAULT_FILTERS } from '../types/filters';
import { formatCurrency, formatDateShortFR } from './formatNumber';

// ========================================
// URL SERIALIZATION
// ========================================

/**
 * Serialise les filtres actifs vers URLSearchParams.
 * N'ecrit que les valeurs non-default (URL propre).
 */
export function filtersToSearchParams(filters: InvoiceFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set('q', filters.search);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.fournisseurs.length > 0) {
    filters.fournisseurs.forEach((f) => params.append('fournisseur', f));
  }
  if (filters.montantMin !== undefined) params.set('min', String(filters.montantMin));
  if (filters.montantMax !== undefined) params.set('max', String(filters.montantMax));
  if (filters.dateDebut) params.set('from', filters.dateDebut);
  if (filters.dateFin) params.set('to', filters.dateFin);
  if (filters.sortBy !== 'date') params.set('sort', filters.sortBy);
  if (filters.sortOrder !== 'desc') params.set('order', filters.sortOrder);

  return params;
}

/**
 * Deserialise URLSearchParams vers InvoiceFilters.
 * Applique les defaults pour les valeurs manquantes.
 */
export function searchParamsToFilters(params: URLSearchParams): InvoiceFilters {
  return {
    search: params.get('q') || '',
    status: (params.get('status') as StatusFilter) || 'all',
    fournisseurs: params.getAll('fournisseur'),
    montantMin: params.has('min') ? Number(params.get('min')) : undefined,
    montantMax: params.has('max') ? Number(params.get('max')) : undefined,
    dateDebut: params.get('from') || undefined,
    dateFin: params.get('to') || undefined,
    sortBy: (params.get('sort') as SortField) || 'date',
    sortOrder: (params.get('order') as SortOrder) || 'desc',
  };
}

// ========================================
// FILTER CHIPS GENERATION
// ========================================

/**
 * Genere la liste des chips pour les filtres actifs.
 */
export function generateFilterChips(filters: InvoiceFilters): FilterChipData[] {
  const chips: FilterChipData[] = [];

  if (filters.status !== 'all') {
    const statusLabels: Record<string, string> = {
      conforme: 'Conformes',
      anomalie: 'Anomalies',
      critique: 'Critiques',
    };
    chips.push({
      id: 'status',
      label: `Statut : ${statusLabels[filters.status] || filters.status}`,
      filterKey: 'status',
    });
  }

  filters.fournisseurs.forEach((f, i) => {
    chips.push({
      id: `fournisseur-${i}`,
      label: f,
      filterKey: 'fournisseurs',
      value: f,
    });
  });

  if (filters.montantMin !== undefined || filters.montantMax !== undefined) {
    let label: string;
    if (filters.montantMin !== undefined && filters.montantMax !== undefined) {
      label = `${formatCurrency(filters.montantMin)} — ${formatCurrency(filters.montantMax)}`;
    } else if (filters.montantMin !== undefined) {
      label = `\u2265 ${formatCurrency(filters.montantMin)}`;
    } else {
      label = `\u2264 ${formatCurrency(filters.montantMax!)}`;
    }
    chips.push({
      id: 'montant',
      label,
      filterKey: 'montant',
    });
  }

  if (filters.dateDebut || filters.dateFin) {
    let label: string;
    if (filters.dateDebut && filters.dateFin) {
      label = `${formatDateShortFR(filters.dateDebut)} — ${formatDateShortFR(filters.dateFin)}`;
    } else if (filters.dateDebut) {
      label = `Depuis ${formatDateShortFR(filters.dateDebut)}`;
    } else {
      label = `Jusqu'au ${formatDateShortFR(filters.dateFin!)}`;
    }
    chips.push({
      id: 'date',
      label,
      filterKey: 'date',
    });
  }

  return chips;
}

// ========================================
// FILTER REMOVAL
// ========================================

/**
 * Supprime un filtre specifique a partir d'un chip.
 * Retourne une copie du filtre mise a jour.
 */
export function removeFilterChip(
  filters: InvoiceFilters,
  chip: FilterChipData
): InvoiceFilters {
  const updated = { ...filters };

  switch (chip.filterKey) {
    case 'status':
      updated.status = 'all';
      break;
    case 'fournisseurs':
      updated.fournisseurs = filters.fournisseurs.filter((f) => f !== chip.value);
      break;
    case 'montant':
      updated.montantMin = undefined;
      updated.montantMax = undefined;
      break;
    case 'date':
      updated.dateDebut = undefined;
      updated.dateFin = undefined;
      break;
    default:
      break;
  }

  return updated;
}

// ========================================
// COUNTING
// ========================================

/**
 * Compte le nombre de filtres actifs (hors search et sort).
 */
export function countActiveFilters(filters: InvoiceFilters): number {
  let count = 0;
  if (filters.status !== 'all') count++;
  count += filters.fournisseurs.length;
  if (filters.montantMin !== undefined) count++;
  if (filters.montantMax !== undefined) count++;
  if (filters.dateDebut) count++;
  if (filters.dateFin) count++;
  return count;
}

/**
 * Verifie si des filtres sont actifs (y compris search).
 */
export function hasActiveFilters(filters: InvoiceFilters): boolean {
  return (
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.fournisseurs.length > 0 ||
    filters.montantMin !== undefined ||
    filters.montantMax !== undefined ||
    filters.dateDebut !== undefined ||
    filters.dateFin !== undefined
  );
}

// ========================================
// SAVED SEARCHES
// ========================================

const SAVED_SEARCHES_KEY = 'pharmaverif_saved_searches';

/**
 * Charge les recherches sauvegardees depuis localStorage.
 */
export function loadSavedSearches(): Array<{
  id: number;
  name: string;
  filters: InvoiceFilters;
  createdAt: string;
}> {
  try {
    const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Sauvegarde une recherche.
 */
export function saveSearch(
  name: string,
  filters: InvoiceFilters
): void {
  const searches = loadSavedSearches();
  searches.push({
    id: Date.now(),
    name,
    filters,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
}

/**
 * Supprime une recherche sauvegardee.
 */
export function deleteSavedSearch(id: number): void {
  const searches = loadSavedSearches().filter((s) => s.id !== id);
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
}

// ========================================
// UNIQUE FOURNISSEURS
// ========================================

/**
 * Extrait les noms de fournisseurs uniques d'une liste de factures.
 */
export function getUniqueFournisseurs(
  factures: Array<{
    fournisseur?: { nom: string } | null;
    grossiste?: { nom: string } | null;
  }>
): string[] {
  const names = new Set<string>();
  factures.forEach((f) => {
    const name = f.fournisseur?.nom || f.grossiste?.nom;
    if (name) names.add(name);
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'));
}
