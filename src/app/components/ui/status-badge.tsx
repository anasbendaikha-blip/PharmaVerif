/**
 * PharmaVerif - StatusBadge Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Badge de statut colore :
 *  - Variantes semantiques : success, warning, error, info, neutral
 *  - Dot indicator optionnel
 *  - Pulse animation pour les etats actifs
 */

import * as React from 'react';
import { cn } from './utils';

// ========================================
// TYPES
// ========================================

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  /** Texte du badge */
  label: string;
  /** Variante de couleur */
  variant?: StatusVariant;
  /** Afficher le dot indicateur */
  dot?: boolean;
  /** Animation pulse sur le dot */
  pulse?: boolean;
  /** Taille */
  size?: 'sm' | 'md';
  /** Icone (remplace le dot) */
  icon?: React.ReactNode;
  /** Classe CSS additionnelle */
  className?: string;
}

// ========================================
// STYLES MAP
// ========================================

const variantStyles: Record<StatusVariant, {
  badge: string;
  dot: string;
}> = {
  success: {
    badge: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    dot: 'bg-green-500',
  },
  warning: {
    badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
    dot: 'bg-orange-500',
  },
  error: {
    badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    dot: 'bg-red-500',
  },
  info: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  neutral: {
    badge: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    dot: 'bg-gray-400',
  },
};

// ========================================
// COMPONENT
// ========================================

export function StatusBadge({
  label,
  variant = 'neutral',
  dot = true,
  pulse = false,
  size = 'sm',
  icon,
  className,
}: StatusBadgeProps) {
  const styles = variantStyles[variant];
  const isSmall = size === 'sm';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
        isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        styles.badge,
        className
      )}
    >
      {/* Icon or Dot */}
      {icon ? (
        <span className="shrink-0 [&>svg]:h-3 [&>svg]:w-3">{icon}</span>
      ) : dot ? (
        <span className="relative flex shrink-0">
          <span
            className={cn(
              'rounded-full',
              isSmall ? 'h-1.5 w-1.5' : 'h-2 w-2',
              styles.dot
            )}
          />
          {pulse && (
            <span
              className={cn(
                'absolute inset-0 rounded-full animate-ping opacity-75',
                isSmall ? 'h-1.5 w-1.5' : 'h-2 w-2',
                styles.dot
              )}
            />
          )}
        </span>
      ) : null}

      {/* Label */}
      <span>{label}</span>
    </span>
  );
}

// ========================================
// HELPERS — Mapping communs PharmaVerif
// ========================================

/**
 * Mapping statut facture → StatusBadge variant
 */
export function getFactureStatusVariant(
  statut: string
): StatusVariant {
  switch (statut) {
    case 'conforme':
    case 'validee':
      return 'success';
    case 'ecart_rfa':
    case 'anomalie':
      return 'error';
    case 'en_attente':
    case 'brouillon':
      return 'warning';
    case 'verifiee':
      return 'info';
    default:
      return 'neutral';
  }
}

/**
 * Mapping severite anomalie → StatusBadge variant
 */
export function getAnomalieVariant(
  severite: string
): StatusVariant {
  switch (severite) {
    case 'critical':
      return 'error';
    case 'opportunity':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'neutral';
  }
}
