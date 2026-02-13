/**
 * PharmaVerif - StatCard Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Carte de statistique reutilisable :
 *  - Valeur principale + label
 *  - Icone coloree
 *  - Tendance (hausse/baisse/neutre)
 *  - Variantes de couleur
 *  - Loading skeleton
 */

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from './utils';

// ========================================
// TYPES
// ========================================

type StatCardVariant = 'default' | 'blue' | 'green' | 'orange' | 'red' | 'purple';
type TrendDirection = 'up' | 'down' | 'neutral';

interface StatCardProps {
  /** Label de la statistique */
  label: string;
  /** Valeur principale */
  value: string | number;
  /** Icone (composant lucide-react) */
  icon?: React.ReactNode;
  /** Texte de tendance (ex: "+12% ce mois") */
  trend?: string;
  /** Direction de la tendance */
  trendDirection?: TrendDirection;
  /** Variante de couleur */
  variant?: StatCardVariant;
  /** Sous-texte additionnel */
  subtitle?: string;
  /** Classe CSS additionnelle */
  className?: string;
  /** Etat de chargement */
  loading?: boolean;
  /** Action au clic */
  onClick?: () => void;
}

// ========================================
// STYLES MAP
// ========================================

const variantStyles: Record<StatCardVariant, {
  iconBg: string;
  iconColor: string;
  trendUp: string;
  trendDown: string;
}> = {
  default: {
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-600 dark:text-gray-400',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  blue: {
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  green: {
    iconBg: 'bg-green-50 dark:bg-green-900/20',
    iconColor: 'text-green-600 dark:text-green-400',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  orange: {
    iconBg: 'bg-orange-50 dark:bg-orange-900/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  red: {
    iconBg: 'bg-red-50 dark:bg-red-900/20',
    iconColor: 'text-red-600 dark:text-red-400',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  purple: {
    iconBg: 'bg-purple-50 dark:bg-purple-900/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
};

// ========================================
// COMPONENT
// ========================================

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendDirection = 'neutral',
  variant = 'default',
  subtitle,
  className,
  loading = false,
  onClick,
}: StatCardProps) {
  const styles = variantStyles[variant];

  const TrendIcon =
    trendDirection === 'up'
      ? TrendingUp
      : trendDirection === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    trendDirection === 'up'
      ? styles.trendUp
      : trendDirection === 'down'
        ? styles.trendDown
        : 'text-muted-foreground';

  const Wrapper = onClick ? 'button' : 'div';

  if (loading) {
    return (
      <div
        className={cn(
          'bg-card text-card-foreground rounded-xl border p-5 animate-pulse',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <Wrapper
      className={cn(
        'bg-card text-card-foreground rounded-xl border p-5 text-left w-full',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 active:scale-[0.98]',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Value + Label */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{value}</p>

          {/* Trend */}
          {trend && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trendColor)}>
              <TrendIcon className="h-3.5 w-3.5" />
              <span>{trend}</span>
            </div>
          )}

          {/* Subtitle */}
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className={cn('shrink-0 p-2.5 rounded-lg', styles.iconBg, styles.iconColor)}>
            {icon}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
