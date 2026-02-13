/**
 * PharmaVerif - MoneyDisplay Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Affichage formate de montants en euros :
 *  - Formatage automatique (separateur milliers, decimales)
 *  - Variantes couleur (positif/negatif/neutre)
 *  - Tailles configurables
 *  - Symbole EUR
 */

import * as React from 'react';
import { cn } from './utils';

// ========================================
// TYPES
// ========================================

type MoneySize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type MoneyVariant = 'default' | 'positive' | 'negative' | 'muted';

interface MoneyDisplayProps {
  /** Montant en euros */
  value: number | null | undefined;
  /** Nombre de decimales (default: 2) */
  decimals?: number;
  /** Taille du texte */
  size?: MoneySize;
  /** Variante de couleur */
  variant?: MoneyVariant;
  /** Colorer automatiquement selon le signe (+/-) */
  colorBySign?: boolean;
  /** Afficher le signe + pour les valeurs positives */
  showPlusSign?: boolean;
  /** Afficher le symbole EUR (default: true) */
  showCurrency?: boolean;
  /** Texte quand la valeur est null/undefined */
  placeholder?: string;
  /** Font tabular-nums pour alignement (default: true) */
  tabular?: boolean;
  /** Gras (default: false) */
  bold?: boolean;
  /** Classe CSS additionnelle */
  className?: string;
}

// ========================================
// FORMAT HELPER
// ========================================

function formatEuros(
  value: number,
  decimals: number = 2,
  showPlusSign: boolean = false
): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  const sign = value < 0 ? '-' : value > 0 && showPlusSign ? '+' : '';
  return `${sign}${formatted}`;
}

// ========================================
// STYLES MAP
// ========================================

const sizeStyles: Record<MoneySize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
};

const variantStyles: Record<MoneyVariant, string> = {
  default: 'text-foreground',
  positive: 'text-green-600 dark:text-green-400',
  negative: 'text-red-600 dark:text-red-400',
  muted: 'text-muted-foreground',
};

// ========================================
// COMPONENT
// ========================================

export function MoneyDisplay({
  value,
  decimals = 2,
  size = 'sm',
  variant = 'default',
  colorBySign = false,
  showPlusSign = false,
  showCurrency = true,
  placeholder = '—',
  tabular = true,
  bold = false,
  className,
}: MoneyDisplayProps) {
  // Handle null/undefined
  if (value == null || isNaN(value)) {
    return (
      <span
        className={cn(
          sizeStyles[size],
          'text-muted-foreground/50',
          tabular && 'tabular-nums',
          className
        )}
      >
        {placeholder}
      </span>
    );
  }

  // Auto-color by sign
  let resolvedVariant = variant;
  if (colorBySign) {
    if (value > 0) resolvedVariant = 'positive';
    else if (value < 0) resolvedVariant = 'negative';
    else resolvedVariant = 'muted';
  }

  const formatted = formatEuros(value, decimals, showPlusSign);

  return (
    <span
      className={cn(
        sizeStyles[size],
        variantStyles[resolvedVariant],
        tabular && 'tabular-nums',
        bold && 'font-bold',
        className
      )}
    >
      {formatted}
      {showCurrency && (
        <span className="ml-0.5 text-[0.85em] opacity-70">&euro;</span>
      )}
    </span>
  );
}

// ========================================
// SHORTCUT COMPONENTS
// ========================================

/**
 * Affichage montant avec coloration automatique par signe
 */
export function MoneyDiff(
  props: Omit<MoneyDisplayProps, 'colorBySign' | 'showPlusSign'>
) {
  return <MoneyDisplay {...props} colorBySign showPlusSign />;
}

/**
 * Affichage montant en gras (pour totaux)
 */
export function MoneyTotal(
  props: Omit<MoneyDisplayProps, 'bold' | 'size'>
) {
  return <MoneyDisplay {...props} bold size="lg" />;
}
