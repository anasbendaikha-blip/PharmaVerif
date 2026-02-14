/**
 * PharmaVerif - EmptyState Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Composant d'etat vide reutilisable :
 *  - Icone centrée
 *  - Titre + description
 *  - Bouton d'action (CTA)
 *  - Variantes : default, compact
 */

import * as React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './button';
import { cn } from './utils';

// ========================================
// TYPES
// ========================================

interface EmptyStateProps {
  /** Icone (defaut : Inbox) */
  icon?: React.ReactNode;
  /** Titre principal */
  title: string;
  /** Description sous le titre */
  description?: string;
  /** Label du bouton d'action */
  actionLabel?: string;
  /** Callback du bouton d'action */
  onAction?: () => void;
  /** Variante d'action (defaut : default) */
  actionVariant?: 'default' | 'outline' | 'secondary';
  /** Icone du bouton d'action */
  actionIcon?: React.ReactNode;
  /** Compact mode (moins de padding) */
  compact?: boolean;
  /** Classe CSS additionnelle */
  className?: string;
  /** Contenu additionnel sous la description */
  children?: React.ReactNode;
}

// ========================================
// COMPONENT
// ========================================

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionVariant = 'default',
  actionIcon,
  compact = false,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'rounded-full bg-muted/50 flex items-center justify-center mb-4',
          compact ? 'p-2.5' : 'p-3.5'
        )}
      >
        {icon || (
          <Inbox
            className={cn(
              'text-muted-foreground/50',
              compact ? 'h-6 w-6' : 'h-8 w-8'
            )}
          />
        )}
      </div>

      {/* Title */}
      <h3
        className={cn(
          'font-medium text-foreground',
          compact ? 'text-sm' : 'text-base'
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={cn(
            'text-muted-foreground max-w-md mt-1.5',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {description}
        </p>
      )}

      {/* Children */}
      {children && <div className="mt-4">{children}</div>}

      {/* Action button */}
      {actionLabel && onAction && (
        <Button
          variant={actionVariant}
          size={compact ? 'sm' : 'default'}
          onClick={onAction}
          className="mt-4"
        >
          {actionIcon}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
