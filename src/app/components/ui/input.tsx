/**
 * PharmaVerif - Input Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Champ de saisie reutilisable :
 *  - Style uniforme (tokens design system)
 *  - Variante erreur
 *  - Icone optionnelle (gauche)
 *  - Forward ref pour formulaires
 */

import * as React from 'react';

import { cn } from './utils';

// ========================================
// COMPONENT
// ========================================

function Input({
  className,
  type = 'text',
  error = false,
  icon,
  ...props
}: React.ComponentProps<'input'> & {
  /** Afficher le style erreur */
  error?: boolean;
  /** Icone affichee a gauche du champ */
  icon?: React.ReactNode;
}) {
  if (icon) {
    return (
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
          {icon}
        </div>
        <input
          data-slot="input"
          type={type}
          className={cn(
            'flex min-h-[44px] sm:min-h-0 h-9 sm:h-9 w-full rounded-lg border border-border bg-input-background pl-10 pr-3 py-2 text-base sm:text-sm text-foreground',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors',
            error && 'border-destructive focus:ring-destructive/40',
            className
          )}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        'flex min-h-[44px] sm:min-h-0 h-9 sm:h-9 w-full rounded-lg border border-border bg-input-background px-3 py-2 text-base sm:text-sm text-foreground',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors',
        error && 'border-destructive focus:ring-destructive/40',
        className
      )}
      {...props}
    />
  );
}

export { Input };
