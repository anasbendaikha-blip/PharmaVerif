/**
 * PharmaVerif - Skeleton Loaders
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Composants skeleton reutilisables pour les etats de chargement :
 *  - Skeleton : brique de base (div animee)
 *  - SkeletonCard : carte KPI
 *  - SkeletonTable : table avec N lignes
 *  - SkeletonFilters : barre de filtres
 *  - SkeletonPageHeader : header de page
 *
 * Principe : skeleton > spinner pour une meilleure perception de vitesse.
 */

import { cn } from './utils';

// ========================================
// BASE SKELETON
// ========================================

/**
 * Brique de base — un rectangle anime avec pulse.
 * Utiliser directement pour des placeholders custom.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)}
      {...props}
    />
  );
}

// ========================================
// SKELETON CARD (KPI)
// ========================================

/**
 * Skeleton pour les StatCards (4 KPIs en haut des pages).
 * Reproduit la structure : label + value + icon.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground rounded-xl border p-5 animate-pulse',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

// ========================================
// SKELETON TABLE
// ========================================

/**
 * Skeleton pour les DataTable.
 * Reproduit : header row + N body rows avec barres grises.
 */
export function SkeletonTable({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('border rounded-xl overflow-hidden bg-card', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b last:border-0 animate-pulse">
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={colIdx} className="px-4 py-3">
                    <Skeleton
                      className={cn(
                        'h-4',
                        // Varier les largeurs pour un aspect plus naturel
                        colIdx === 0 ? 'w-20' :
                        colIdx === 1 ? 'w-28' :
                        colIdx === columns - 1 ? 'w-16' :
                        'w-3/4'
                      )}
                    />
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

// ========================================
// SKELETON CHART
// ========================================

/**
 * Skeleton pour les graphiques (barres animees simulant un chart).
 * Utilisable pour PieChart, BarChart ou LineChart en chargement.
 */
export function SkeletonChart({
  height = 280,
  variant = 'bar',
  className,
}: {
  height?: number;
  variant?: 'bar' | 'pie' | 'line';
  className?: string;
}) {
  if (variant === 'pie') {
    return (
      <div
        className={cn('flex items-center justify-center animate-pulse', className)}
        style={{ height }}
      >
        <div className="relative">
          <Skeleton className="h-40 w-40 rounded-full" />
          <div className="absolute inset-4 rounded-full bg-card" />
        </div>
      </div>
    );
  }

  if (variant === 'line') {
    return (
      <div
        className={cn('flex flex-col justify-end gap-2 animate-pulse px-4', className)}
        style={{ height }}
      >
        {/* Fake grid lines */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-8 shrink-0" />
            <div className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700" />
          </div>
        ))}
        {/* X axis labels */}
        <div className="flex justify-between pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-10" />
          ))}
        </div>
      </div>
    );
  }

  // Default: bar chart skeleton
  const barHeights = [60, 85, 45, 70, 90, 55, 75];
  return (
    <div
      className={cn('flex items-end justify-center gap-3 animate-pulse px-8 pb-8', className)}
      style={{ height }}
    >
      {barHeights.map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <Skeleton
            className="w-full rounded-t-md"
            style={{ height: `${h}%` }}
          />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

// ========================================
// SKELETON FILTERS
// ========================================

/**
 * Skeleton pour la barre de filtres (recherche + select + dates + chips).
 */
export function SkeletonFilters({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card rounded-xl border p-4 animate-pulse', className)}>
      <div className="flex flex-col gap-4">
        {/* Row 1: Search + Select + Dates */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="flex-1 h-9 rounded-lg" />
          <Skeleton className="w-full sm:w-48 h-9 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="w-full sm:w-36 h-9 rounded-lg" />
            <Skeleton className="w-full sm:w-36 h-9 rounded-lg" />
          </div>
        </div>
        {/* Row 2: Status chips */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================================
// SKELETON PAGE HEADER
// ========================================

/**
 * Skeleton pour le PageHeader (titre + description + actions).
 */
export function SkeletonPageHeader({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col sm:flex-row justify-between gap-4 animate-pulse', className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-9 w-36 rounded-lg" />
    </div>
  );
}
