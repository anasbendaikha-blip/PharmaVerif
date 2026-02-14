/**
 * PharmaVerif - Types pour le systeme de Recherche & Filtres
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Types generiques pour les filtres factures,
 * les chips, le tri et les recherches sauvegardees.
 */

// ========================================
// INVOICE FILTERS
// ========================================

export type StatusFilter = 'all' | 'conforme' | 'anomalie' | 'critique';
export type SortField = 'date' | 'montant' | 'fournisseur';
export type SortOrder = 'asc' | 'desc';

export interface InvoiceFilters {
  /** Texte de recherche (fournisseur, numero, CIP) */
  search: string;
  /** Filtre par statut */
  status: StatusFilter;
  /** Fournisseurs selectionnes (multi-select) */
  fournisseurs: string[];
  /** Montant minimum */
  montantMin?: number;
  /** Montant maximum */
  montantMax?: number;
  /** Date de debut (ISO format) */
  dateDebut?: string;
  /** Date de fin (ISO format) */
  dateFin?: string;
  /** Champ de tri */
  sortBy: SortField;
  /** Ordre de tri */
  sortOrder: SortOrder;
}

// ========================================
// FILTER CHIPS
// ========================================

export interface FilterChipData {
  /** Identifiant unique du chip */
  id: string;
  /** Label affiche */
  label: string;
  /** Cle de filtre a reset quand on supprime le chip */
  filterKey: string;
  /** Valeur specifique (pour multi-select) */
  value?: string;
}

// ========================================
// SAVED SEARCHES
// ========================================

export interface SavedSearch {
  /** ID unique (timestamp) */
  id: number;
  /** Nom de la recherche */
  name: string;
  /** Filtres sauvegardes */
  filters: InvoiceFilters;
  /** Date de creation */
  createdAt: string;
}

// ========================================
// DEFAULTS
// ========================================

export const DEFAULT_FILTERS: InvoiceFilters = {
  search: '',
  status: 'all',
  fournisseurs: [],
  montantMin: undefined,
  montantMax: undefined,
  dateDebut: undefined,
  dateFin: undefined,
  sortBy: 'date',
  sortOrder: 'desc',
};

// ========================================
// QUICK DATE PRESETS
// ========================================

export interface DatePreset {
  label: string;
  getRange: () => { dateDebut: string; dateFin: string };
}

export const DATE_PRESETS: DatePreset[] = [
  {
    label: 'Ce mois',
    getRange: () => {
      const now = new Date();
      return {
        dateDebut: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        dateFin: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      };
    },
  },
  {
    label: '30 derniers jours',
    getRange: () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return {
        dateDebut: thirtyDaysAgo.toISOString().split('T')[0],
        dateFin: now.toISOString().split('T')[0],
      };
    },
  },
  {
    label: '3 derniers mois',
    getRange: () => {
      const now = new Date();
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      return {
        dateDebut: threeMonthsAgo.toISOString().split('T')[0],
        dateFin: now.toISOString().split('T')[0],
      };
    },
  },
  {
    label: 'Cette année',
    getRange: () => {
      const now = new Date();
      return {
        dateDebut: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
        dateFin: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0],
      };
    },
  },
];

// ========================================
// SORT OPTIONS
// ========================================

export const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: 'date', label: 'Date' },
  { value: 'montant', label: 'Montant' },
  { value: 'fournisseur', label: 'Fournisseur' },
];

// ========================================
// STATUS OPTIONS
// ========================================

export const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string; color?: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'conforme', label: 'Conformes', color: 'green' },
  { value: 'anomalie', label: 'Anomalies', color: 'orange' },
  { value: 'critique', label: 'Critiques', color: 'red' },
];
