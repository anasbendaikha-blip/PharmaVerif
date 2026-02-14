/**
 * PharmaVerif - AdvancedFiltersPanel Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Panneau de filtres avances (collapsible) :
 *  - Statut : chips radio (all / conforme / anomalie / critique)
 *  - Fournisseurs : multi-select checkboxes
 *  - Montant : range min/max
 *  - Periode : date debut/fin + raccourcis rapides
 *  - Responsive : 1 col mobile, 2 cols desktop
 *  - Dark mode support
 */

import { Calendar, Euro } from 'lucide-react';
import { Input } from '../ui/input';
import { cn } from '../ui/utils';
import type { InvoiceFilters, StatusFilter } from '../../types/filters';
import { STATUS_OPTIONS, DATE_PRESETS } from '../../types/filters';

// ========================================
// TYPES
// ========================================

interface AdvancedFiltersPanelProps {
  filters: InvoiceFilters;
  onFilterChange: (partial: Partial<InvoiceFilters>) => void;
  /** Liste des noms de fournisseurs disponibles */
  availableFournisseurs: string[];
  /** Classe CSS additionnelle */
  className?: string;
}

// ========================================
// COMPONENT
// ========================================

export function AdvancedFiltersPanel({
  filters,
  onFilterChange,
  availableFournisseurs,
  className,
}: AdvancedFiltersPanelProps) {
  return (
    <div
      className={cn(
        'bg-muted/30 border border-border rounded-lg',
        'p-4 sm:p-5',
        'space-y-5',
        'animate-in slide-in-from-top-2 duration-200',
        className
      )}
    >
      {/* ---- Status Filter ---- */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Statut
        </label>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = filters.status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onFilterChange({ status: opt.value })}
                className={cn(
                  'px-3.5 py-2 rounded-lg',
                  'border-2 font-medium text-sm',
                  'transition-colors min-h-[40px]',
                  isActive
                    ? opt.color === 'green'
                      ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
                      : opt.color === 'orange'
                      ? 'bg-orange-50 border-orange-300 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-400'
                      : opt.color === 'red'
                      ? 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
                      : 'bg-primary/10 border-primary text-primary'
                    : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Fournisseurs Multi-Select ---- */}
      {availableFournisseurs.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Fournisseurs
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {availableFournisseurs.map((fournisseur) => {
              const isChecked = filters.fournisseurs.includes(fournisseur);
              return (
                <label
                  key={fournisseur}
                  className={cn(
                    'flex items-center gap-2',
                    'px-3 py-2 rounded-lg',
                    'border cursor-pointer',
                    'transition-colors',
                    isChecked
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...filters.fournisseurs, fournisseur]
                        : filters.fournisseurs.filter((f) => f !== fournisseur);
                      onFilterChange({ fournisseurs: updated });
                    }}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring accent-primary cursor-pointer"
                  />
                  <span className="text-sm text-foreground truncate">{fournisseur}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Montant Range ---- */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Montant HT
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Minimum</label>
            <Input
              type="number"
              min="0"
              step="10"
              value={filters.montantMin ?? ''}
              onChange={(e) =>
                onFilterChange({
                  montantMin: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="0 €"
              icon={<Euro className="h-4 w-4" />}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Maximum</label>
            <Input
              type="number"
              min="0"
              step="10"
              value={filters.montantMax ?? ''}
              onChange={(e) =>
                onFilterChange({
                  montantMax: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="10 000 €"
              icon={<Euro className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>

      {/* ---- Date Range ---- */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Période
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Du</label>
            <Input
              type="date"
              value={filters.dateDebut ?? ''}
              onChange={(e) =>
                onFilterChange({ dateDebut: e.target.value || undefined })
              }
              icon={<Calendar className="h-4 w-4" />}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Au</label>
            <Input
              type="date"
              value={filters.dateFin ?? ''}
              onChange={(e) =>
                onFilterChange({ dateFin: e.target.value || undefined })
              }
              icon={<Calendar className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* Quick date shortcuts */}
        <div className="flex gap-2 mt-2.5 flex-wrap">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                const range = preset.getRange();
                onFilterChange(range);
              }}
              className={cn(
                'px-3 py-1.5 text-xs',
                'bg-card border border-border rounded-md',
                'text-muted-foreground hover:text-foreground hover:bg-muted',
                'transition-colors'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
