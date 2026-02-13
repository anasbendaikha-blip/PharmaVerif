/**
 * PharmaVerif - DataTable Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Table de donnees reutilisable :
 *  - Colonnes configurables avec rendu custom
 *  - Tri par colonne
 *  - Etat vide + etat loading (skeleton)
 *  - Ligne cliquable
 *  - Responsive (scroll horizontal)
 */

import * as React from 'react';
import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from 'lucide-react';
import { cn } from './utils';

// ========================================
// TYPES
// ========================================

export interface DataTableColumn<T> {
  /** Cle unique de la colonne */
  key: string;
  /** Titre affiche dans le header */
  header: string;
  /** Fonction de rendu de la cellule */
  render?: (row: T, index: number) => React.ReactNode;
  /** Cle de l'objet pour le rendu par defaut */
  accessor?: keyof T;
  /** Activer le tri sur cette colonne */
  sortable?: boolean;
  /** Fonction de comparaison custom pour le tri */
  sortFn?: (a: T, b: T) => number;
  /** Alignement (default: left) */
  align?: 'left' | 'center' | 'right';
  /** Largeur fixe */
  width?: string;
  /** Classe CSS additionnelle pour la colonne */
  className?: string;
  /** Masquer sur mobile */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  /** Les donnees a afficher */
  data: T[];
  /** Definition des colonnes */
  columns: DataTableColumn<T>[];
  /** Cle unique pour chaque ligne (default: index) */
  rowKey?: (row: T, index: number) => string | number;
  /** Callback au clic sur une ligne */
  onRowClick?: (row: T, index: number) => void;
  /** Message quand la table est vide */
  emptyMessage?: string;
  /** Description sous le message vide */
  emptyDescription?: string;
  /** Icone pour l'etat vide */
  emptyIcon?: React.ReactNode;
  /** Etat de chargement */
  loading?: boolean;
  /** Nombre de lignes skeleton en chargement */
  loadingRows?: number;
  /** Classe CSS additionnelle */
  className?: string;
  /** Classe CSS pour les lignes */
  rowClassName?: string | ((row: T, index: number) => string);
  /** Tri par defaut */
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
}

// ========================================
// SORT HOOK
// ========================================

type SortDirection = 'asc' | 'desc' | null;

function useSortableData<T>(
  data: T[],
  columns: DataTableColumn<T>[],
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    defaultSort?.direction ?? null
  );

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    const column = columns.find((c) => c.key === sortKey);
    if (!column) return data;

    const sorted = [...data].sort((a, b) => {
      if (column.sortFn) {
        return column.sortFn(a, b);
      }

      const accessor = column.accessor ?? (column.key as keyof T);
      const aVal = a[accessor];
      const bVal = b[accessor];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }

      return String(aVal).localeCompare(String(bVal), 'fr', { numeric: true });
    });

    return sortDirection === 'desc' ? sorted.reverse() : sorted;
  }, [data, sortKey, sortDirection, columns]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return { sortedData, sortKey, sortDirection, handleSort };
}

// ========================================
// COMPONENT
// ========================================

export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  emptyMessage = 'Aucune donnee',
  emptyDescription,
  emptyIcon,
  loading = false,
  loadingRows = 5,
  className,
  rowClassName,
  defaultSort,
}: DataTableProps<T>) {
  const { sortedData, sortKey, sortDirection, handleSort } = useSortableData(
    data,
    columns,
    defaultSort
  );

  const getRowKey = (row: T, index: number) => {
    if (rowKey) return rowKey(row, index);
    return index;
  };

  const getRowClassName = (row: T, index: number) => {
    if (typeof rowClassName === 'function') return rowClassName(row, index);
    return rowClassName || '';
  };

  const alignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  // ====== LOADING STATE ======
  if (loading) {
    return (
      <div className={cn('border rounded-xl overflow-hidden bg-card', className)}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                      alignClass(col.align),
                      col.hideOnMobile && 'hidden sm:table-cell',
                      col.className
                    )}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={i} className="border-b last:border-0 animate-pulse">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3',
                        col.hideOnMobile && 'hidden sm:table-cell'
                      )}
                    >
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ====== EMPTY STATE ======
  if (data.length === 0) {
    return (
      <div className={cn('border rounded-xl overflow-hidden bg-card', className)}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                      alignClass(col.align),
                      col.hideOnMobile && 'hidden sm:table-cell',
                      col.className
                    )}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="p-3 rounded-full bg-muted/50 mb-3">
            {emptyIcon || <Inbox className="h-8 w-8 text-muted-foreground/50" />}
          </div>
          <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
          {emptyDescription && (
            <p className="mt-1 text-xs text-muted-foreground/70">{emptyDescription}</p>
          )}
        </div>
      </div>
    );
  }

  // ====== DATA TABLE ======
  return (
    <div className={cn('border rounded-xl overflow-hidden bg-card', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                      alignClass(col.align),
                      col.sortable && 'cursor-pointer select-none hover:text-foreground transition-colors',
                      col.hideOnMobile && 'hidden sm:table-cell',
                      col.className
                    )}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        <span className="inline-flex">
                          {isSorted && sortDirection === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : isSorted && sortDirection === 'desc' ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className={cn(
                  'border-b last:border-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-muted/30',
                  getRowClassName(row, index)
                )}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              >
                {columns.map((col) => {
                  const cellContent = col.render
                    ? col.render(row, index)
                    : col.accessor
                      ? String(row[col.accessor] ?? '')
                      : '';

                  return (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-sm',
                        alignClass(col.align),
                        col.hideOnMobile && 'hidden sm:table-cell',
                        col.className
                      )}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
