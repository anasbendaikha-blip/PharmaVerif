/**
 * PharmaVerif - PageHeader Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * En-tete de page reutilisable :
 *  - Titre + description
 *  - Zone d'actions (boutons)
 *  - Icone optionnelle
 *  - Variante avec/sans bordure
 */

import * as React from 'react';
import { cn } from './utils';

// ========================================
// TYPES
// ========================================

interface PageHeaderProps {
  /** Titre de la page */
  title: string;
  /** Description sous le titre */
  description?: string;
  /** Icone affichee a gauche du titre */
  icon?: React.ReactNode;
  /** Boutons / actions a droite */
  actions?: React.ReactNode;
  /** Contenu supplementaire sous le header (ex: filtres, tabs) */
  children?: React.ReactNode;
  /** Classe CSS additionnelle */
  className?: string;
  /** Afficher la bordure basse (default: true) */
  bordered?: boolean;
}

// ========================================
// COMPONENT
// ========================================

export function PageHeader({
  title,
  description,
  icon,
  actions,
  children,
  className,
  bordered = true,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6',
        bordered && 'pb-6 border-b border-gray-200 dark:border-gray-700/50',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Icon + Title + Description */}
        <div className="flex items-start gap-3">
          {icon && (
            <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Children (filtres, tabs, etc.) */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
