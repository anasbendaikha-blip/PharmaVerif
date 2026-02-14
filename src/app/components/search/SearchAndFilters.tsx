/**
 * PharmaVerif - SearchAndFilters Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Composant principal de recherche et filtres :
 *  - Barre de recherche avec debounce
 *  - Bouton toggle filtres avances (avec badge count)
 *  - Panneau filtres avances (collapsible)
 *  - Chips de filtres actifs + Clear all
 *  - Compteur de resultats
 *  - Dropdown de tri
 *  - URL sync (partage lien)
 *
 * Usage :
 *   <SearchAndFilters
 *     filters={filters}
 *     onFiltersChange={setFilters}
 *     filterChips={chips}
 *     onRemoveChip={removeChip}
 *     hasActiveFilters={hasActive}
 *     activeCount={count}
 *     onClearAll={clearAll}
 *     resultCount={filtered.length}
 *     totalCount={all.length}
 *     availableFournisseurs={fournisseurs}
 *   />
 */

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { cn } from '../ui/utils';
import type { InvoiceFilters, FilterChipData } from '../../types/filters';
import { AdvancedFiltersPanel } from './AdvancedFiltersPanel';
import { FilterChip } from './FilterChip';
import { SortDropdown } from './SortDropdown';

// ========================================
// TYPES
// ========================================

interface SearchAndFiltersProps {
  /** Etat complet des filtres */
  filters: InvoiceFilters;
  /** Callback pour mettre a jour les filtres (partial) */
  onFiltersChange: (partial: Partial<InvoiceFilters>) => void;
  /** Chips de filtres actifs */
  filterChips: FilterChipData[];
  /** Callback pour supprimer un chip */
  onRemoveChip: (chip: FilterChipData) => void;
  /** Y a-t-il des filtres actifs ? */
  hasActiveFilters: boolean;
  /** Nombre de filtres actifs (hors search) */
  activeCount: number;
  /** Reset tous les filtres */
  onClearAll: () => void;
  /** Nombre de resultats filtres */
  resultCount: number;
  /** Nombre total de factures */
  totalCount: number;
  /** Liste des fournisseurs disponibles pour le multi-select */
  availableFournisseurs: string[];
  /** Afficher les filtres avances ? */
  showAdvancedFilters?: boolean;
  /** Afficher le tri ? */
  showSort?: boolean;
  /** Placeholder du champ recherche */
  searchPlaceholder?: string;
  /** Classe CSS additionnelle */
  className?: string;
}

// ========================================
// COMPONENT
// ========================================

export function SearchAndFilters({
  filters,
  onFiltersChange,
  filterChips,
  onRemoveChip,
  hasActiveFilters,
  activeCount,
  onClearAll,
  resultCount,
  totalCount,
  availableFournisseurs,
  showAdvancedFilters = true,
  showSort = true,
  searchPlaceholder = 'Rechercher par fournisseur, n° facture...',
  className,
}: SearchAndFiltersProps) {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <Card className={className}>
      <CardContent className="py-4 space-y-3">
        {/* ---- Row 1: Search + Filter Toggle ---- */}
        <div className="flex gap-3">
          {/* Search input */}
          <div className="flex-1 min-w-0 relative">
            <Input
              type="text"
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder={searchPlaceholder}
              icon={<Search className="h-4 w-4" />}
              className="pr-8"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFiltersChange({ search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter toggle button */}
          {showAdvancedFilters && (
            <Button
              variant={showPanel ? 'default' : 'outline'}
              onClick={() => setShowPanel(!showPanel)}
              className={cn(
                'gap-2 shrink-0',
                showPanel && 'bg-primary text-primary-foreground'
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtres</span>
              {activeCount > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center',
                    'h-5 min-w-5 px-1 rounded-full',
                    'text-[10px] font-bold',
                    showPanel
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  {activeCount}
                </span>
              )}
            </Button>
          )}
        </div>

        {/* ---- Advanced Filters Panel (collapsible) ---- */}
        {showPanel && showAdvancedFilters && (
          <AdvancedFiltersPanel
            filters={filters}
            onFilterChange={onFiltersChange}
            availableFournisseurs={availableFournisseurs}
          />
        )}

        {/* ---- Active Filter Chips ---- */}
        {filterChips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              Filtres :
            </span>
            {filterChips.map((chip) => (
              <FilterChip
                key={chip.id}
                chip={chip}
                onRemove={() => onRemoveChip(chip)}
              />
            ))}
            <button
              type="button"
              onClick={onClearAll}
              className={cn(
                'text-xs text-muted-foreground hover:text-foreground',
                'underline underline-offset-2 ml-1',
                'transition-colors'
              )}
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* ---- Results Count + Sort ---- */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {resultCount}
            </span>
            {' '}
            facture{resultCount > 1 ? 's' : ''} trouvée{resultCount > 1 ? 's' : ''}
            {resultCount !== totalCount && (
              <span className="text-muted-foreground/70">
                {' '}sur {totalCount}
              </span>
            )}
          </div>

          {showSort && (
            <SortDropdown
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onChange={(sortBy, sortOrder) =>
                onFiltersChange({ sortBy, sortOrder })
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
